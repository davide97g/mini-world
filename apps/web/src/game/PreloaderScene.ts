import Phaser from "phaser";

interface PreloaderUI {
  progressBar?: Phaser.GameObjects.Graphics;
  progressBox?: Phaser.GameObjects.Graphics;
  loadingText?: Phaser.GameObjects.Text;
  percentText?: Phaser.GameObjects.Text;
}

interface PreloaderConfig {
  barWidth: number;
  barHeight: number;
  duration: number;
  updateInterval: number;
  backgroundColor: number;
  patternColor: number;
  barColor: number;
  barHighlightColor: number;
}

const PRELOADER_CONFIG: PreloaderConfig = {
  barWidth: 400,
  barHeight: 32,
  duration: 2000,
  updateInterval: 16,
  backgroundColor: 0x1a1a2e,
  patternColor: 0x16213e,
  barColor: 0x4ecdc4,
  barHighlightColor: 0x6ee5d8,
};

export class PreloaderScene extends Phaser.Scene {
  private ui: PreloaderUI = {};

  constructor() {
    super({ key: "PreloaderScene" });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor(PRELOADER_CONFIG.backgroundColor);
    this.createPixelPattern(width, height);
    this.createProgressUI(width, height);
    this.startFakeLoading();
  }

  private createPixelPattern(width: number, height: number): void {
    const pattern = this.add.graphics();
    const pixelSize = 8;
    const patternColor = PRELOADER_CONFIG.patternColor;

    for (let y = 0; y < height; y += pixelSize * 2) {
      for (let x = 0; x < width; x += pixelSize * 2) {
        pattern.fillStyle(patternColor, 0.3);
        pattern.fillRect(x, y, pixelSize, pixelSize);
        pattern.fillRect(x + pixelSize, y + pixelSize, pixelSize, pixelSize);
      }
    }
  }

  private createProgressUI(width: number, height: number): void {
    const { barWidth, barHeight } = PRELOADER_CONFIG;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    // Create progress box (background)
    this.ui.progressBox = this.add.graphics();
    this.ui.progressBox.fillStyle(0x0e1621, 1);
    this.ui.progressBox.fillRect(barX, barY, barWidth, barHeight);

    // Create pixel art style border
    this.createProgressBorder(barX, barY, barWidth, barHeight);

    // Create progress bar (foreground)
    this.ui.progressBar = this.add.graphics();

    // Create loading text
    this.ui.loadingText = this.add.text(
      width / 2,
      barY - 60,
      "Loading your mini world...",
      {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      },
    );
    this.ui.loadingText.setOrigin(0.5, 0.5);

    // Create percent text
    this.ui.percentText = this.add.text(
      width / 2,
      barY + barHeight + 30,
      "0%",
      {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#4ecdc4",
        stroke: "#000000",
        strokeThickness: 3,
      },
    );
    this.ui.percentText.setOrigin(0.5, 0.5);
  }

  private createProgressBorder(
    barX: number,
    barY: number,
    barWidth: number,
    barHeight: number,
  ): void {
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
  }

  private startFakeLoading(): void {
    const { barWidth, barHeight, duration, updateInterval } = PRELOADER_CONFIG;
    const { width, height } = this.cameras.main;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    const totalUpdates = duration / updateInterval;
    let currentProgress = 0;
    const progressIncrement = 100 / totalUpdates;

    const updateProgress = () => {
      currentProgress += progressIncrement;

      if (currentProgress > 100) {
        currentProgress = 100;
      }

      this.updateProgressBar(barX, barY, barWidth, barHeight, currentProgress);
      this.ui.percentText?.setText(`${Math.floor(currentProgress)}%`);

      if (currentProgress >= 100) {
        this.time.delayedCall(200, () => {
          this.scene.start("GameScene");
        });
      } else {
        this.time.delayedCall(updateInterval, updateProgress);
      }
    };

    this.time.delayedCall(updateInterval, updateProgress);
  }

  private updateProgressBar(
    barX: number,
    barY: number,
    barWidth: number,
    barHeight: number,
    progress: number,
  ): void {
    this.ui.progressBar?.clear();

    const fillWidth = ((barWidth - 4) * progress) / 100;

    // Main progress bar fill
    this.ui.progressBar?.fillStyle(PRELOADER_CONFIG.barColor, 1);
    this.ui.progressBar?.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

    // Add highlight for pixel art effect
    if (fillWidth > 4) {
      this.ui.progressBar?.fillStyle(PRELOADER_CONFIG.barHighlightColor, 1);
      this.ui.progressBar?.fillRect(
        barX + 2,
        barY + 2,
        fillWidth,
        Math.max(2, (barHeight - 4) / 4),
      );
    }
  }
}
