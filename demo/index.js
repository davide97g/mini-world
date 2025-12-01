/**
 * Author: Michael Hadley, mikewesthad.com
 * Asset Credits:
 *  - Tuxemon, https://github.com/Tuxemon/Tuxemon
 */

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);
let cursors;
let player;
let showDebug = false;
let weatherWidget = null;
let weatherData = null;
let gameMap = null;

// Menu and Dialog state
const MENU_ENTRIES = [
  "Pokédex",
  "Pokémon",
  "Bag",
  "Pokégear",
  "Red",
  "Save",
  "Options",
  "Debug",
  "Exit",
];
let isMenuOpen = false;
let selectedMenuIndex = 0;
let menuContainer = null;
let menuTexts = [];
let dialogContainer = null;
let dialogText = null;
let dialogIndicator = null;
let isDialogVisible = false;
let dialogLines = [];
let currentDialogLineIndex = 0;
let currentDialogCharIndex = 0;
let dialogTypingTimer = null;
let dialogScene = null;

// Flower interaction state
let flowers = [];
let isNearFlower = false;
let chatIconContainer = null;
let chatDialogueContainer = null;
let chatMessages = [];
let chatInputText = null;
let chatInputField = null;
let isChatOpen = false;
let chatMessageContainer = null;
let chatWidth = 400;
const FLOWER_PROXIMITY_DISTANCE = 80; // pixels

// Configure flower tile GIDs here if you know them
//
// HOW TO FIND FLOWER TILE IDs:
//
// Method 1: Use the in-game debug tool (EASIEST)
//   1. Run the game
//   2. Press 'I' key to enable tile info mode
//   3. Click on any flower tile you see on the map
//   4. Check the browser console - it will show the Tile GID
//   5. Add that GID number to this array
//
// Method 2: Using Tiled Editor
//   1. Open the tilemap in Tiled editor
//   2. Select a flower tile
//   3. Look at the bottom status bar - it shows the tile ID
//   4. The GID = tile ID + firstgid (usually firstgid is 1, so GID = tile ID + 1)
//   5. Add the GID to this array
//
// Method 3: Inspect the tilemap JSON
//   1. Open assets/tilemaps/tuxemon-town.json
//   2. Find flower tiles in the layer data arrays
//   3. The number in the array is the GID
//   4. Add those GIDs to this array
//
// Note: GID (Global ID) = tile index in tileset + firstgid
//       If firstgid is 1, then GID = tile index + 1
const FLOWER_TILE_GIDS = new Set([
  // Add specific tile GIDs that represent flowers
  // Example: [120, 121, 122] if those are flower tile GIDs
  // Leave empty to use property-based detection or heuristics
  284,
]);

function preload() {
  this.load.image(
    "tiles",
    "../assets/tilesets/tuxmon-sample-32px-extruded.png"
  );
  this.load.tilemapTiledJSON(
    "map",
    "../assets/tilemaps/tuxemon-town-expanded.json"
  );

  // An atlas is a way to pack multiple images together into one texture. I'm using it to load all
  // the player animations (walking left, walking right, etc.) in one image. For more info see:
  //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
  // If you don't use an atlas, you can do the same thing with a spritesheet, see:
  //  https://labs.phaser.io/view.html?src=src/animation/single%20sprite%20sheet.js
  this.load.atlas(
    "atlas",
    "../assets/atlas/atlas.png",
    "../assets/atlas/atlas.json"
  );

  // Create flower texture programmatically (pixel art style)
  createFlowerTexture.call(this);
}

function create() {
  const map = this.make.tilemap({ key: "map" });
  gameMap = map; // Store map reference for flower detection

  // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
  // Phaser's cache (i.e. the name you used in preload)
  const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
  const worldLayer = map.createLayer("World", tileset, 0, 0);
  const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);

  worldLayer.setCollisionByProperty({ collides: true });

  // By default, everything gets depth sorted on the screen in the order we created things. Here, we
  // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
  // Higher depths will sit on top of lower depth objects.
  aboveLayer.setDepth(10);

  // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
  // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
  const spawnPoint = map.findObject(
    "Objects",
    (obj) => obj.name === "Spawn Point"
  );

  // Create a sprite with physics enabled via the physics system. The image used for the sprite has
  // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
  player = this.physics.add
    .sprite(spawnPoint.x, spawnPoint.y, "atlas", "misa-front")
    .setSize(30, 40)
    .setOffset(0, 24);

  // Watch the player and worldLayer for collisions, for the duration of the scene:
  this.physics.add.collider(player, worldLayer);

  // Create the player's walking animations from the texture atlas. These are stored in the global
  // animation manager so any sprite can access them.
  const anims = this.anims;
  anims.create({
    key: "misa-left-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-left-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-right-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-right-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-front-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-front-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-back-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-back-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });

  const camera = this.cameras.main;
  camera.startFollow(player);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  cursors = this.input.keyboard.createCursorKeys();

  // Initialize menu and dialog
  initMenu.call(this);
  initDialog.call(this);

  // Initialize weather widget
  initWeatherWidget.call(this);

  // Create flowers on the map
  createFlowers.call(this);

  // Initialize flower interaction UI
  initFlowerInteraction.call(this);

  // Debug: Click on tiles to see their GID (for finding flower tile IDs)
  // Press 'I' key to toggle tile info mode
  let tileInfoMode = false;
  this.input.keyboard.on("keydown-I", () => {
    tileInfoMode = !tileInfoMode;
    console.log(
      `Tile info mode: ${
        tileInfoMode ? "ON" : "OFF"
      }. Click on tiles to see their GID.`
    );
  });

  this.input.on("pointerdown", (pointer) => {
    if (!tileInfoMode || !gameMap) return;

    // Convert screen coordinates to world coordinates
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Check all layers for tiles at this position
    const layersToCheck = ["Below Player", "World", "Above Player"];
    layersToCheck.forEach((layerName) => {
      const layer = gameMap.getLayer(layerName);
      if (!layer) return;

      const tile = layer.getTileAtWorldXY(worldX, worldY);
      if (tile && tile.index !== null && tile.index !== -1) {
        const firstGID = gameMap.tilesets[0]?.firstgid || 1;
        const tileGID = tile.index + firstGID;
        const tileX = Math.floor(worldX / gameMap.tileWidth);
        const tileY = Math.floor(worldY / gameMap.tileHeight);

        console.log(`\n=== Tile Info ===`);
        console.log(`Layer: ${layerName}`);
        console.log(`Position: (${tileX}, ${tileY})`);
        console.log(`Tile Index: ${tile.index}`);
        console.log(`Tile GID (Global ID): ${tileGID}`);
        console.log(`Collides: ${tile.collides || false}`);
        if (tile.properties) {
          console.log(`Properties:`, tile.properties);
        }
        console.log(
          `\nTo add this as a flower, add ${tileGID} to FLOWER_TILE_GIDS array`
        );
        console.log(
          `Current FLOWER_TILE_GIDS: [${Array.from(FLOWER_TILE_GIDS).join(
            ", "
          )}]`
        );
      }
    });
  });

  // Debug graphics
  this.input.keyboard.once("keydown-D", (event) => {
    // Turn on physics debugging to show player's hitbox
    this.physics.world.createDebugGraphic();

    // Create worldLayer collision graphic above the player, but below the help text
    const graphics = this.add.graphics().setAlpha(0.75).setDepth(20);
    worldLayer.renderDebug(graphics, {
      tileColor: null, // Color of non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
      faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Color of colliding face edges
    });
  });
}

function update(time, delta) {
  // Don't update player movement if menu or dialog is open (but allow movement when chat is open)
  if (isMenuOpen || isDialogVisible) {
    player.body.setVelocity(0);
    player.anims.stop();
    return;
  }

  const speed = 175;
  const prevVelocity = player.body.velocity.clone();

  // Stop any previous movement from the last frame
  player.body.setVelocity(0);

  // Horizontal movement
  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
  }

  // Vertical movement
  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }

  // Normalize and scale the velocity so that player can't move faster along a diagonal
  player.body.velocity.normalize().scale(speed);

  // Update the animation last and give left/right animations precedence over up/down animations
  if (cursors.left.isDown) {
    player.anims.play("misa-left-walk", true);
  } else if (cursors.right.isDown) {
    player.anims.play("misa-right-walk", true);
  } else if (cursors.up.isDown) {
    player.anims.play("misa-back-walk", true);
  } else if (cursors.down.isDown) {
    player.anims.play("misa-front-walk", true);
  } else {
    player.anims.stop();

    // If we were moving, pick and idle frame to use
    if (prevVelocity.x < 0) player.setTexture("atlas", "misa-left");
    else if (prevVelocity.x > 0) player.setTexture("atlas", "misa-right");
    else if (prevVelocity.y < 0) player.setTexture("atlas", "misa-back");
    else if (prevVelocity.y > 0) player.setTexture("atlas", "misa-front");
  }

  // Check proximity to flowers
  checkFlowerProximity.call(this);
}

// Weather widget functions
const WEATHER_CODE_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const getWeatherIcon = (weathercode) => {
  if (weathercode === 0) return "☀️";
  if (weathercode <= 3) return "⛅";
  if (weathercode <= 48) return "🌫️";
  if (weathercode <= 67) return "🌧️";
  if (weathercode <= 86) return "❄️";
  return "⛈️";
};

const formatTime = (timeString) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fetchWeatherData = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await response.json();
    return {
      ...data.current_weather,
      daily: data.daily,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};

const initWeatherWidget = function () {
  // Get user location
  if (!navigator.geolocation) {
    createWeatherWidget.call(this, null, "Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const weather = await fetchWeatherData(lat, lon);
      createWeatherWidget.call(this, weather, null);
    },
    (err) => {
      let errorMessage = "Unable to get location";
      if (err.code === 1) {
        errorMessage = "Location access denied";
      } else if (err.code === 2) {
        errorMessage = "Location unavailable";
      } else if (err.code === 3) {
        errorMessage = "Location request timed out";
      }
      createWeatherWidget.call(this, null, errorMessage);
    }
  );
};

const createWeatherWidget = function (weather, error) {
  const width = this.cameras.main.width;
  const padding = 16;
  const widgetWidth = 280;
  const widgetHeight = 140;
  const x = width - widgetWidth - padding;
  const y = padding;

  // Create container for the widget
  const container = this.add.container(x, y);
  container.setScrollFactor(0);
  container.setDepth(30);

  // Create background
  const bg = this.add.rectangle(
    widgetWidth / 2,
    widgetHeight / 2,
    widgetWidth,
    widgetHeight,
    0xffffff,
    0.9
  );
  bg.setStrokeStyle(2, 0x000000, 0.3);
  container.add(bg);

  if (error || !weather) {
    // Error state
    const errorText = this.add.text(
      widgetWidth / 2,
      widgetHeight / 2,
      error || "Unable to fetch weather",
      {
        font: "14px monospace",
        fill: "#ff0000",
        align: "center",
        wordWrap: { width: widgetWidth - 20 },
      }
    );
    errorText.setOrigin(0.5);
    container.add(errorText);
    weatherWidget = container;
    return;
  }

  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || "Unknown";
  const weatherIcon = getWeatherIcon(weather.weathercode);

  // Weather icon and main info
  const iconText = this.add.text(20, 20, weatherIcon, {
    font: "32px monospace",
    fill: "#000000",
  });
  container.add(iconText);

  const tempText = this.add.text(
    60,
    15,
    `${weather.temperature.toFixed(1)}°C`,
    {
      font: "bold 20px monospace",
      fill: "#000000",
    }
  );
  container.add(tempText);

  const descText = this.add.text(60, 40, weatherDescription, {
    font: "12px monospace",
    fill: "#333333",
    wordWrap: { width: widgetWidth - 80 },
  });
  container.add(descText);

  // Additional info
  const windText = this.add.text(
    20,
    80,
    `Wind: ${weather.windspeed.toFixed(1)} km/h`,
    {
      font: "12px monospace",
      fill: "#666666",
    }
  );
  container.add(windText);

  const timeText = this.add.text(
    20,
    100,
    `Updated: ${formatTime(weather.time)}`,
    {
      font: "11px monospace",
      fill: "#666666",
    }
  );
  container.add(timeText);

  weatherWidget = container;
  weatherData = weather;

  // Update weather every 5 minutes
  setInterval(async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const newWeather = await fetchWeatherData(lat, lon);
          if (newWeather && weatherWidget) {
            updateWeatherWidget.call(this, newWeather);
          }
        },
        () => {
          // Silently fail on update
        }
      );
    }
  }, 5 * 60 * 1000); // 5 minutes
};

const updateWeatherWidget = function (weather) {
  if (!weatherWidget || !weather) return;

  weatherData = weather;
  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || "Unknown";
  const weatherIcon = getWeatherIcon(weather.weathercode);

  // Clear existing text elements (keep background)
  const children = weatherWidget.list.slice(1); // Skip background
  children.forEach((child) => {
    if (child.type === "Text") {
      child.destroy();
    }
  });

  // Recreate text elements with relative positioning
  const iconText = this.add.text(20, 20, weatherIcon, {
    font: "32px monospace",
    fill: "#000000",
  });
  weatherWidget.add(iconText);

  const tempText = this.add.text(
    60,
    15,
    `${weather.temperature.toFixed(1)}°C`,
    {
      font: "bold 20px monospace",
      fill: "#000000",
    }
  );
  weatherWidget.add(tempText);

  const descText = this.add.text(60, 40, weatherDescription, {
    font: "12px monospace",
    fill: "#333333",
    wordWrap: { width: 200 },
  });
  weatherWidget.add(descText);

  const windText = this.add.text(
    20,
    80,
    `Wind: ${weather.windspeed.toFixed(1)} km/h`,
    {
      font: "12px monospace",
      fill: "#666666",
    }
  );
  weatherWidget.add(windText);

  const timeText = this.add.text(
    20,
    100,
    `Updated: ${formatTime(weather.time)}`,
    {
      font: "11px monospace",
      fill: "#666666",
    }
  );
  weatherWidget.add(timeText);
};

// Menu functions
const initMenu = function () {
  const width = this.cameras.main.width;
  const height = this.cameras.main.height;
  const menuWidth = 192;
  const menuX = width - menuWidth - 16;
  const menuY = 16;

  // Create container for menu
  menuContainer = this.add.container(menuX, menuY);
  menuContainer.setScrollFactor(0);
  menuContainer.setDepth(50);
  menuContainer.setVisible(false);

  // Create background
  const bg = this.add.rectangle(
    menuWidth / 2,
    0,
    menuWidth,
    height - 32,
    0xcccccc,
    0.85
  );
  bg.setStrokeStyle(2, 0x808080);
  menuContainer.add(bg);

  // Create menu entries
  menuTexts = [];
  const entryHeight = 24;
  const padding = 12;
  const startY = padding;

  MENU_ENTRIES.forEach((entry, index) => {
    const y = startY + index * entryHeight;
    const entryText = this.add.text(padding, y, entry, {
      font: "16px monospace",
      fill: "#ffffff",
      align: "left",
    });
    entryText.setOrigin(0, 0);
    entryText.setPadding(4, 4, 4, 4);
    menuContainer.add(entryText);
    menuTexts.push(entryText);
  });

  // Setup keyboard handlers
  const spaceKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SPACE
  );
  const enterKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.ENTER
  );

  // Spacebar to toggle menu or advance dialog
  spaceKey.on("down", () => {
    if (isDialogVisible) {
      // Advance dialog (same as Enter)
      handleDialogAdvance.call(this);
    } else {
      // Toggle menu
      toggleMenu.call(this);
    }
  });

  // Arrow keys for menu navigation
  this.input.keyboard.on("keydown-UP", () => {
    if (isMenuOpen && !isDialogVisible) {
      selectedMenuIndex =
        selectedMenuIndex > 0 ? selectedMenuIndex - 1 : MENU_ENTRIES.length - 1;
      updateMenuSelection.call(this);
    }
  });

  this.input.keyboard.on("keydown-DOWN", () => {
    if (isMenuOpen && !isDialogVisible) {
      selectedMenuIndex =
        selectedMenuIndex < MENU_ENTRIES.length - 1 ? selectedMenuIndex + 1 : 0;
      updateMenuSelection.call(this);
    }
  });

  // Enter to select menu entry or advance dialog
  enterKey.on("down", () => {
    if (isDialogVisible) {
      handleDialogAdvance.call(this);
    } else if (isMenuOpen) {
      const selectedEntry = MENU_ENTRIES[selectedMenuIndex];
      handleMenuSelect.call(this, selectedEntry);
    }
  });
};

const toggleMenu = function () {
  isMenuOpen = !isMenuOpen;
  menuContainer.setVisible(isMenuOpen);

  if (isMenuOpen) {
    selectedMenuIndex = 0;
    updateMenuSelection.call(this);
  }
};

const updateMenuSelection = function () {
  menuTexts.forEach((text, index) => {
    const entryName = MENU_ENTRIES[index];
    if (index === selectedMenuIndex) {
      text.setFill("#ffffff");
      text.setBackgroundColor("#666666");
      // Add arrow indicator
      if (!text.text.startsWith("►")) {
        text.setText("► " + entryName);
      }
    } else {
      text.setFill("#ffffff");
      text.setBackgroundColor(null);
      // Remove arrow indicator
      if (text.text.startsWith("►")) {
        text.setText(entryName);
      }
    }
  });
};

const handleMenuSelect = function (entry) {
  isMenuOpen = false;
  menuContainer.setVisible(false);

  const dialogTexts = {
    Pokédex:
      "The Pokédex is a high-tech encyclopedia that records data on Pokémon. It automatically records data on any Pokémon you encounter or catch.",
    Pokémon: "You have no Pokémon with you right now.",
    Bag: "Your bag is empty. You should collect some items during your journey.",
    Pokégear:
      "The Pokégear is a useful device that shows the time and map. It also allows you to make calls to other trainers.",
    Red: "This is your trainer card. It shows your name, badges, and other important information about your journey.",
    Save: "Would you like to save your progress? Your game will be saved to the current slot.",
    Options:
      "Adjust game settings here. You can change the text speed, sound volume, and other preferences.",
    Debug:
      "Debug mode activated. This mode shows additional information for developers.",
    Exit: "Are you sure you want to exit? Any unsaved progress will be lost.",
  };

  const speaker = entry === "Red" ? undefined : entry;
  showDialog.call(this, dialogTexts[entry] || `${entry} selected.`, speaker);
};

// Dialog functions
const initDialog = function () {
  dialogScene = this;
  const width = this.cameras.main.width;
  const height = this.cameras.main.height;
  const dialogWidth = width - 64;
  const dialogHeight = 100;
  const dialogX = 32;
  const dialogY = height - dialogHeight - 32;

  // Create container for dialog
  dialogContainer = this.add.container(dialogX, dialogY);
  dialogContainer.setScrollFactor(0);
  dialogContainer.setDepth(50);
  dialogContainer.setVisible(false);

  // Create background (light blue with darker blue border)
  const bg = this.add.rectangle(
    dialogWidth / 2,
    dialogHeight / 2,
    dialogWidth,
    dialogHeight,
    0xadd8e6,
    1
  );
  bg.setStrokeStyle(4, 0x4169e1);
  dialogContainer.add(bg);

  // Create dialog text
  dialogText = this.add.text(16, 16, "", {
    font: "16px monospace",
    fill: "#000000",
    align: "left",
    wordWrap: { width: dialogWidth - 80 },
  });
  dialogText.setOrigin(0, 0);
  dialogContainer.add(dialogText);

  // Create "->" indicator with jumping animation
  dialogIndicator = this.add.text(dialogWidth - 40, dialogHeight - 30, "->", {
    font: "20px monospace",
    fill: "#000000",
    align: "right",
  });
  dialogIndicator.setOrigin(0.5, 0.5);
  dialogIndicator.setVisible(false);
  dialogContainer.add(dialogIndicator);
};

const splitTextIntoLines = function (text, maxWidth) {
  // Use Phaser's text measurement for accurate wrapping
  const tempText = dialogScene.add.text(0, 0, "", {
    font: "16px monospace",
    fill: "#000000",
  });
  tempText.setVisible(false);

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    tempText.setText(testLine);
    const textWidth = tempText.width;

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  tempText.destroy();
  return lines;
};

const showDialog = function (text, speaker) {
  // Clear any existing typing timer
  if (dialogTypingTimer) {
    clearTimeout(dialogTypingTimer);
    dialogTypingTimer = null;
  }

  isDialogVisible = true;
  const fullText = speaker ? `${speaker}: ${text}` : text;

  // Split text into lines based on dialog width
  const dialogWidth = dialogScene.cameras.main.width - 64;
  const maxTextWidth = dialogWidth - 80;
  dialogLines = splitTextIntoLines(fullText, maxTextWidth);

  currentDialogLineIndex = 0;
  currentDialogCharIndex = 0;
  dialogText.setText("");
  dialogIndicator.setVisible(false);
  dialogContainer.setVisible(true);

  // Start typing animation
  typeDialogText.call(dialogScene);

  // Stop any existing indicator animation
  dialogScene.tweens.killTweensOf(dialogIndicator);
};

const typeDialogText = function () {
  if (currentDialogLineIndex >= dialogLines.length) {
    // All lines shown, hide indicator
    dialogIndicator.setVisible(false);
    return;
  }

  const currentLine = dialogLines[currentDialogLineIndex];

  if (currentDialogCharIndex < currentLine.length) {
    // Type next character
    const textToShow = currentLine.substring(0, currentDialogCharIndex + 1);
    dialogText.setText(textToShow);
    currentDialogCharIndex++;

    // Continue typing
    dialogTypingTimer = setTimeout(() => {
      typeDialogText.call(this);
    }, 30); // 30ms per character for typing speed
  } else {
    // Current line finished
    // Show indicator if there are more lines
    if (currentDialogLineIndex < dialogLines.length - 1) {
      dialogIndicator.setVisible(true);
      // Reset position and start jumping animation
      dialogScene.tweens.killTweensOf(dialogIndicator);
      const dialogHeight = 100;
      const originalY = dialogHeight - 30;
      dialogIndicator.y = originalY;
      dialogScene.tweens.add({
        targets: dialogIndicator,
        y: originalY - 5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      dialogIndicator.setVisible(false);
    }
  }
};

const handleDialogAdvance = function () {
  // If still typing current line, skip to end
  if (currentDialogCharIndex < dialogLines[currentDialogLineIndex].length) {
    // Skip to end of current line
    if (dialogTypingTimer) {
      clearTimeout(dialogTypingTimer);
      dialogTypingTimer = null;
    }
    dialogText.setText(dialogLines[currentDialogLineIndex]);
    currentDialogCharIndex = dialogLines[currentDialogLineIndex].length;

    // Show indicator if there are more lines
    if (currentDialogLineIndex < dialogLines.length - 1) {
      dialogIndicator.setVisible(true);
      // Reset position and start jumping animation
      dialogScene.tweens.killTweensOf(dialogIndicator);
      const dialogHeight = 100;
      const originalY = dialogHeight - 30;
      dialogIndicator.y = originalY;
      dialogScene.tweens.add({
        targets: dialogIndicator,
        y: originalY - 5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      dialogIndicator.setVisible(false);
    }
    return;
  }

  // Current line finished, check if there are more lines
  if (currentDialogLineIndex < dialogLines.length - 1) {
    // There are more lines, advance to next line
    currentDialogLineIndex++;
    currentDialogCharIndex = 0;
    dialogText.setText("");
    dialogIndicator.setVisible(false);
    // Stop indicator animation
    this.tweens.killTweensOf(dialogIndicator);
    typeDialogText.call(this);
  } else {
    // All lines shown, close dialog
    closeDialog.call(this);
  }
};

const closeDialog = function () {
  // Clear typing timer
  if (dialogTypingTimer) {
    clearTimeout(dialogTypingTimer);
    dialogTypingTimer = null;
  }

  // Stop indicator animation
  if (dialogScene && dialogIndicator) {
    dialogScene.tweens.killTweensOf(dialogIndicator);
  }

  isDialogVisible = false;
  dialogContainer.setVisible(false);
  dialogLines = [];
  currentDialogLineIndex = 0;
  currentDialogCharIndex = 0;
  dialogIndicator.setVisible(false);
};

// Flower interaction functions
function createFlowerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Disable smoothing for pixel art
  ctx.imageSmoothingEnabled = false;

  // Background (transparent)
  ctx.clearRect(0, 0, 32, 32);

  // Draw flower - pixel art style
  // Stem (dark green)
  ctx.fillStyle = "#2d5016";
  ctx.fillRect(14, 20, 4, 12);

  // Leaves (green)
  ctx.fillStyle = "#4a7c2a";
  ctx.fillRect(10, 24, 4, 3);
  ctx.fillRect(18, 24, 4, 3);

  // Petals (pink/red)
  ctx.fillStyle = "#d45a7f";
  // Top petal
  ctx.fillRect(12, 8, 8, 6);
  // Left petal
  ctx.fillRect(6, 12, 6, 8);
  // Right petal
  ctx.fillRect(20, 12, 6, 8);
  // Bottom left
  ctx.fillRect(8, 18, 6, 6);
  // Bottom right
  ctx.fillRect(18, 18, 6, 6);

  // Center (yellow)
  ctx.fillStyle = "#f4d03f";
  ctx.fillRect(13, 13, 6, 6);

  // Add texture to Phaser
  this.textures.addCanvas("flower", canvas);
}

// Helper function to check if a tile is likely a standalone decorative element (like a flower)
function checkIfIsolatedDecorativeTile(layerData, x, y, layerName) {
  // Flowers are usually isolated decorative tiles
  // Check if surrounding tiles suggest this is a standalone element
  const checkRadius = 2;
  let decorativeCount = 0;
  let totalChecked = 0;

  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = x + dx;
      const checkY = y + dy;

      if (
        checkX < 0 ||
        checkY < 0 ||
        checkY >= layerData.length ||
        !layerData[checkY] ||
        checkX >= layerData[checkY].length
      ) {
        continue;
      }

      const checkTile = layerData[checkY][checkX];
      if (checkTile && checkTile.index > 0 && !checkTile.collides) {
        decorativeCount++;
      }
      totalChecked++;
    }
  }

  // If there are very few decorative tiles nearby, this might be a flower
  // (flowers are usually sparse decorative elements)
  const decorativeRatio = decorativeCount / totalChecked;
  return decorativeRatio < 0.3; // Less than 30% of nearby tiles are decorative
}

function createFlowers() {
  flowers = [];

  if (!gameMap) {
    console.warn("Map not loaded, cannot create flowers from tilemap");
    return;
  }

  // Get the raw tilemap data to access tile properties
  const tilemapData = gameMap.data;
  if (!tilemapData || !tilemapData.tilesets || !tilemapData.tilesets[0]) {
    console.warn("Cannot access tilemap data for flower detection");
    return;
  }

  const firstGID = tilemapData.tilesets[0].firstgid || 1;
  const tilesetData = tilemapData.tilesets[0];

  // Build a map of tile IDs to their properties
  const tileProperties = new Map();
  if (tilesetData.tiles) {
    tilesetData.tiles.forEach((tileDef) => {
      if (tileDef.properties) {
        const gid = firstGID + tileDef.id;
        tileProperties.set(gid, tileDef.properties);
      }
    });
  }

  // Scan all layers for flower tiles
  const layersToCheck = ["Below Player", "Above Player"];
  const tileSize = gameMap.tileWidth; // Usually 32

  layersToCheck.forEach((layerName) => {
    const layer = gameMap.getLayer(layerName);
    if (!layer) return;

    const layerData = layer.data;
    if (!layerData) return;

    // Scan through all tiles in the layer
    for (let y = 0; y < layerData.length; y++) {
      const row = layerData[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (!tile || tile.index === null || tile.index === -1) continue;

        // Get the GID (Global ID) of the tile
        const tileGID = tile.index + firstGID;

        // Priority 1: Check if this tile GID is in our configured flower list
        const isConfiguredFlower =
          FLOWER_TILE_GIDS.size > 0 && FLOWER_TILE_GIDS.has(tileGID);

        // Priority 2: Check tile properties for flower markers
        const props = tileProperties.get(tileGID);
        const hasFlowerProperty =
          props &&
          props.some(
            (p) =>
              (p.name === "isFlower" ||
                p.name === "flower" ||
                p.name === "type") &&
              (p.value === true || p.value === "flower" || p.value === "Flower")
          );

        // Priority 3: Check if tile has properties directly
        const tileHasFlowerProp =
          tile.properties &&
          (tile.properties.isFlower === true ||
            tile.properties.flower === true ||
            tile.properties.type === "flower");

        // Primary check: explicit flower markers (configured GIDs or properties)
        const hasExplicitFlowerMarker =
          isConfiguredFlower || hasFlowerProperty || tileHasFlowerProp;

        // Secondary check: if no explicit markers, use heuristics for likely flower tiles
        // Only use heuristics if no explicit configuration is provided
        let isLikelyFlower = false;
        if (!hasExplicitFlowerMarker && FLOWER_TILE_GIDS.size === 0) {
          // Check if surrounding area suggests this is a standalone decorative element
          // (flowers are usually isolated, not part of large tile groups)
          const isIsolated = checkIfIsolatedDecorativeTile(
            layerData,
            x,
            y,
            layerName
          );
          isLikelyFlower = tile.index > 0 && !tile.collides && isIsolated;
        }

        const isFlowerTile = hasExplicitFlowerMarker || isLikelyFlower;

        if (isFlowerTile) {
          // Calculate world position (center of tile, bottom-aligned)
          const worldX = x * tileSize + tileSize / 2;
          const worldY = y * tileSize + tileSize;

          // Create interactive flower sprite at this position
          // We'll hide the original tile and replace it with our interactive flower
          const flower = this.add
            .image(worldX, worldY, "flower")
            .setOrigin(0.5, 1) // Anchor at bottom center
            .setDepth(5); // Above ground but below player when behind

          // Store reference to original tile for potential restoration
          flower.tileX = x;
          flower.tileY = y;
          flower.layerName = layerName;

          flowers.push(flower);
        }
      }
    }
  });

  // Also check Objects layer for flower objects
  const objectsLayer = gameMap.objects;
  if (objectsLayer) {
    objectsLayer.forEach((objGroup) => {
      if (objGroup.name === "Objects" && objGroup.objects) {
        objGroup.objects.forEach((obj) => {
          if (
            obj.name &&
            (obj.name.toLowerCase().includes("flower") ||
              (obj.type && obj.type.toLowerCase().includes("flower")))
          ) {
            const flower = this.add
              .image(obj.x, obj.y, "flower")
              .setOrigin(0.5, 1)
              .setDepth(5);
            flowers.push(flower);
          }
        });
      }
    });
  }

  console.log(`Created ${flowers.length} interactive flowers from tilemap`);

  // If no flowers found, log helpful messages
  if (flowers.length === 0) {
    console.warn("No flowers detected in tilemap.");
    console.info("To enable flower detection:");
    console.info(
      '1. Set "isFlower" property on flower tiles in Tiled editor, OR'
    );
    console.info("2. Configure FLOWER_TILE_GIDS array with specific tile GIDs");
    console.info(
      "   (You can find tile GIDs by inspecting tiles in Tiled editor)"
    );
  } else {
    // Log some sample tile GIDs for reference
    if (FLOWER_TILE_GIDS.size === 0 && flowers.length > 0) {
      console.info(
        "Flowers detected using heuristics. For better accuracy, configure FLOWER_TILE_GIDS with specific tile IDs."
      );
    }
  }
}

function checkFlowerProximity() {
  let nearFlower = false;

  if (flowers.length > 0 && player) {
    flowers.forEach((flower) => {
      const dx = player.x - flower.x;
      const dy = player.y - flower.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < FLOWER_PROXIMITY_DISTANCE) {
        nearFlower = true;
      }
    });
  }

  // Update state
  if (isNearFlower !== nearFlower) {
    isNearFlower = nearFlower;
    updateChatIconVisibility.call(this);
  }
}

function initFlowerInteraction() {
  // Create chat icon popup (bottom right)
  const width = this.cameras.main.width;
  const height = this.cameras.main.height;

  chatIconContainer = this.add.container(width - 100, height - 100);
  chatIconContainer.setScrollFactor(0);
  chatIconContainer.setDepth(60);
  chatIconContainer.setVisible(false);

  // Background
  const bg = this.add.rectangle(0, 0, 80, 80, 0x333333, 0.9);
  bg.setStrokeStyle(2, 0x666666);
  chatIconContainer.add(bg);

  // Chat icon (pixel art style - simple representation)
  const chatIcon = this.add.graphics();
  chatIcon.lineStyle(3, 0xffffff, 1);
  // Draw chat bubble
  chatIcon.strokeRect(-20, -20, 40, 30);
  // Draw tail
  chatIcon.beginPath();
  chatIcon.moveTo(20, 10);
  chatIcon.lineTo(30, 20);
  chatIcon.lineTo(20, 20);
  chatIcon.closePath();
  chatIcon.strokePath();
  // Draw lines inside
  chatIcon.lineStyle(2, 0xffffff, 1);
  chatIcon.moveTo(-15, -5);
  chatIcon.lineTo(15, -5);
  chatIcon.moveTo(-15, 0);
  chatIcon.lineTo(10, 0);
  chatIcon.moveTo(-15, 5);
  chatIcon.lineTo(12, 5);
  chatIcon.strokePath();
  chatIconContainer.add(chatIcon);

  // "Press C" text
  const pressCText = this.add.text(0, 35, "Press C", {
    font: "12px monospace",
    fill: "#ffffff",
    align: "center",
  });
  pressCText.setOrigin(0.5);
  chatIconContainer.add(pressCText);

  // Create chat dialogue box (left side)
  chatWidth = 400;
  const chatHeight = height - 100;
  const chatX = 20;
  const chatY = 50;

  chatDialogueContainer = this.add.container(chatX, chatY);
  chatDialogueContainer.setScrollFactor(0);
  chatDialogueContainer.setDepth(60);
  chatDialogueContainer.setVisible(false);

  // Background
  const chatBg = this.add.rectangle(
    chatWidth / 2,
    chatHeight / 2,
    chatWidth,
    chatHeight,
    0x1a1a1a,
    0.95
  );
  chatBg.setStrokeStyle(4, 0x666666);
  chatDialogueContainer.add(chatBg);

  // Header
  const headerBg = this.add.rectangle(
    chatWidth / 2,
    30,
    chatWidth,
    50,
    0x2a2a2a,
    1
  );
  headerBg.setStrokeStyle(2, 0x666666);
  chatDialogueContainer.add(headerBg);

  const flowerIcon = this.add.text(20, 30, "🌸", {
    font: "24px monospace",
    fill: "#ffffff",
  });
  flowerIcon.setOrigin(0, 0.5);
  chatDialogueContainer.add(flowerIcon);

  const headerText = this.add.text(50, 30, "Flower Chat", {
    font: "bold 16px monospace",
    fill: "#ffffff",
  });
  headerText.setOrigin(0, 0.5);
  chatDialogueContainer.add(headerText);

  const closeButton = this.add.text(chatWidth - 30, 30, "×", {
    font: "bold 24px monospace",
    fill: "#ffffff",
  });
  closeButton.setOrigin(0.5);
  closeButton.setInteractive({ useHandCursor: true });
  closeButton.on("pointerdown", () => {
    closeChat.call(this);
  });
  chatDialogueContainer.add(closeButton);

  // Messages container (scrollable area)
  chatMessageContainer = this.add.container(chatWidth / 2, 100);
  chatDialogueContainer.add(chatMessageContainer);

  // Initial message from flower
  addChatMessage.call(this, "flower", "Hello! I'm a flower 🌸");

  // Input area
  const inputBg = this.add.rectangle(
    chatWidth / 2,
    chatHeight - 60,
    chatWidth - 40,
    40,
    0x2a2a2a,
    1
  );
  inputBg.setStrokeStyle(2, 0x666666);
  chatDialogueContainer.add(inputBg);

  chatInputField = this.add.text(30, chatHeight - 60, "", {
    font: "14px monospace",
    fill: "#ffffff",
    backgroundColor: "#1a1a1a",
    padding: { x: 10, y: 8 },
  });
  chatInputField.setOrigin(0, 0.5);
  chatInputField.setInteractive({ useHandCursor: true });
  chatInputField.on("pointerdown", () => {
    // Focus input (in a real implementation, you'd use HTML input)
    isChatOpen = true;
  });
  chatDialogueContainer.add(chatInputField);

  const placeholderText = this.add.text(
    30,
    chatHeight - 60,
    "Type your message...",
    {
      font: "14px monospace",
      fill: "#666666",
    }
  );
  placeholderText.setOrigin(0, 0.5);
  placeholderText.setName("placeholder");
  chatDialogueContainer.add(placeholderText);

  const sendButton = this.add.text(chatWidth - 50, chatHeight - 60, "Send", {
    font: "bold 14px monospace",
    fill: "#4a9eff",
    backgroundColor: "#2a2a2a",
    padding: { x: 10, y: 8 },
  });
  sendButton.setOrigin(0.5);
  sendButton.setInteractive({ useHandCursor: true });
  sendButton.on("pointerdown", () => {
    sendChatMessage.call(this);
  });
  chatDialogueContainer.add(sendButton);

  // Keyboard handler for C key
  const cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  cKey.on("down", () => {
    if (isNearFlower && !isChatOpen && !isMenuOpen && !isDialogVisible) {
      openChat.call(this);
    }
  });

  // Keyboard handler for Escape key to close chat
  const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  escKey.on("down", () => {
    if (isChatOpen) {
      closeChat.call(this);
    }
  });

  // Handle text input (simplified - in production you'd use HTML input)
  this.input.keyboard.on("keydown", (event) => {
    if (!isChatOpen) return;

    if (event.key === "Enter") {
      sendChatMessage.call(this);
    } else if (event.key === "Backspace") {
      chatInputText = (chatInputText || "").slice(0, -1);
      updateChatInput.call(this, chatInputText);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      chatInputText = (chatInputText || "") + event.key;
      updateChatInput.call(this, chatInputText);
    }
  });

  // Initialize input
  chatInputText = "";
}

function updateChatIconVisibility() {
  if (chatIconContainer) {
    chatIconContainer.setVisible(isNearFlower && !isChatOpen);

    // Add bounce animation when visible
    if (isNearFlower && !isChatOpen) {
      this.tweens.add({
        targets: chatIconContainer,
        y: chatIconContainer.y - 5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      this.tweens.killTweensOf(chatIconContainer);
    }
  }
}

function openChat() {
  isChatOpen = true;
  chatDialogueContainer.setVisible(true);
  chatIconContainer.setVisible(false);

  // Hide placeholder
  const placeholder = chatDialogueContainer.list.find(
    (child) => child.name === "placeholder"
  );
  if (placeholder) {
    placeholder.setVisible(false);
  }
}

function closeChat() {
  isChatOpen = false;
  chatDialogueContainer.setVisible(false);
  updateChatIconVisibility.call(this);

  // Clear input
  chatInputText = "";
  updateChatInput.call(this, "");
}

function updateChatInput(text) {
  chatInputText = text;
  if (chatInputField) {
    chatInputField.setText(text || "");
  }

  // Show/hide placeholder
  const placeholder = chatDialogueContainer.list.find(
    (child) => child.name === "placeholder"
  );
  if (placeholder) {
    placeholder.setVisible(text.length === 0);
  }
}

function sendChatMessage() {
  if (!chatInputText || chatInputText.trim().length === 0) return;

  // Add player message
  addChatMessage.call(this, "player", chatInputText.trim());

  // Clear input
  const message = chatInputText.trim();
  updateChatInput.call(this, "");

  // Flower responds after a delay
  setTimeout(() => {
    const response = getFlowerResponse(message);
    addChatMessage.call(this, "flower", response);
  }, 500);
}

function addChatMessage(sender, text) {
  if (!chatMessageContainer) return;

  const messageY = chatMessages.length * 60 + 20;
  const messageContainer = this.add.container(0, messageY);

  const isPlayer = sender === "player";
  const bgColor = isPlayer ? 0x4a9eff : 0x2a2a2a;
  const textColor = "#ffffff";
  const align = isPlayer ? "right" : "left";
  const xPos = isPlayer ? chatWidth - 20 : 20;

  const messageBg = this.add.rectangle(
    xPos,
    0,
    Math.min(text.length * 8 + 20, chatWidth - 60),
    40,
    bgColor,
    1
  );
  messageBg.setOrigin(isPlayer ? 1 : 0, 0.5);
  messageContainer.add(messageBg);

  const messageText = this.add.text(xPos + (isPlayer ? -10 : 10), 0, text, {
    font: "12px monospace",
    fill: textColor,
    wordWrap: { width: chatWidth - 80 },
  });
  messageText.setOrigin(isPlayer ? 1 : 0, 0.5);
  messageContainer.add(messageText);

  chatMessageContainer.add(messageContainer);
  chatMessages.push({ container: messageContainer, sender, text });

  // Scroll to bottom (simple implementation)
  if (chatMessages.length > 6) {
    // Remove old messages from view (keep last 6 visible)
    const toRemove = chatMessages.shift();
    toRemove.container.destroy();

    // Reposition remaining messages
    chatMessages.forEach((msg, index) => {
      msg.container.y = index * 60 + 20;
    });
  }
}

function getFlowerResponse(playerMessage) {
  const lowerMessage = playerMessage.toLowerCase();

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello there! Nice to meet you!";
  }
  if (lowerMessage.includes("how") && lowerMessage.includes("you")) {
    return "I'm doing great, thank you for asking! The sun feels wonderful today.";
  }
  if (lowerMessage.includes("name")) {
    return "I don't have a name, but you can call me Flower! What's your name?";
  }
  if (lowerMessage.includes("weather")) {
    return "The weather is perfect for growing! I love sunny days.";
  }
  if (lowerMessage.includes("beautiful") || lowerMessage.includes("pretty")) {
    return "Aww, thank you! That's so kind of you to say!";
  }
  if (lowerMessage.includes("bye") || lowerMessage.includes("goodbye")) {
    return "Goodbye! Come visit me again soon!";
  }
  if (lowerMessage.includes("help")) {
    return "I'm just a flower, but I'm here to chat! Ask me anything!";
  }

  // Default responses
  const defaultResponses = [
    "That's interesting! Tell me more!",
    "I love chatting with you!",
    "The world is so beautiful, don't you think?",
    "I wish I could move around like you do!",
    "Have you seen any other flowers nearby?",
    "I'm happy just being here, growing and blooming!",
  ];
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
