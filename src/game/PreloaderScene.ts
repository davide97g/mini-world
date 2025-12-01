import Phaser from "phaser";

export class PreloaderScene extends Phaser.Scene {
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressBox?: Phaser.GameObjects.Graphics;
  private loadingText?: Phaser.GameObjects.Text;
  private percentText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "PreloaderScene" });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Set background color (dark pixel art style)
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Create pixel art pattern background
    this.createPixelPattern(width, height);

    // Create progress bar container dimensions
    const barWidth = 400;
    const barHeight = 32;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    // Create progress box (background)
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x0e1621, 1);
    this.progressBox.fillRect(barX, barY, barWidth, barHeight);

    // Create pixel art style border (thick border with inner highlight)
    const border = this.add.graphics();
    // Outer border (dark)
    border.fillStyle(0x000000, 1);
    border.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    // Inner border (light)
    border.fillStyle(0xffffff, 1);
    border.fillRect(barX, barY, barWidth, barHeight);
    // Inner shadow
    border.fillStyle(0x0e1621, 1);
    border.fillRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4);

    // Create progress bar (foreground)
    this.progressBar = this.add.graphics();

    // Create loading text with pixel art style
    this.loadingText = this.add.text(
      width / 2,
      barY - 60,
      "Loading your mini world...",
      {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      }
    );
    this.loadingText.setOrigin(0.5, 0.5);

    // Create percent text with pixel art style
    this.percentText = this.add.text(width / 2, barY + barHeight + 30, "0%", {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#4ecdc4",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.percentText.setOrigin(0.5, 0.5);

    // Start fake loading animation
    this.startFakeLoading(barX, barY, barWidth, barHeight);
  }

  private createPixelPattern(width: number, height: number): void {
    const pattern = this.add.graphics();
    const pixelSize = 8;
    const patternColor = 0x16213e;

    // Create a subtle pixel pattern
    for (let y = 0; y < height; y += pixelSize * 2) {
      for (let x = 0; x < width; x += pixelSize * 2) {
        pattern.fillStyle(patternColor, 0.3);
        pattern.fillRect(x, y, pixelSize, pixelSize);
        pattern.fillRect(x + pixelSize, y + pixelSize, pixelSize, pixelSize);
      }
    }
  }

  private startFakeLoading(
    barX: number,
    barY: number,
    barWidth: number,
    barHeight: number
  ): void {
    const duration = 2000; // 2 seconds
    const updateInterval = 16; // ~60fps updates
    const totalUpdates = duration / updateInterval;
    let currentProgress = 0;
    const progressIncrement = 100 / totalUpdates;

    const updateProgress = () => {
      currentProgress += progressIncrement;

      if (currentProgress > 100) {
        currentProgress = 100;
      }

      // Clear and redraw progress bar with pixel art style
      this.progressBar?.clear();

      const fillWidth = ((barWidth - 4) * currentProgress) / 100;

      // Main progress bar fill (teal)
      this.progressBar?.fillStyle(0x4ecdc4, 1);
      this.progressBar?.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

      // Add highlight for pixel art effect
      if (fillWidth > 4) {
        this.progressBar?.fillStyle(0x6ee5d8, 1);
        this.progressBar?.fillRect(
          barX + 2,
          barY + 2,
          fillWidth,
          Math.max(2, (barHeight - 4) / 4)
        );
      }

      // Update percent text
      this.percentText?.setText(`${Math.floor(currentProgress)}%`);

      if (currentProgress >= 100) {
        // Add a small delay before transitioning
        this.time.delayedCall(200, () => {
          this.scene.start("GameScene");
        });
      } else {
        // Continue updating
        this.time.delayedCall(updateInterval, updateProgress);
      }
    };

    // Start the progress animation
    this.time.delayedCall(updateInterval, updateProgress);
  }
}
