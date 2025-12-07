/**
 * Lighting System - Handles player-centered lighting using Phaser's LightsPlugin
 * Uses hardware-accelerated shaders for optimal performance
 * Creates a spotlight effect: player appears normal, everything else is darker
 */

import Phaser from "phaser";
import { LIGHTING_CONFIG } from "../config/GameConstants";

export interface LightingConfig {
  enabled: boolean;
  radiusInTiles: number;
  shadowColor: number;
  shadowAlpha: number;
  smoothTransition: boolean;
  transitionWidth: number; // Not used with Phaser lights, kept for compatibility
}

export class LightingSystem {
  private scene: Phaser.Scene;
  private config: LightingConfig;
  private player?: { getPosition: () => { x: number; y: number } };
  private tileWidth: number = 32;
  private playerLight?: Phaser.GameObjects.Light;
  private worldLayer?: Phaser.Tilemaps.TilemapLayer;
  private aboveLayer?: Phaser.Tilemaps.TilemapLayer;

  constructor(scene: Phaser.Scene, config?: Partial<LightingConfig>) {
    this.scene = scene;
    this.config = { ...LIGHTING_CONFIG, ...config };
  }

  public init(
    player: { getPosition: () => { x: number; y: number } },
    gameMap?: Phaser.Tilemaps.Tilemap | null,
    worldLayer?: Phaser.Tilemaps.TilemapLayer,
    aboveLayer?: Phaser.Tilemaps.TilemapLayer,
  ): void {
    this.player = player;
    this.worldLayer = worldLayer;
    this.aboveLayer = aboveLayer;

    // Get tile dimensions
    if (gameMap) {
      this.tileWidth = gameMap.tileWidth || 32;
    }

    if (!this.config.enabled) {
      return;
    }

    this.createLighting();
  }

  private createLighting(): void {
    // Enable the Lights Manager (disabled by default)
    this.scene.lights.enable();

    // Set ambient color to dark - this makes everything dark by default
    // The light around player will brighten only the area, not the player itself
    // Convert shadowAlpha (0-1) to RGB darkness
    // shadowAlpha 0.2 means 20% darkening, so ambient should be 80% brightness
    const ambientBrightness = Math.floor(255 * (1 - this.config.shadowAlpha));
    const ambientColor = Phaser.Display.Color.GetColor(
      ambientBrightness,
      ambientBrightness,
      ambientBrightness,
    );
    this.scene.lights.setAmbientColor(ambientColor);

    // Calculate light radius in pixels
    const lightRadius = this.config.radiusInTiles * this.tileWidth;

    // Get initial player position
    const playerPos = this.player?.getPosition() || { x: 0, y: 0 };

    // Create a white light at player position
    // This light will brighten the area around the player
    // The player sprite itself won't have the pipeline, so it appears normal
    this.playerLight = this.scene.lights.addLight(
      playerPos.x,
      playerPos.y,
      lightRadius,
      0xffffff, // White light
      1, // Full intensity
    );

    // Apply Light2D pipeline to tilemap layers so they are affected by lights
    // This makes the world darker except where the light shines
    if (this.worldLayer) {
      this.worldLayer.setPipeline("Light2D");
    }
    if (this.aboveLayer) {
      this.aboveLayer.setPipeline("Light2D");
    }
  }

  /**
   * Apply Light2D pipeline to a sprite (e.g., animals)
   * This makes them affected by the lighting system
   */
  public applyPipelineToSprite(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setPipeline("Light2D");
  }

  public update(): void {
    if (!this.config.enabled || !this.player || !this.playerLight) {
      return;
    }

    // Update light position to follow player
    const playerPos = this.player.getPosition();
    this.playerLight.x = playerPos.x;
    this.playerLight.y = playerPos.y;
  }

  public setConfig(config: Partial<LightingConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.enabled && !this.playerLight) {
      this.createLighting();
    } else if (!this.config.enabled && this.playerLight) {
      this.shutdown();
    } else if (this.playerLight) {
      // Update ambient color if shadowAlpha changed
      const ambientBrightness = Math.floor(255 * (1 - this.config.shadowAlpha));
      const ambientColor = Phaser.Display.Color.GetColor(
        ambientBrightness,
        ambientBrightness,
        ambientBrightness,
      );
      this.scene.lights.setAmbientColor(ambientColor);

      // Update light radius if radiusInTiles changed
      const lightRadius = this.config.radiusInTiles * this.tileWidth;
      this.playerLight.radius = lightRadius;
    }
  }

  public getConfig(): LightingConfig {
    return { ...this.config };
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled && !this.playerLight) {
      this.createLighting();
    } else if (!enabled && this.playerLight) {
      this.shutdown();
    } else if (this.scene.lights) {
      if (enabled) {
        this.scene.lights.enable();
      } else {
        this.scene.lights.disable();
      }
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setRadius(radiusInTiles: number): void {
    this.config.radiusInTiles = radiusInTiles;
    if (this.playerLight) {
      const lightRadius = radiusInTiles * this.tileWidth;
      this.playerLight.radius = lightRadius;
    }
  }

  public getRadius(): number {
    return this.config.radiusInTiles;
  }

  public shutdown(): void {
    if (this.playerLight) {
      this.scene.lights.removeLight(this.playerLight);
      this.playerLight = undefined;
    }
    if (this.scene.lights) {
      this.scene.lights.disable();
    }
  }
}
