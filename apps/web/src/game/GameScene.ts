/**
 * Author: Michael Hadley, mikewesthad.com
 * Asset Credits:
 *  - Tuxemon, https://github.com/Tuxemon/Tuxemon
 */

import Phaser from "phaser";
import { ANIMAL_CONFIGS, ASSET_PATHS } from "./config/AssetPaths";
import {
  AUTO_SAVE_INTERVAL,
  ITEM_TYPES,
  MIN_SAVE_INTERVAL,
} from "./config/GameConstants";
import { Player } from "./entities/Player";
import {
  type GameSaveData,
  getCurrentWorldId,
  loadGame,
  saveGame,
  setCurrentWorld,
  startSession,
  stopSession,
  updatePlayTime,
} from "./services/SaveService";
import { AnimalSystem } from "./systems/AnimalSystem";
import { AudioSystem } from "./systems/AudioSystem";
import { ChatSystem } from "./systems/ChatSystem";
import { CollectionSystem } from "./systems/CollectionSystem";
import { CraftingSystem } from "./systems/CraftingSystem";
import { DayNightSystem } from "./systems/DayNightSystem";
import { DialogSystem } from "./systems/DialogSystem";
import { EnergySystem } from "./systems/EnergySystem";
import { InventorySystem } from "./systems/InventorySystem";
import { LightingSystem } from "./systems/LightingSystem";
import { LootDispersionSystem } from "./systems/LootDispersionSystem";
import { MenuSystem } from "./systems/MenuSystem";
import { TileManagementSystem } from "./systems/TileManagementSystem";
import { WeatherEffectsSystem } from "./systems/WeatherEffectsSystem";
import { debugLog, debugWarn } from "./utils/DebugUtils";
import { gameEventBus } from "./utils/GameEventBus";
import {
  createVirtualCursorKeys,
  isMobileDevice,
  type VirtualCursorKeys,
} from "./utils/MobileUtils";
import { getTileProperty } from "./utils/TileUtils";

export class GameScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys | VirtualCursorKeys;
  private virtualCursors?: VirtualCursorKeys;
  private isMobile = false;
  private player?: Player;
  private gameMap: Phaser.Tilemaps.Tilemap | null = null;
  private worldLayer?: Phaser.Tilemaps.TilemapLayer;
  private aboveLayer?: Phaser.Tilemaps.TilemapLayer;

  // Systems
  private menuSystem?: MenuSystem;
  private dialogSystem?: DialogSystem;
  private chatSystem?: ChatSystem;
  private audioSystem?: AudioSystem;
  private inventorySystem?: InventorySystem;
  private collectionSystem?: CollectionSystem;
  private tileManagementSystem?: TileManagementSystem;
  private animalSystem?: AnimalSystem;
  private dayNightSystem?: DayNightSystem;
  private weatherEffectsSystem?: WeatherEffectsSystem;
  private lootDispersionSystem?: LootDispersionSystem;
  private energySystem?: EnergySystem;
  private craftingSystem?: CraftingSystem;
  private lightingSystem?: LightingSystem;

  // Tile info hover system
  private hoveredTileInfo: {
    tileX: number;
    tileY: number;
    info: string;
  } | null = null;
  private tileInfoPopup?: Phaser.GameObjects.Container;

  // Save system
  private currentWorldId: string | null = null;
  private autoSaveInterval?: number;
  private lastSaveTime: number = 0;

  // Scene transition
  private isTransitioning = false;

  constructor() {
    super({ key: "GameScene" });
  }

  shutdown(): void {
    // Save game state before shutting down
    if (this.currentWorldId) {
      this.saveGameState();
      stopSession(this.currentWorldId);
    }

    // Clean up auto-save interval
    if (this.autoSaveInterval !== undefined) {
      clearInterval(this.autoSaveInterval);
    }

    // Clean up mobile event listeners
    if (this.isMobile) {
      window.removeEventListener(
        "mobileDirectionChange",
        this.handleMobileDirectionChange,
      );
      window.removeEventListener("mobileActionX", this.handleMobileActionX);
      window.removeEventListener("mobileStart", this.handleMobileStart);
    }

    // Clean up systems
    this.collectionSystem?.shutdown();
    this.audioSystem?.shutdown();
    this.dayNightSystem?.shutdown();
    this.weatherEffectsSystem?.shutdown();
    this.lootDispersionSystem?.shutdown();
    this.energySystem?.shutdown();
    this.lightingSystem?.shutdown();

    // Clean up tile info popup
    if (this.tileInfoPopup) {
      this.tileInfoPopup.destroy();
    }

    // Clean up animal system
    this.animalSystem?.shutdown();
  }

  preload(): void {
    // Load tilesets
    this.load.image("tiles-grass", ASSET_PATHS.tiles.grass);
    this.load.image("tiles-plant", ASSET_PATHS.tiles.plantWithShadow);
    this.load.image("tiles-props", ASSET_PATHS.tiles.propsWithShadow);
    this.load.image("tiles-structures", ASSET_PATHS.tiles.structures);
    this.load.image("tiles-wall", ASSET_PATHS.tiles.wall);
    this.load.tilemapTiledJSON("map", ASSET_PATHS.map);
    this.load.atlas("atlas", ASSET_PATHS.atlas.image, ASSET_PATHS.atlas.json);
    this.load.audio("mainTheme", ASSET_PATHS.music.mainTheme);
    this.load.audio("hit", ASSET_PATHS.audio.hit);
    this.load.audio("destroy", ASSET_PATHS.audio.destroy);
    this.load.audio("intro", ASSET_PATHS.audio.intro);

    // Load item images
    Object.entries(ASSET_PATHS.items).forEach(([key, path]) => {
      this.load.image(key, path);
    });

    // Load all animal spritesheets
    // Each sprite sheet is a 4x4 grid (16 frames total)
    ANIMAL_CONFIGS.forEach((config) => {
      this.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    });
  }

  create(): void {
    // Reset transition flag when scene is created/restarted
    this.isTransitioning = false;

    const map = this.make.tilemap({ key: "map" });
    this.gameMap = map;

    // Add all tilesets to the map
    const grassTileset = map.addTilesetImage("TX Tileset Grass", "tiles-grass");
    const plantTileset = map.addTilesetImage(
      "TX Plant with Shadow",
      "tiles-plant",
    );
    const propsTileset = map.addTilesetImage(
      "TX Props with Shadow",
      "tiles-props",
    );
    const wallTileset = map.addTilesetImage("TX Tileset Wall", "tiles-wall");
    const structuresTileset = map.addTilesetImage(
      "TX Struct",
      "tiles-structures",
    );
    if (!grassTileset || !plantTileset || !propsTileset || !wallTileset) {
      console.error("One or more tilesets not found");
      return;
    }
    // Create layers with all tilesets
    const tilesets = [
      grassTileset,
      plantTileset,
      propsTileset,
      wallTileset,
      structuresTileset,
    ].filter((t) => t !== null) as Phaser.Tilemaps.Tileset[];

    map.createLayer("Below Player", tilesets, 0, 0);
    const worldLayer = map.createLayer("World", tilesets, 0, 0);
    this.worldLayer = worldLayer || undefined;
    const aboveLayer = map.createLayer("Above Player", tilesets, 0, 0);
    this.aboveLayer = aboveLayer || undefined;

    if (worldLayer) {
      worldLayer.setCollisionByProperty({ collides: true });
    }

    if (aboveLayer) {
      aboveLayer.setDepth(10);
    }

    // Try to find spawn point, fall back to stairs spawn point if not found
    let spawnPoint = map.findObject(
      "Objects",
      (obj) => obj.name === "Spawn Point",
    );

    if (!spawnPoint) {
      // Fall back to stairs spawn point if regular spawn point doesn't exist
      spawnPoint = map.findObject(
        "Objects",
        (obj) => obj.name === "Stairs Spawn Point",
      );
    }

    if (!spawnPoint) {
      console.error("Spawn Point or Stairs Spawn Point not found in map");
      return;
    }

    const oldStatue = map.findObject("Objects", (obj) => {
      const parsedObj = obj as Phaser.GameObjects.GameObject & {
        properties: [
          {
            name: string;
            type: string;
            value: string;
          },
        ];
        id: number;
      };
      if (!parsedObj.properties) return false;
      return (
        parsedObj.properties.find((property) => property.name === "type")
          ?.value === "intelligent"
      );
    });

    // Setup input - use virtual cursors for mobile, real keyboard for desktop
    this.isMobile = isMobileDevice();
    if (this.isMobile) {
      this.virtualCursors = createVirtualCursorKeys();
      this.cursors = this.virtualCursors;
      this.setupMobileControls();
    } else {
      this.cursors = this.input.keyboard?.createCursorKeys();
    }

    // Check if we're transitioning from another scene
    const initData = this.scene.settings.data as
      | {
          playerX?: number;
          playerY?: number;
          playerDirection?: string;
          fromScene?: string;
        }
      | undefined;

    // Determine spawn position
    let spawnX = spawnPoint.x ?? 0;
    let spawnY = spawnPoint.y ?? 0;

    // If coming from another scene, use stairs spawn point
    if (initData?.fromScene) {
      const stairsSpawnPoint = this.findStairsSpawnPoint();
      if (stairsSpawnPoint) {
        spawnX = stairsSpawnPoint.x ?? spawnX;
        spawnY = stairsSpawnPoint.y ?? spawnY;
      }
    }

    this.player = new Player(
      this,
      spawnX,
      spawnY,
      this.cursors ?? {
        up: { isDown: false },
        down: { isDown: false },
        left: { isDown: false },
        right: { isDown: false },
      },
    );

    // Set gameMap and worldLayer for stairs detection
    this.player.setGameMap(this.gameMap);
    this.player.setWorldLayer(this.worldLayer);

    // Handle fade in if coming from another scene
    if (initData?.fromScene) {
      this.cameras.main.fadeIn(333, 0, 0, 0);
    }

    if (worldLayer) {
      this.physics.add.collider(this.player.getSprite(), worldLayer);
    }

    const camera = this.cameras.main;
    camera.startFollow(this.player.getSprite());
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Initialize day/night system
    this.dayNightSystem = new DayNightSystem(this);
    this.dayNightSystem.init(camera);

    // Initialize lighting system
    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.init(
      this.player,
      this.gameMap,
      this.worldLayer,
      this.aboveLayer,
    );
    // Note: Player sprite does NOT get Light2D pipeline - it appears normal
    // Only the world around the player is affected by the lighting

    // Initialize weather effects system
    this.weatherEffectsSystem = new WeatherEffectsSystem(this);
    this.weatherEffectsSystem.init(camera, this.player, this.gameMap);

    // Initialize energy system
    this.energySystem = new EnergySystem(this);
    this.energySystem.init(
      () => this.getWeatherType(),
      () => this.getTimeOfDay(),
    );

    // Initialize systems
    this.initSystems();

    // Initialize audio system
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.init();
    this.audioSystem.startMusic();
    this.audioSystem.setupBackgroundAudio();

    // Initialize inventory system
    this.inventorySystem = new InventorySystem();
    this.inventorySystem.init();
    // UI is now handled by React components
    this.inventorySystem.setOnInventoryChange(() => {
      this.scheduleSave();
    });

    // Initialize crafting system
    if (!this.inventorySystem || !this.energySystem) {
      console.error("Inventory or energy system not initialized for crafting");
    } else {
      this.craftingSystem = new CraftingSystem();
      this.craftingSystem.init(this.inventorySystem, this.energySystem);
      this.setupCraftingControls();
    }

    // Initialize collection system
    if (!this.inventorySystem) {
      console.error("Inventory system not initialized");
      return;
    }
    this.collectionSystem = new CollectionSystem(
      this,
      this.inventorySystem.getInventoryItems(),
    );
    this.collectionSystem.setGameMap(this.gameMap);
    this.collectionSystem.setWorldLayer(this.worldLayer);
    this.collectionSystem.setPlayer(this.player);
    this.collectionSystem.setOnItemCollected((itemId, quantity) => {
      if (this.inventorySystem) {
        this.inventorySystem.addItem(itemId, quantity);
      }
    });
    this.collectionSystem.setOnCollectionCountChanged(() => {
      this.scheduleSave();
    });
    this.collectionSystem.setOnPlayHitSound(() => {
      this.audioSystem?.playHitSound();
    });

    // Initialize loot dispersion system
    this.lootDispersionSystem = new LootDispersionSystem(this);
    this.lootDispersionSystem.setPlayer(this.player);
    this.lootDispersionSystem.setOnItemCollected((itemId, quantity) => {
      if (this.inventorySystem) {
        this.inventorySystem.addItem(itemId, quantity);
      }
    });

    // Initialize tile management system
    this.tileManagementSystem = new TileManagementSystem(this);
    this.tileManagementSystem.setGameMap(this.gameMap);
    this.tileManagementSystem.setWorldLayer(this.worldLayer);
    this.tileManagementSystem.setAboveLayer(this.aboveLayer);
    this.tileManagementSystem.setPlayer(this.player);
    this.tileManagementSystem.setOnGetItemQuantity((itemId) => {
      return this.inventorySystem?.getItemQuantity(itemId) || 0;
    });
    this.tileManagementSystem.setOnRemoveItem((itemId, quantity) => {
      return this.inventorySystem?.removeItem(itemId, quantity) || false;
    });
    this.tileManagementSystem.setOnPlayDestroySound(() => {
      this.audioSystem?.playDestroySound();
    });
    this.tileManagementSystem.setOnSaveGame(() => {
      this.saveGameState();
    });
    this.tileManagementSystem.setOnDisperseLoot((loot, x, y) => {
      this.lootDispersionSystem?.disperseLoot(loot, x, y);
    });
    this.tileManagementSystem.initializeTileGroups();

    if (oldStatue) {
      this.chatSystem?.setStatuePosition({
        x: oldStatue.x ?? 0,
        y: oldStatue.y ?? 0,
      });
    }

    this.setupDebugControls();
    this.setupInputHandling();
    this.setupInventoryControls();
    this.setupCraftingKeyboardControls();
    this.setupCollectionControls();
    this.setupTreeSpawningControls();
    this.setupTileInfoHover();
    this.setupSceneTransitionControls();

    // Initialize save system
    this.initSaveSystem();

    // Initialize animal system
    this.animalSystem = new AnimalSystem(this);
    this.animalSystem.init(this.gameMap, this.worldLayer, this.player);
    this.animalSystem.createAllAnimations();
    this.animalSystem.setOnAnimalKilled((loot) => {
      // Fallback: When animal dies, add all loot items to inventory (if dispersion not working)
      if (this.inventorySystem) {
        loot.forEach((lootItem) => {
          this.inventorySystem?.addItem(lootItem.itemId, lootItem.quantity);
        });
      }
    });
    this.animalSystem.setOnDisperseLoot((loot, x, y) => {
      this.lootDispersionSystem?.disperseLoot(loot, x, y);
    });

    // Spawn animals - herbivores in herds, predators scattered
    this.animalSystem.spawnAnimals([
      // Herbivores - spawn in herds
      {
        animalKey: "miniBunny",
        quantity: 100,
        spawnAsHerd: {
          enabled: true,
          herdSize: 8, // 8 bunnies per herd
          herdSpacing: 80, // Maximum 80 pixels between bunnies in a herd
        },
      },
      {
        animalKey: "miniBoar",
        quantity: 40,
        spawnAsHerd: {
          enabled: true,
          herdSize: 5, // 5 boars per herd
          herdSpacing: 100, // Maximum 100 pixels between boars in a herd
        },
      },
      {
        animalKey: "miniDeer1",
        quantity: 30,
        spawnAsHerd: {
          enabled: true,
          herdSize: 6, // 6 deer per herd
          herdSpacing: 120, // Maximum 120 pixels between deer in a herd
        },
      },
      {
        animalKey: "miniDeer2",
        quantity: 30,
        spawnAsHerd: {
          enabled: true,
          herdSize: 6, // 6 deer per herd
          herdSpacing: 120, // Maximum 120 pixels between deer in a herd
        },
      },
      {
        animalKey: "miniBird",
        quantity: 25,
        spawnAsHerd: {
          enabled: true,
          herdSize: 5, // 5 birds per flock
          herdSpacing: 60, // Maximum 60 pixels between birds in a flock
        },
      },
      // Predators - spawn scattered (no herd configuration)
      {
        animalKey: "miniBear",
        quantity: 10,
      },
      {
        animalKey: "miniFox",
        quantity: 10,
      },
      {
        animalKey: "miniWolf",
        quantity: 10,
      },
    ]);
  }

  /**
   * Initialize save system - load game state and set up auto-save
   */
  private initSaveSystem(): void {
    // Get current world ID
    this.currentWorldId = getCurrentWorldId();

    if (this.currentWorldId) {
      const worldId = this.currentWorldId;
      // Delay loading slightly to ensure map is fully initialized
      this.time.delayedCall(100, () => {
        if (this.currentWorldId === worldId) {
          this.loadGameState(worldId);
          startSession(worldId);
        }
      });
    }

    // Set up auto-save
    this.setupAutoSave();

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      if (this.currentWorldId) {
        this.saveGameState();
        stopSession(this.currentWorldId);
      }
    });
  }

  /**
   * Set up auto-save interval
   */
  private setupAutoSave(): void {
    if (this.autoSaveInterval !== undefined) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(() => {
      if (this.currentWorldId) {
        this.saveGameState();
        updatePlayTime(this.currentWorldId);
      }
    }, AUTO_SAVE_INTERVAL);
  }

  /**
   * Save current game state
   */
  private saveGameState(): void {
    if (!this.currentWorldId || !this.player || !this.gameMap) {
      return;
    }

    // Throttle saves to prevent too frequent writes
    const now = Date.now();
    if (now - this.lastSaveTime < MIN_SAVE_INTERVAL) {
      return;
    }
    this.lastSaveTime = now;

    const playerPos = this.player.getPosition();
    const playerDirection = this.player.getDirection();

    // Get inventory data from inventory system
    const inventory = this.inventorySystem?.getInventoryData() || {};

    // Get tile collection counts from collection system
    const tileCollectionCounts =
      this.collectionSystem?.getTileCollectionCounts() || {};

    // Get modified tiles from tile management system
    const modifiedTiles = this.tileManagementSystem?.getPlacedTiles() || [];

    // Collect hidden tiles (tiles that were collected and hidden)
    // Include both world and above layer tiles
    const hiddenTiles: Array<{
      x: number;
      y: number;
      layer: "world" | "above";
    }> = [];

    if (this.worldLayer && this.gameMap) {
      // Scan world layer for hidden tiles (alpha = 0)
      for (let y = 0; y < this.gameMap.height; y += 1) {
        for (let x = 0; x < this.gameMap.width; x += 1) {
          const tile = this.worldLayer.getTileAt(x, y);
          if (tile && tile.alpha === 0) {
            hiddenTiles.push({ x, y, layer: "world" });
          }
        }
      }
    }

    if (this.aboveLayer && this.gameMap) {
      // Scan above layer for hidden tiles (alpha = 0)
      for (let y = 0; y < this.gameMap.height; y += 1) {
        for (let x = 0; x < this.gameMap.width; x += 1) {
          const tile = this.aboveLayer.getTileAt(x, y);
          if (tile && tile.alpha === 0) {
            hiddenTiles.push({ x, y, layer: "above" });
          }
        }
      }
    }

    // Get energy from energy system
    const energy = this.energySystem?.getCurrentEnergy() || 0;

    // Load existing save data to preserve metadata
    const existingSave = loadGame(this.currentWorldId);
    const saveData: GameSaveData = {
      worldId: this.currentWorldId,
      worldName: existingSave?.worldName || "Unknown World",
      createdAt: existingSave?.createdAt || Date.now(),
      lastPlayedAt: Date.now(),
      totalPlayTime: existingSave?.totalPlayTime || 0,
      sessionStartTime: existingSave?.sessionStartTime,
      // Scene-specific position for GameScene
      gameScenePosition: {
        x: playerPos.x,
        y: playerPos.y,
        direction: playerDirection,
      },
      // Legacy position for backward compatibility
      playerPosition: {
        x: playerPos.x,
        y: playerPos.y,
        direction: playerDirection,
      },
      inventory,
      // Scene-specific state for GameScene
      gameSceneState: {
        tileCollectionCounts,
        modifiedTiles,
        hiddenTiles,
      },
      // Legacy state for backward compatibility
      tileCollectionCounts,
      modifiedTiles,
      hiddenTiles,
      // Preserve NoAnimalsScene state if it exists
      noAnimalsScenePosition: existingSave?.noAnimalsScenePosition,
      noAnimalsSceneState: existingSave?.noAnimalsSceneState,
      musicVolume: this.audioSystem?.getMusicVolumeForSave() || 0.5,
      isMuted: this.audioSystem?.getMutedStateForSave() || false,
      energy,
    };

    saveGame(saveData);
    debugLog("Game state saved");
  }

  /**
   * Load game state
   */
  private loadGameState(worldId: string): void {
    const saveData = loadGame(worldId);
    if (!saveData) {
      debugLog("No save data found, starting fresh game");
      return;
    }

    if (!this.gameMap || !this.worldLayer) {
      debugWarn("Cannot load game state: map not ready");
      return;
    }

    debugLog("Loading game state for world:", saveData.worldName);

    // Use scene-specific position if available, otherwise fall back to legacy
    const scenePosition = saveData.gameScenePosition || saveData.playerPosition;

    // Use scene-specific state if available, otherwise fall back to legacy
    const sceneState = saveData.gameSceneState || {
      tileCollectionCounts: saveData.tileCollectionCounts,
      modifiedTiles: saveData.modifiedTiles,
      hiddenTiles: saveData.hiddenTiles,
    };

    // Check if this is a new game (no progress made)
    const isNewGame =
      (!scenePosition || (scenePosition.x === 0 && scenePosition.y === 0)) &&
      Object.keys(saveData.inventory).length === 0 &&
      sceneState.modifiedTiles.length === 0 &&
      sceneState.hiddenTiles.length === 0;

    // Load player position - use spawn point for new games
    if (this.player && scenePosition) {
      let x = scenePosition.x;
      let y = scenePosition.y;

      // If it's a new game, use spawn point instead of (0, 0)
      if (isNewGame && this.gameMap) {
        let spawnPoint = this.gameMap.findObject(
          "Objects",
          (obj) => obj.name === "Spawn Point",
        );
        // Fall back to stairs spawn point if regular spawn point doesn't exist
        if (!spawnPoint) {
          spawnPoint = this.gameMap.findObject(
            "Objects",
            (obj) => obj.name === "Stairs Spawn Point",
          );
        }
        if (spawnPoint) {
          x = spawnPoint.x ?? 0;
          y = spawnPoint.y ?? 0;
          debugLog("New game detected, using spawn point:", x, y);
        }
      }

      this.player.getSprite().setPosition(x, y);
    }

    // Load inventory
    if (saveData.inventory && this.inventorySystem) {
      this.inventorySystem.loadInventoryData(saveData.inventory);
    }

    // Load tile collection counts from scene-specific state
    if (sceneState.tileCollectionCounts && this.collectionSystem) {
      this.collectionSystem.loadTileCollectionCounts(
        sceneState.tileCollectionCounts,
      );
    }

    // Restore modified tiles (trees that were placed)
    if (sceneState.modifiedTiles && this.tileManagementSystem) {
      this.tileManagementSystem.loadPlacedTiles(sceneState.modifiedTiles);
      debugLog(`Restored ${sceneState.modifiedTiles.length} placed tiles`);
    }

    // Restore hidden tiles (tiles that were collected)
    // Handle both world and above layer tiles
    if (sceneState.hiddenTiles) {
      sceneState.hiddenTiles.forEach((tileData) => {
        // Support both old format (without layer) and new format (with layer)
        const layer =
          "layer" in tileData && tileData.layer === "above"
            ? this.aboveLayer
            : this.worldLayer;

        if (layer) {
          const tile = layer.getTileAt(tileData.x, tileData.y);
          if (tile) {
            tile.setAlpha(0);
            if (layer === this.worldLayer) {
              tile.setCollision(false);
            }
          }
        }
      });

      // Rebuild tile groups for trees that were hidden
      // This ensures groups are properly tracked even after loading
      this.tileManagementSystem?.initializeTileGroups();
    }

    // Load music settings
    if (this.audioSystem) {
      this.audioSystem.loadMusicSettings(
        saveData.musicVolume,
        saveData.isMuted,
      );
    }

    // Load energy
    if (saveData.energy !== undefined && this.energySystem) {
      this.energySystem.setEnergy(saveData.energy);
      debugLog(`Loaded energy: ${saveData.energy}`);
    }

    debugLog("Game state loaded successfully");
  }

  /**
   * Set the current world ID (called from Game component)
   */
  public setWorldId(worldId: string): void {
    this.currentWorldId = worldId;
    setCurrentWorld(worldId);
    if (this.currentWorldId) {
      // Delay loading to ensure map is ready
      this.time.delayedCall(200, () => {
        if (this.currentWorldId) {
          this.loadGameState(this.currentWorldId);
          startSession(this.currentWorldId);
        }
      });
    }
  }

  /**
   * Schedule a save (throttled to prevent too frequent saves)
   * This is now handled by calling saveGameState() directly when needed
   */
  private scheduleSave(): void {
    // Trigger save if enough time has passed since last save
    const now = Date.now();
    if (now - this.lastSaveTime >= MIN_SAVE_INTERVAL) {
      this.saveGameState();
    }
  }

  /**
   * Get current music volume (delegates to AudioSystem)
   * Used by MenuSystem for volume slider
   */
  public getMusicVolume(): number {
    return this.audioSystem?.getMusicVolume() || 0.5;
  }

  /**
   * Get current time of day
   * Used by systems to check day/night state
   */
  public getTimeOfDay(): "day" | "night" {
    return this.dayNightSystem?.getTimeOfDay() || "day";
  }

  /**
   * Get current weather type
   * Used by systems to check weather state
   */
  public getWeatherType():
    | "clear"
    | "cloudy"
    | "foggy"
    | "rain"
    | "snow"
    | "thunderstorm" {
    return this.weatherEffectsSystem?.getWeatherType() || "clear";
  }

  private setupMobileControls(): void {
    // Bind handlers to preserve 'this' context
    this.handleMobileDirectionChange =
      this.handleMobileDirectionChange.bind(this);
    this.handleMobileActionX = this.handleMobileActionX.bind(this);
    this.handleMobileStart = this.handleMobileStart.bind(this);

    // Listen for mobile control events
    window.addEventListener(
      "mobileDirectionChange",
      this.handleMobileDirectionChange,
    );
    window.addEventListener("mobileActionX", this.handleMobileActionX);
    window.addEventListener("mobileStart", this.handleMobileStart);
  }

  private handleMobileDirectionChange = (event: Event): void => {
    const customEvent = event as CustomEvent<{
      up: boolean;
      down: boolean;
      left: boolean;
      right: boolean;
    }>;
    if (this.virtualCursors) {
      this.virtualCursors.up.isDown = customEvent.detail.up;
      this.virtualCursors.down.isDown = customEvent.detail.down;
      this.virtualCursors.left.isDown = customEvent.detail.left;
      this.virtualCursors.right.isDown = customEvent.detail.right;
    }
  };

  private handleMobileActionX = (): void => {
    // X button: interact with environment (collect items, hit animals)
    if (
      this.chatSystem?.isOpen() ||
      this.menuSystem?.isOpen() ||
      this.dialogSystem?.isVisible() ||
      this.inventorySystem?.isOpen()
    ) {
      return;
    }

    // First check for animal interaction
    const nearbyAnimal = this.animalSystem?.checkAnimalProximity();
    if (nearbyAnimal) {
      this.animalSystem?.hitAnimal(nearbyAnimal);
      this.audioSystem?.playHitSound();
      return;
    }

    // Then check for tile collection
    const collectableData = this.collectionSystem?.checkTileProximity();
    if (collectableData && this.collectionSystem && this.tileManagementSystem) {
      this.collectionSystem.collectItem(
        collectableData.itemId,
        collectableData.tileX,
        collectableData.tileY,
        (tileX, tileY) => {
          this.tileManagementSystem?.hideTile(tileX, tileY);
        },
      );
    }
  };

  private handleMobileStart = (): void => {
    // Start button: activate menu
    if (this.chatSystem?.isOpen()) return;
    if (this.dialogSystem?.isVisible()) {
      this.dialogSystem.handleAdvance();
    } else if (!this.menuSystem?.isOpen()) {
      this.menuSystem?.toggleMenu();
    }
  };

  private initSystems(): void {
    // Initialize menu system
    this.menuSystem = new MenuSystem(this);
    this.menuSystem.setOnMenuSelect((text, speaker) => {
      this.dialogSystem?.showDialog(text, speaker);
    });
    this.menuSystem.setOnVolumeChange((volume) => {
      this.audioSystem?.setMusicVolume(volume);
    });

    // Initialize dialog system
    this.dialogSystem = new DialogSystem();

    // Initialize chat system
    this.chatSystem = new ChatSystem(this);
    this.chatSystem.initChat();
    this.chatSystem.setCanOpenChatCheck(() => {
      return !this.menuSystem?.isOpen() && !this.dialogSystem?.isVisible();
    });

    // Setup keyboard controls for menu/dialog
    this.setupMenuDialogControls();

    // Listen to game events
    gameEventBus.on("game:save", () => {
      this.saveGameState();
    });

    // Listen to volume changes from UI
    gameEventBus.on("menu:volume-change", (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "volume" in payload &&
        typeof payload.volume === "number"
      ) {
        this.audioSystem?.setMusicVolume(payload.volume);
      }
    });

    // Listen to audio toggle events
    gameEventBus.on("audio:toggle-mute", () => {
      this.audioSystem?.toggleMute();
      const isMuted = this.audioSystem?.isMutedState() || false;
      gameEventBus.emit("audio:mute-state-changed", { isMuted });
    });

    // Emit initial mute state after audio system is initialized
    this.time.delayedCall(100, () => {
      const isMuted = this.audioSystem?.isMutedState() || false;
      gameEventBus.emit("audio:mute-state-changed", { isMuted });
    });
  }

  private setupMenuDialogControls(): void {
    const spaceKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    const enterKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );

    spaceKey?.on("down", () => {
      if (this.chatSystem?.isOpen()) return;
      if (this.dialogSystem?.isVisible()) {
        this.dialogSystem.handleAdvance();
        gameEventBus.emit("dialog:advance");
      } else {
        this.menuSystem?.toggleMenu();
      }
    });

    enterKey?.on("down", () => {
      if (this.chatSystem?.isOpen()) return;
      if (this.dialogSystem?.isVisible()) {
        this.dialogSystem.handleAdvance();
        gameEventBus.emit("dialog:advance");
      } else if (!this.menuSystem?.isOpen()) {
        this.menuSystem?.toggleMenu();
      }
    });
  }

  private setupInputHandling(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.chatSystem?.shouldBlockInput()) {
        if (this.chatSystem.isOpen()) {
          const chatBounds = this.chatSystem.getChatBounds();
          if (chatBounds) {
            const screenX = pointer.x;
            const screenY = pointer.y;

            if (
              screenX < chatBounds.x ||
              screenX > chatBounds.x + chatBounds.width ||
              screenY < chatBounds.y ||
              screenY > chatBounds.y + chatBounds.height
            ) {
              return;
            }
          } else {
            return;
          }
        } else {
          return;
        }
      }
    });
  }

  private setupDebugControls(): void {
    let tileInfoMode = false;
    this.input.keyboard?.on("keydown-T", () => {
      tileInfoMode = !tileInfoMode;
      debugLog(
        `Tile info mode: ${
          tileInfoMode ? "ON" : "OFF"
        }. Click on tiles to see their GID.`,
      );
    });

    // Day/night toggle for testing
    this.input.keyboard?.on("keydown-N", () => {
      this.dayNightSystem?.toggle();
      const timeOfDay = this.dayNightSystem?.getTimeOfDay() || "day";
      debugLog(`Time of day: ${timeOfDay.toUpperCase()}`);
    });

    // Weather test mode toggle
    this.input.keyboard?.on("keydown-W", () => {
      this.weatherEffectsSystem?.toggleTestMode();
      const isTestMode =
        this.weatherEffectsSystem?.isTestModeEnabled() || false;
      debugLog(`Weather test mode: ${isTestMode ? "ON" : "OFF"}`);
      if (isTestMode) {
        debugLog("Weather will cycle every 5 seconds");
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!tileInfoMode || !this.gameMap) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      const layersToCheck = ["Below Player", "World", "Above Player"];
      layersToCheck.forEach((layerName) => {
        const layer = this.gameMap?.getLayer(layerName);
        if (!layer) return;

        const tile = layer.tilemapLayer?.getTileAtWorldXY(worldX, worldY);
        if (tile && tile.index !== null && tile.index !== -1) {
          // Get the correct tileset for this tile
          const tileset = tile.tileset;
          const firstGID = tileset?.firstgid || 1;

          // Calculate the correct GID using the tile's actual tileset
          // tile.index is the local index within the tileset, so we add firstgid to get the global GID
          const tileGID = tile.index + firstGID;

          const tileX = Math.floor(worldX / (this.gameMap?.tileWidth || 0));
          const tileY = Math.floor(worldY / (this.gameMap?.tileHeight || 0));

          debugLog(`\n=== Tile Info ===`);
          debugLog(`Layer: ${layerName}`);
          debugLog(`Position: (${tileX}, ${tileY})`);
          debugLog(`Tile Index (local): ${tile.index}`);
          debugLog(`Tileset: ${tileset?.name || "unknown"}`);
          debugLog(`Tileset firstGID: ${firstGID}`);
          debugLog(`Tile GID (Global ID): ${tileGID}`);
          debugLog(`Collides: ${tile.collides || false}`);
          if (tile.properties) {
            debugLog(`Properties:`, tile.properties);
          }
          debugLog(`\n=== Summary ===`);
          debugLog(`Tile GID: ${tileGID}`);
        }
      });
    });

    this.input.keyboard?.once("keydown", (event: KeyboardEvent) => {
      if (
        (event.key === "d" || event.key === "D") &&
        (event.metaKey || event.ctrlKey)
      ) {
        this.physics.world.createDebugGraphic();

        const worldLayer = this.gameMap?.getLayer("World");
        if (worldLayer) {
          const graphics = this.add.graphics().setAlpha(0.75).setDepth(20);
          worldLayer.tilemapLayer?.renderDebug(graphics, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255),
          });
        }
      }
    });
  }

  update(): void {
    // Don't update player movement if menu, dialog, or chat is open
    if (
      !this.player ||
      this.menuSystem?.isOpen() ||
      this.dialogSystem?.isVisible() ||
      this.chatSystem?.isOpen() ||
      this.inventorySystem?.isOpen() ||
      this.isTransitioning
    ) {
      if (this.player) {
        this.player.stop();
      }
      return;
    }

    this.player.update();

    // Update chat system with player position
    if (this.player) {
      this.chatSystem?.updatePlayerPosition(this.player.getPosition());
      this.chatSystem?.checkStatueProximity();
    }

    // Update progress bars visibility based on proximity
    this.collectionSystem?.updateProgressBarsVisibility();

    // Update all animals movement
    this.animalSystem?.update();

    // Update loot dispersion system
    this.lootDispersionSystem?.update();

    // Update day/night system overlay
    this.dayNightSystem?.update();

    // Update lighting system
    this.lightingSystem?.update();

    // Update weather effects
    this.weatherEffectsSystem?.update();

    // Check for available actions and emit events
    this.checkAndEmitAvailableActions();

    // Periodically save player position (throttled)
    const now = Date.now();
    if (now - this.lastSaveTime > MIN_SAVE_INTERVAL * 2) {
      // Save position every 4 seconds if player is moving
      if (this.player.isMoving()) {
        this.saveGameState();
      }
    }
  }

  /**
   * Check for available actions and emit events to UI
   */
  private checkAndEmitAvailableActions(): void {
    if (
      this.menuSystem?.isOpen() ||
      this.dialogSystem?.isVisible() ||
      this.chatSystem?.isOpen() ||
      this.inventorySystem?.isOpen()
    ) {
      // Don't show actions when UI is open
      gameEventBus.emit("action:unavailable");
      return;
    }

    // First check for animal interaction (priority)
    const nearbyAnimal = this.animalSystem?.checkAnimalProximity();
    if (nearbyAnimal) {
      const animalName = this.formatAnimalName(nearbyAnimal.config.key);
      gameEventBus.emit("action:available", {
        action: `hit ${animalName}`,
        key: "x",
      });
      return;
    }

    // Then check for tile collection
    const collectableData = this.collectionSystem?.checkTileProximity();
    if (collectableData) {
      const item = ITEM_TYPES.find((i) => i.id === collectableData.itemId);
      const itemName = item?.name || collectableData.itemId;
      gameEventBus.emit("action:available", {
        action: `collect ${itemName}`,
        key: "x",
      });
      return;
    }

    // No actions available
    gameEventBus.emit("action:unavailable");
  }

  /**
   * Format animal key to readable name (e.g., "miniBunny" -> "Bunny")
   */
  private formatAnimalName(animalKey: string): string {
    // Remove "mini" prefix and capitalize first letter
    const name = animalKey.replace(/^mini/, "");
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private setupCollectionControls(): void {
    const collectKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.X,
    );

    collectKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible() ||
        this.inventorySystem?.isOpen()
      ) {
        return;
      }

      // First check for animal interaction
      const nearbyAnimal = this.animalSystem?.checkAnimalProximity();
      if (nearbyAnimal) {
        this.animalSystem?.hitAnimal(nearbyAnimal);
        this.audioSystem?.playHitSound();
        return;
      }

      // Then check for tile collection
      const collectableData = this.collectionSystem?.checkTileProximity();
      if (
        collectableData &&
        this.collectionSystem &&
        this.tileManagementSystem
      ) {
        this.collectionSystem.collectItem(
          collectableData.itemId,
          collectableData.tileX,
          collectableData.tileY,
          (tileX, tileY) => {
            this.tileManagementSystem?.hideTile(tileX, tileY);
          },
        );
      }
    });
  }

  private setupTreeSpawningControls(): void {
    const spawnTreeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.B,
    );

    spawnTreeKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible() ||
        this.inventorySystem?.isOpen()
      ) {
        return;
      }

      this.tileManagementSystem?.spawnTree();
    });
  }

  /**
   * Setup scene transition controls
   */
  private setupSceneTransitionControls(): void {
    // "s" key to switch scenes (fallback)
    const sKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    sKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible() ||
        this.inventorySystem?.isOpen() ||
        this.isTransitioning
      ) {
        return;
      }
      // Debug key - only works if player is at stairs spawn point
      if (this.isPlayerAtStairsSpawnPoint()) {
        this.handleSceneTransition("NoAnimalsScene");
      }
    });

    // Check for stairs interaction
    this.time.addEvent({
      delay: 100,
      callback: this.checkStairsProximity,
      loop: true,
    });
  }

  /**
   * Find stairs spawn point in the current map
   */
  private findStairsSpawnPoint(): Phaser.Types.Tilemaps.TiledObject | null {
    if (!this.gameMap) return null;

    const stairsSpawnPoint = this.gameMap.findObject(
      "Objects",
      (obj) => obj.name === "Stairs Spawn Point",
    );

    return stairsSpawnPoint || null;
  }

  /**
   * Check if player is at the stairs spawn point location
   */
  private isPlayerAtStairsSpawnPoint(): boolean {
    if (!this.player || !this.gameMap) return false;

    const stairsSpawnPoint = this.findStairsSpawnPoint();
    if (
      !stairsSpawnPoint ||
      stairsSpawnPoint.x === undefined ||
      stairsSpawnPoint.y === undefined
    ) {
      return false;
    }

    const playerPos = this.player.getPosition();
    const proximityDistance = 32; // pixels - allow some tolerance

    const distance = Math.sqrt(
      (playerPos.x - stairsSpawnPoint.x) ** 2 +
        (playerPos.y - stairsSpawnPoint.y) ** 2,
    );

    return distance <= proximityDistance;
  }

  /**
   * Check if player is on stairs tile and at stairs spawn point, then trigger transition
   */
  private checkStairsProximity = (): void => {
    if (
      !this.player ||
      !this.gameMap ||
      !this.worldLayer ||
      this.isTransitioning
    ) {
      return;
    }

    // First check if player is at the stairs spawn point location
    if (!this.isPlayerAtStairsSpawnPoint()) {
      return;
    }

    const playerPos = this.player.getPosition();
    const tileWidth = this.gameMap.tileWidth || 32;
    const tileHeight = this.gameMap.tileHeight || 32;

    // Get the tile the player is on
    const tileX = Math.floor(playerPos.x / tileWidth);
    const tileY = Math.floor(playerPos.y / tileHeight);

    const tile = this.worldLayer.getTileAt(tileX, tileY);
    if (!tile || tile.index === null || tile.index === -1) {
      return;
    }

    // Check if tile has "stairs" property
    const hasStairsProperty =
      getTileProperty(tile, "stairs") !== undefined ||
      getTileProperty(tile, "scene-transition") !== undefined;

    // Check if player is moving up (climbing stairs)
    const isMovingUp =
      this.cursors?.up.isDown || this.virtualCursors?.up.isDown;

    // Trigger transition only if at stairs spawn point, on stairs tile, and moving up
    if (hasStairsProperty && isMovingUp) {
      this.handleSceneTransition("NoAnimalsScene");
    }
  };

  /**
   * Handle scene transition - isolated logic for scene changes
   * Only triggers when player is at stairs spawn point
   */
  private handleSceneTransition(targetSceneKey: string): void {
    if (this.isTransitioning) return;

    // Double-check that player is at stairs spawn point before transitioning
    if (!this.isPlayerAtStairsSpawnPoint()) {
      return;
    }

    this.isTransitioning = true;

    // Save current state before transitioning
    this.saveGameState();

    // Get player direction for the transition
    const playerDirection = this.player?.getDirection() || "down";

    // Execute the transition (target scene will use its own stairs spawn point)
    this.executeSceneTransition(targetSceneKey, 0, 0, playerDirection);
  }

  /**
   * Execute the actual scene transition with fade effect
   * Target scene will use its own stairs spawn point when fromScene is set
   */
  private executeSceneTransition(
    sceneKey: string,
    spawnX: number,
    spawnY: number,
    playerDirection: string,
  ): void {
    // Fade out (0.33s)
    this.cameras.main.fadeOut(333, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        // Keep black screen (0.34s)
        this.time.delayedCall(340, () => {
          // Start next scene with fade in
          // Target scene will detect fromScene and use its own stairs spawn point
          this.scene.start(sceneKey, {
            playerX: spawnX,
            playerY: spawnY,
            playerDirection,
            fromScene: this.scene.key,
          });
        });
      },
    );
  }

  private setupTileInfoHover(): void {
    // Set up mouse move handler to detect tiles with "info" property
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.handleTileInfoHover(pointer);
    });

    // Set up mouse out handler to hide popup
    this.input.on("pointerout", () => {
      this.hideTileInfoPopup();
      this.hoveredTileInfo = null;
    });

    // Set up "a" key handler to show info in dialog
    const aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    aKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible() ||
        this.inventorySystem?.isOpen()
      ) {
        return;
      }

      if (this.hoveredTileInfo) {
        this.showTileInfoInDialog(this.hoveredTileInfo.info);
      }
    });
  }

  private handleTileInfoHover(pointer: Phaser.Input.Pointer): void {
    if (!this.gameMap || !this.worldLayer) return;

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const tile = this.worldLayer.getTileAtWorldXY(worldX, worldY);
    if (!tile || tile.index === null || tile.index === -1) {
      this.hideTileInfoPopup();
      this.hoveredTileInfo = null;
      return;
    }

    // Check if tile has "info" property
    const infoText = getTileProperty(tile, "info");

    if (infoText) {
      const tileX = tile.x;
      const tileY = tile.y;
      this.hoveredTileInfo = { tileX, tileY, info: infoText };
      this.showTileInfoPopup(tileX, tileY);
    } else {
      this.hideTileInfoPopup();
      this.hoveredTileInfo = null;
    }
  }

  private showTileInfoPopup(tileX: number, tileY: number): void {
    if (!this.gameMap) return;

    const tileWidth = this.gameMap.tileWidth || 32;
    const tileHeight = this.gameMap.tileHeight || 32;

    // Calculate world position (center of tile)
    const worldX = tileX * tileWidth + tileWidth / 2;
    const worldY = tileY * tileHeight + tileHeight / 2;

    // Create or update popup
    if (!this.tileInfoPopup) {
      this.tileInfoPopup = this.add.container(
        worldX,
        worldY - tileHeight / 2 - 8,
      );
      this.tileInfoPopup.setDepth(20); // Above tiles but below player

      // Popup dimensions
      const popupSize = 24;
      const padding = 4;

      // Background (similar to progress bar)
      const background = this.add.rectangle(
        0,
        0,
        popupSize + padding * 2,
        popupSize + padding * 2,
        0x000000,
        0.9,
      );
      background.setStrokeStyle(1, 0x333333, 1);
      this.tileInfoPopup.add(background);

      // Info icon (simple "i" text or graphics)
      const infoIcon = this.add.graphics();
      infoIcon.lineStyle(2, 0x4ecdc4, 1);
      // Draw "i" icon - circle with dot
      infoIcon.strokeCircle(0, 0, popupSize / 2 - 2);
      infoIcon.fillStyle(0x4ecdc4, 1);
      infoIcon.fillCircle(0, -popupSize / 4, 2);
      this.tileInfoPopup.add(infoIcon);
    } else {
      // Update position
      this.tileInfoPopup.setPosition(worldX, worldY - tileHeight / 2 - 8);
    }

    this.tileInfoPopup.setVisible(true);
  }

  private hideTileInfoPopup(): void {
    if (this.tileInfoPopup) {
      this.tileInfoPopup.setVisible(false);
    }
  }

  private showTileInfoInDialog(infoText: string): void {
    if (!this.dialogSystem) return;

    // Show info text in dialog box with typing effect
    this.dialogSystem.showDialog(infoText);
  }

  private setupInventoryControls(): void {
    const inventoryKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.I,
    );

    inventoryKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible()
      ) {
        return;
      }
      this.inventorySystem?.toggleInventory();
    });
  }

  /**
   * Setup crafting keyboard controls
   */
  private setupCraftingKeyboardControls(): void {
    const craftingKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.C,
    );

    craftingKey?.on("down", () => {
      if (
        this.chatSystem?.isOpen() ||
        this.menuSystem?.isOpen() ||
        this.dialogSystem?.isVisible() ||
        this.inventorySystem?.isOpen()
      ) {
        return;
      }
      gameEventBus.emit("crafting:toggle");
    });
  }

  /**
   * Setup crafting system event handlers
   */
  private setupCraftingControls(): void {
    // Listen for craft requests from UI
    gameEventBus.on("crafting:craft", (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "recipeId" in payload &&
        typeof payload.recipeId === "string"
      ) {
        const { recipeId } = payload as { recipeId: string };
        if (this.craftingSystem) {
          const result = this.craftingSystem.craft(recipeId);
          if (result.success) {
            this.scheduleSave();
            // TODO: Play craft sound effect here
            // Example: this.audioSystem?.playCraftSound();
          } else {
            // Emit failure event if needed
            gameEventBus.emit("crafting:failure", {
              recipeId,
              message: result.message,
            });
          }
        }
      }
    });

    // Listen for can-craft check requests from UI
    gameEventBus.on("crafting:check", (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "recipeId" in payload &&
        typeof payload.recipeId === "string"
      ) {
        const { recipeId } = payload as { recipeId: string };
        if (this.craftingSystem) {
          const canCraft = this.craftingSystem.canCraft(recipeId);
          gameEventBus.emit("crafting:can-craft", {
            recipeId,
            canCraft,
          });
        }
      }
    });
  }
}
