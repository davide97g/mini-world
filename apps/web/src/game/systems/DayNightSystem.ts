/**
 * Day/Night System - Handles day/night cycle and dark overlay
 */

import type Phaser from "phaser";

export type TimeOfDay = "day" | "night";

export class DayNightSystem {
  private scene: Phaser.Scene;
  private timeOfDay: TimeOfDay = "day";
  private overlay?: Phaser.GameObjects.Rectangle;
  camera?: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public init(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.camera = camera;

    // Create dark overlay rectangle
    // Use game width/height for full screen coverage
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Create overlay with dark blue/black color and opacity
    this.overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000033, // Dark blue color
      0.7, // Opacity
    );

    // Set high depth to render above all game elements
    this.overlay.setDepth(15);

    // Set scroll factor to 0 so it stays fixed to screen (not world)
    this.overlay.setScrollFactor(0);

    // Initially hide overlay (day mode)
    this.overlay.setVisible(false);
  }

  public toggle(): void {
    if (this.timeOfDay === "day") {
      this.setTimeOfDay("night");
    } else {
      this.setTimeOfDay("day");
    }
  }

  public setTimeOfDay(time: TimeOfDay): void {
    this.timeOfDay = time;
    this.updateOverlay();
  }

  public getTimeOfDay(): TimeOfDay {
    return this.timeOfDay;
  }

  public update(): void {
    // Update overlay position and size if screen size changes
    if (this.overlay) {
      const width = this.scene.scale.width;
      const height = this.scene.scale.height;
      this.overlay.setPosition(width / 2, height / 2);
      this.overlay.setSize(width, height);
    }
  }

  private updateOverlay(): void {
    if (!this.overlay) return;

    // Show overlay during night, hide during day
    this.overlay.setVisible(this.timeOfDay === "night");
  }

  public shutdown(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }
  }
}
