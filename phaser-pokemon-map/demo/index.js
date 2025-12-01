/**
 * Author: Michael Hadley, mikewesthad.com
 * Asset Credits:
 *  - Tuxemon, https://github.com/Tuxemon/Tuxemon
 */

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
}

const game = new Phaser.Game(config)
let cursors
let player
let showDebug = false
let weatherWidget = null
let weatherData = null

function preload() {
  this.load.image('tiles', '../assets/tilesets/tuxmon-sample-32px-extruded.png')
  this.load.tilemapTiledJSON('map', '../assets/tilemaps/tuxemon-town-expanded.json')

  // An atlas is a way to pack multiple images together into one texture. I'm using it to load all
  // the player animations (walking left, walking right, etc.) in one image. For more info see:
  //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
  // If you don't use an atlas, you can do the same thing with a spritesheet, see:
  //  https://labs.phaser.io/view.html?src=src/animation/single%20sprite%20sheet.js
  this.load.atlas(
    'atlas',
    '../assets/atlas/atlas.png',
    '../assets/atlas/atlas.json'
  )
}

function create() {
  const map = this.make.tilemap({ key: 'map' })

  // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
  // Phaser's cache (i.e. the name you used in preload)
  const tileset = map.addTilesetImage('tuxmon-sample-32px-extruded', 'tiles')

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const belowLayer = map.createLayer('Below Player', tileset, 0, 0)
  const worldLayer = map.createLayer('World', tileset, 0, 0)
  const aboveLayer = map.createLayer('Above Player', tileset, 0, 0)

  worldLayer.setCollisionByProperty({ collides: true })

  // By default, everything gets depth sorted on the screen in the order we created things. Here, we
  // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
  // Higher depths will sit on top of lower depth objects.
  aboveLayer.setDepth(10)

  // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
  // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
  const spawnPoint = map.findObject(
    'Objects',
    (obj) => obj.name === 'Spawn Point'
  )

  // Create a sprite with physics enabled via the physics system. The image used for the sprite has
  // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
  player = this.physics.add
    .sprite(spawnPoint.x, spawnPoint.y, 'atlas', 'misa-front')
    .setSize(30, 40)
    .setOffset(0, 24)

  // Watch the player and worldLayer for collisions, for the duration of the scene:
  this.physics.add.collider(player, worldLayer)

  // Create the player's walking animations from the texture atlas. These are stored in the global
  // animation manager so any sprite can access them.
  const anims = this.anims
  anims.create({
    key: 'misa-left-walk',
    frames: anims.generateFrameNames('atlas', {
      prefix: 'misa-left-walk.',
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 10,
    repeat: -1
  })
  anims.create({
    key: 'misa-right-walk',
    frames: anims.generateFrameNames('atlas', {
      prefix: 'misa-right-walk.',
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 10,
    repeat: -1
  })
  anims.create({
    key: 'misa-front-walk',
    frames: anims.generateFrameNames('atlas', {
      prefix: 'misa-front-walk.',
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 10,
    repeat: -1
  })
  anims.create({
    key: 'misa-back-walk',
    frames: anims.generateFrameNames('atlas', {
      prefix: 'misa-back-walk.',
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 10,
    repeat: -1
  })

  const camera = this.cameras.main
  camera.startFollow(player)
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

  cursors = this.input.keyboard.createCursorKeys()

  // Initialize weather widget
  initWeatherWidget.call(this)

  // Debug graphics
  this.input.keyboard.once('keydown-D', (event) => {
    // Turn on physics debugging to show player's hitbox
    this.physics.world.createDebugGraphic()

    // Create worldLayer collision graphic above the player, but below the help text
    const graphics = this.add.graphics().setAlpha(0.75).setDepth(20)
    worldLayer.renderDebug(graphics, {
      tileColor: null, // Color of non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
      faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
    })
  })
}

function update(time, delta) {
  const speed = 175
  const prevVelocity = player.body.velocity.clone()

  // Stop any previous movement from the last frame
  player.body.setVelocity(0)

  // Horizontal movement
  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed)
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed)
  }

  // Vertical movement
  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed)
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed)
  }

  // Normalize and scale the velocity so that player can't move faster along a diagonal
  player.body.velocity.normalize().scale(speed)

  // Update the animation last and give left/right animations precedence over up/down animations
  if (cursors.left.isDown) {
    player.anims.play('misa-left-walk', true)
  } else if (cursors.right.isDown) {
    player.anims.play('misa-right-walk', true)
  } else if (cursors.up.isDown) {
    player.anims.play('misa-back-walk', true)
  } else if (cursors.down.isDown) {
    player.anims.play('misa-front-walk', true)
  } else {
    player.anims.stop()

    // If we were moving, pick and idle frame to use
    if (prevVelocity.x < 0) player.setTexture('atlas', 'misa-left')
    else if (prevVelocity.x > 0) player.setTexture('atlas', 'misa-right')
    else if (prevVelocity.y < 0) player.setTexture('atlas', 'misa-back')
    else if (prevVelocity.y > 0) player.setTexture('atlas', 'misa-front')
  }
}

// Weather widget functions
const WEATHER_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
}

const getWeatherIcon = (weathercode) => {
  if (weathercode === 0) return '☀️'
  if (weathercode <= 3) return '⛅'
  if (weathercode <= 48) return '🌫️'
  if (weathercode <= 67) return '🌧️'
  if (weathercode <= 86) return '❄️'
  return '⛈️'
}

const formatTime = (timeString) => {
  const date = new Date(timeString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchWeatherData = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch weather data')
    }

    const data = await response.json()
    return {
      ...data.current_weather,
      daily: data.daily
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

const initWeatherWidget = function () {
  // Get user location
  if (!navigator.geolocation) {
    createWeatherWidget.call(this, null, 'Geolocation not supported')
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const weather = await fetchWeatherData(lat, lon)
      createWeatherWidget.call(this, weather, null)
    },
    (err) => {
      let errorMessage = 'Unable to get location'
      if (err.code === 1) {
        errorMessage = 'Location access denied'
      } else if (err.code === 2) {
        errorMessage = 'Location unavailable'
      } else if (err.code === 3) {
        errorMessage = 'Location request timed out'
      }
      createWeatherWidget.call(this, null, errorMessage)
    }
  )
}

const createWeatherWidget = function (weather, error) {
  const width = this.cameras.main.width
  const padding = 16
  const widgetWidth = 280
  const widgetHeight = 140
  const x = width - widgetWidth - padding
  const y = padding

  // Create container for the widget
  const container = this.add.container(x, y)
  container.setScrollFactor(0)
  container.setDepth(30)

  // Create background
  const bg = this.add.rectangle(
    widgetWidth / 2,
    widgetHeight / 2,
    widgetWidth,
    widgetHeight,
    0xffffff,
    0.9
  )
  bg.setStrokeStyle(2, 0x000000, 0.3)
  container.add(bg)

  if (error || !weather) {
    // Error state
    const errorText = this.add.text(widgetWidth / 2, widgetHeight / 2, error || 'Unable to fetch weather', {
      font: '14px monospace',
      fill: '#ff0000',
      align: 'center',
      wordWrap: { width: widgetWidth - 20 }
    })
    errorText.setOrigin(0.5)
    container.add(errorText)
    weatherWidget = container
    return
  }

  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || 'Unknown'
  const weatherIcon = getWeatherIcon(weather.weathercode)

  // Weather icon and main info
  const iconText = this.add.text(20, 20, weatherIcon, {
    font: '32px monospace',
    fill: '#000000'
  })
  container.add(iconText)

  const tempText = this.add.text(60, 15, `${weather.temperature.toFixed(1)}°C`, {
    font: 'bold 20px monospace',
    fill: '#000000'
  })
  container.add(tempText)

  const descText = this.add.text(60, 40, weatherDescription, {
    font: '12px monospace',
    fill: '#333333',
    wordWrap: { width: widgetWidth - 80 }
  })
  container.add(descText)

  // Additional info
  const windText = this.add.text(20, 80, `Wind: ${weather.windspeed.toFixed(1)} km/h`, {
    font: '12px monospace',
    fill: '#666666'
  })
  container.add(windText)

  const timeText = this.add.text(20, 100, `Updated: ${formatTime(weather.time)}`, {
    font: '11px monospace',
    fill: '#666666'
  })
  container.add(timeText)

  weatherWidget = container
  weatherData = weather

  // Update weather every 5 minutes
  setInterval(async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          const newWeather = await fetchWeatherData(lat, lon)
          if (newWeather && weatherWidget) {
            updateWeatherWidget.call(this, newWeather)
          }
        },
        () => {
          // Silently fail on update
        }
      )
    }
  }, 5 * 60 * 1000) // 5 minutes
}

const updateWeatherWidget = function (weather) {
  if (!weatherWidget || !weather) return

  weatherData = weather
  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || 'Unknown'
  const weatherIcon = getWeatherIcon(weather.weathercode)

  // Clear existing text elements (keep background)
  const children = weatherWidget.list.slice(1) // Skip background
  children.forEach((child) => {
    if (child.type === 'Text') {
      child.destroy()
    }
  })

  // Recreate text elements with relative positioning
  const iconText = this.add.text(20, 20, weatherIcon, {
    font: '32px monospace',
    fill: '#000000'
  })
  weatherWidget.add(iconText)

  const tempText = this.add.text(60, 15, `${weather.temperature.toFixed(1)}°C`, {
    font: 'bold 20px monospace',
    fill: '#000000'
  })
  weatherWidget.add(tempText)

  const descText = this.add.text(60, 40, weatherDescription, {
    font: '12px monospace',
    fill: '#333333',
    wordWrap: { width: 200 }
  })
  weatherWidget.add(descText)

  const windText = this.add.text(20, 80, `Wind: ${weather.windspeed.toFixed(1)} km/h`, {
    font: '12px monospace',
    fill: '#666666'
  })
  weatherWidget.add(windText)

  const timeText = this.add.text(20, 100, `Updated: ${formatTime(weather.time)}`, {
    font: '11px monospace',
    fill: '#666666'
  })
  weatherWidget.add(timeText)
}
