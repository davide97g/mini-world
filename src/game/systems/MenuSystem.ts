import Phaser from "phaser";
import { MENU_ENTRIES } from "../config/GameConstants";
import { MENU_DIALOG_TEXTS } from "../config/MenuConfig";

export class MenuSystem {
  private scene: Phaser.Scene;
  private isMenuOpen = false;
  private selectedMenuIndex = 0;
  private menuContainer: Phaser.GameObjects.Container | null = null;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private onMenuSelect?: (text: string, speaker?: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initMenu();
  }

  private initMenu(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const menuWidth = 192;
    const menuX = width - menuWidth - 16;
    const menuY = 16;

    this.menuContainer = this.scene.add.container(menuX, menuY);
    this.menuContainer.setScrollFactor(0);
    this.menuContainer.setDepth(50);
    this.menuContainer.setVisible(false);

    const bg = this.scene.add.rectangle(
      menuWidth / 2,
      0,
      menuWidth,
      height - 32,
      0xcccccc,
      0.85
    );
    bg.setStrokeStyle(2, 0x808080);
    this.menuContainer.add(bg);

    this.menuTexts = [];
    const entryHeight = 24;
    const padding = 12;
    const startY = padding;

    MENU_ENTRIES.forEach((entry, index) => {
      const y = startY + index * entryHeight;
      const entryText = this.scene.add.text(padding, y, entry, {
        font: "16px monospace",
        color: "#ffffff",
        align: "left",
      });
      entryText.setOrigin(0, 0);
      entryText.setPadding(4, 4, 4, 4);
      this.menuContainer!.add(entryText);
      this.menuTexts.push(entryText);
    });

    this.setupKeyboardControls();
  }

  private setupKeyboardControls(): void {
    const spaceKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    const enterKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    spaceKey.on("down", () => {
      if (this.isMenuOpen) {
        this.toggleMenu();
      }
    });

    this.scene.input.keyboard!.on("keydown-UP", () => {
      if (this.isMenuOpen) {
        this.selectedMenuIndex =
          this.selectedMenuIndex > 0
            ? this.selectedMenuIndex - 1
            : MENU_ENTRIES.length - 1;
        this.updateMenuSelection();
      }
    });

    this.scene.input.keyboard!.on("keydown-DOWN", () => {
      if (this.isMenuOpen) {
        this.selectedMenuIndex =
          this.selectedMenuIndex < MENU_ENTRIES.length - 1
            ? this.selectedMenuIndex + 1
            : 0;
        this.updateMenuSelection();
      }
    });

    enterKey.on("down", () => {
      if (this.isMenuOpen) {
        const selectedEntry = MENU_ENTRIES[this.selectedMenuIndex];
        this.handleMenuSelect(selectedEntry);
      }
    });
  }

  public toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.menuContainer) {
      this.menuContainer.setVisible(this.isMenuOpen);
    }

    if (this.isMenuOpen) {
      this.selectedMenuIndex = 0;
      this.updateMenuSelection();
    }
  }

  private updateMenuSelection(): void {
    this.menuTexts.forEach((text, index) => {
      const entryName = MENU_ENTRIES[index];
      if (index === this.selectedMenuIndex) {
        text.setFill("#ffffff");
        text.setBackgroundColor("#666666");
        if (!text.text.startsWith("►")) {
          text.setText("► " + entryName);
        }
      } else {
        text.setFill("#ffffff");
        text.setBackgroundColor("");
        if (text.text.startsWith("►")) {
          text.setText(entryName);
        }
      }
    });
  }

  private handleMenuSelect(entry: string): void {
    this.isMenuOpen = false;
    if (this.menuContainer) {
      this.menuContainer.setVisible(false);
    }

    if (this.onMenuSelect) {
      const speaker = entry === "Red" ? undefined : entry;
      const dialogText = MENU_DIALOG_TEXTS[entry] || `${entry} selected.`;
      this.onMenuSelect(dialogText, speaker);
    }
  }

  public isOpen(): boolean {
    return this.isMenuOpen;
  }

  public setOnMenuSelect(callback: (text: string, speaker?: string) => void): void {
    this.onMenuSelect = callback;
  }
}

