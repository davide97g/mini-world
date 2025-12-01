import Phaser from "phaser";
import { PLAYER_SPEED } from "../config/GameConstants";

export class Player {
  private sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ) {
    this.scene = scene;
    this.cursors = cursors;

    // Create a sprite with physics enabled
    this.sprite = scene.physics.add
      .sprite(x, y, "atlas", "misa-front")
      .setSize(30, 40)
      .setOffset(0, 24);

    this.createAnimations();
  }

  private createAnimations(): void {
    const anims = this.scene.anims;
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
  }

  public getSprite(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    return this.sprite;
  }

  public update(): void {
    if (!this.cursors) return;

    const prevVelocity = this.sprite.body.velocity.clone();

    // Stop any previous movement from the last frame
    this.sprite.body.setVelocity(0);

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.sprite.body.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right.isDown) {
      this.sprite.body.setVelocityX(PLAYER_SPEED);
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.sprite.body.setVelocityY(-PLAYER_SPEED);
    } else if (this.cursors.down.isDown) {
      this.sprite.body.setVelocityY(PLAYER_SPEED);
    }

    // Normalize and scale the velocity so that player can't move faster along a diagonal
    this.sprite.body.velocity.normalize().scale(PLAYER_SPEED);

    // Update the animation last
    if (this.cursors.left.isDown) {
      this.sprite.anims.play("misa-left-walk", true);
    } else if (this.cursors.right.isDown) {
      this.sprite.anims.play("misa-right-walk", true);
    } else if (this.cursors.up.isDown) {
      this.sprite.anims.play("misa-back-walk", true);
    } else if (this.cursors.down.isDown) {
      this.sprite.anims.play("misa-front-walk", true);
    } else {
      this.sprite.anims.stop();

      // If we were moving, pick an idle frame to use
      if (prevVelocity.x < 0) this.sprite.setTexture("atlas", "misa-left");
      else if (prevVelocity.x > 0)
        this.sprite.setTexture("atlas", "misa-right");
      else if (prevVelocity.y < 0) this.sprite.setTexture("atlas", "misa-back");
      else if (prevVelocity.y > 0)
        this.sprite.setTexture("atlas", "misa-front");
    }
  }

  public stop(): void {
    this.sprite.body.setVelocity(0);
    this.sprite.anims.stop();
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}

