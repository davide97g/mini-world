/**
 * Inventory System - Handles inventory UI, items, and management
 */

import type Phaser from "phaser";
import {
  INVENTORY_SLOT_CONFIG,
  type InventoryItem,
  type InventorySlot,
  ITEM_TYPES,
} from "../config/GameConstants";

export class InventorySystem {
  private scene: Phaser.Scene;
  private inventoryContainer?: Phaser.GameObjects.Container;
  private isInventoryOpen = false;
  private inventorySlots: InventorySlot[] = [];
  private inventoryItems: Map<string, InventoryItem> = new Map();
  private hotbarSlots: InventorySlot[] = [];
  private tooltipContainer?: Phaser.GameObjects.Container;
  private inventoryRecapContainer?: Phaser.GameObjects.Container;
  private onInventoryChange?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setOnInventoryChange(callback: () => void): void {
    this.onInventoryChange = callback;
  }

  public init(): void {
    // Initialize inventory items map with empty quantities
    ITEM_TYPES.forEach((item) => {
      this.inventoryItems.set(item.id, { ...item, quantity: 0 });
    });
  }

  public createInventoryUI(): void {
    const mainCamera = this.scene.cameras.main;
    const panelWidth = mainCamera.width * 0.6;
    const panelHeight = mainCamera.height * 0.55;

    const centerX = mainCamera.width / 2;
    const centerY = mainCamera.height / 2;

    const container = this.scene.add.container(centerX, centerY);
    container.setScrollFactor(0);
    container.setDepth(150);

    const background = this.scene.add.rectangle(
      0,
      0,
      panelWidth,
      panelHeight,
      0x000000,
      0.55,
    );
    background.setStrokeStyle(3, 0xffffff, 0.4);
    container.add(background);

    const headerHeight = 64;
    const headerBackground = this.scene.add.rectangle(
      0,
      -panelHeight / 2 + headerHeight / 2,
      panelWidth * 0.55,
      headerHeight,
      0x18181b,
      0.95,
    );
    headerBackground.setStrokeStyle(2, 0xffffff, 0.5);
    container.add(headerBackground);

    const titleText = this.scene.add.text(0, headerBackground.y, "INVENTORY", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    const { columns, rows, slotSize, slotPadding } = INVENTORY_SLOT_CONFIG;
    const gridWidth = columns * slotSize + (columns - 1) * slotPadding;
    const gridHeight = rows * slotSize + (rows - 1) * slotPadding;

    const gridStartX = -gridWidth / 2 + slotSize / 2;
    const gridStartY = -gridHeight / 2 + headerHeight;

    // Create main inventory slots
    this.inventorySlots = [];
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const slotX = gridStartX + columnIndex * (slotSize + slotPadding);
        const slotY = gridStartY + rowIndex * (slotSize + slotPadding);

        const slotBackground = this.scene.add.rectangle(
          slotX,
          slotY,
          slotSize,
          slotSize,
          0x18181b,
          0.9,
        );
        slotBackground.setStrokeStyle(2, 0xffffff, 0.25);
        container.add(slotBackground);

        this.inventorySlots.push({
          background: slotBackground,
        });
      }
    }

    // Create hotbar slots
    const hotbarY = panelHeight / 2 - 72;
    const hotbarColumns = 8;
    const hotbarSlotSize = 56;
    const hotbarPadding = 10;
    const hotbarWidth =
      hotbarColumns * hotbarSlotSize + (hotbarColumns - 1) * hotbarPadding;
    const hotbarStartX = -hotbarWidth / 2 + hotbarSlotSize / 2;

    this.hotbarSlots = [];
    for (let hotbarIndex = 0; hotbarIndex < hotbarColumns; hotbarIndex += 1) {
      const hotbarX =
        hotbarStartX + hotbarIndex * (hotbarSlotSize + hotbarPadding);
      const hotbarSlot = this.scene.add.rectangle(
        hotbarX,
        hotbarY,
        hotbarSlotSize,
        hotbarSlotSize,
        0x0f172a,
        0.95,
      );
      hotbarSlot.setStrokeStyle(2, 0xffffff, 0.3);
      container.add(hotbarSlot);

      this.hotbarSlots.push({
        background: hotbarSlot,
      });
    }

    container.setVisible(false);
    this.inventoryContainer = container;
    this.createTooltip();
    this.updateInventoryDisplay();
  }

  public createInventoryRecap(): void {
    const padding = 16;
    const itemWidth = 200;

    const container = this.scene.add.container(padding + itemWidth / 2, 0);
    container.setScrollFactor(0);
    container.setDepth(100);
    this.inventoryRecapContainer = container;

    this.updateInventoryRecap();
  }

  private updateInventoryRecap(): void {
    if (!this.inventoryRecapContainer) return;

    // Clear existing children
    this.inventoryRecapContainer.removeAll(true);

    // Get all items with quantity > 0
    const itemsWithQuantity: InventoryItem[] = [];
    this.inventoryItems.forEach((item) => {
      if (item.quantity > 0) {
        itemsWithQuantity.push({ ...item });
      }
    });

    if (itemsWithQuantity.length === 0) {
      return;
    }

    const itemHeight = 48;
    const itemWidth = 200;
    const itemSpacing = 4;
    const iconSize = 32;
    const padding = 8;
    const bottomPadding = 16;

    // Calculate container Y position so items align from bottom of camera
    const totalHeight =
      itemsWithQuantity.length * itemHeight +
      (itemsWithQuantity.length - 1) * itemSpacing;
    const containerY =
      this.scene.cameras.main.height - bottomPadding - totalHeight / 2;
    this.inventoryRecapContainer.setY(containerY);

    // Calculate starting Y position (bottom-up, relative to container center)
    let currentY = -totalHeight / 2 + itemHeight / 2;

    itemsWithQuantity.forEach((item) => {
      // Background (black with rounded corners)
      const radius = 8;
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x000000, 0.5);
      graphics.lineStyle(2, 0xffffff, 0.3);

      // Draw rounded rectangle
      graphics.fillRoundedRect(
        -itemWidth / 2,
        currentY - itemHeight / 2,
        itemWidth,
        itemHeight,
        radius,
      );
      graphics.strokeRoundedRect(
        -itemWidth / 2,
        currentY - itemHeight / 2,
        itemWidth,
        itemHeight,
        radius,
      );

      this.inventoryRecapContainer?.add(graphics);

      // Item icon
      const iconX = -itemWidth / 2 + padding + iconSize / 2;
      if (this.scene.textures.exists(item.id)) {
        const itemIcon = this.scene.add.image(iconX, currentY, item.id);
        itemIcon.setDisplaySize(iconSize, iconSize);
        this.inventoryRecapContainer?.add(itemIcon);
      } else {
        const itemIcon = this.scene.add.rectangle(
          iconX,
          currentY,
          iconSize,
          iconSize,
          item.color,
          1,
        );
        itemIcon.setStrokeStyle(2, 0xffffff, 0.3);
        this.inventoryRecapContainer?.add(itemIcon);
      }

      // Quantity and name text (icon x quantity name)
      const textX = iconX + iconSize / 2 + padding;
      const quantityText = this.scene.add.text(
        textX,
        currentY,
        `x${item.quantity} ${item.name}`,
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        },
      );
      quantityText.setOrigin(0, 0.5);
      this.inventoryRecapContainer?.add(quantityText);

      currentY += itemHeight + itemSpacing;
    });
  }

  private createTooltip(): void {
    if (!this.inventoryContainer) return;

    const tooltipContainer = this.scene.add.container(0, 0);
    tooltipContainer.setDepth(1); // Relative depth within inventory
    tooltipContainer.setVisible(false);

    // Background
    const background = this.scene.add.rectangle(0, 0, 150, 40, 0x18181b, 0.95);
    background.setStrokeStyle(2, 0xffffff, 0.5);
    background.setOrigin(0, 0);
    tooltipContainer.add(background);

    // Text
    const text = this.scene.add.text(8, 8, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    text.setOrigin(0, 0);
    tooltipContainer.add(text);

    // Add tooltip as child of inventory container
    this.inventoryContainer.add(tooltipContainer);
    this.tooltipContainer = tooltipContainer;
  }

  private showTooltip(x: number, y: number, item: InventoryItem): void {
    if (!this.tooltipContainer || !this.inventoryContainer) {
      return;
    }

    const tooltipText = `${item.name} x${item.quantity}`;
    const textObject = this.tooltipContainer.list[1] as Phaser.GameObjects.Text;
    const background = this.tooltipContainer
      .list[0] as Phaser.GameObjects.Rectangle;

    textObject.setText(tooltipText);

    // Adjust background size to fit text
    const textWidth = textObject.width;
    const textHeight = textObject.height;
    background.setSize(textWidth + 16, textHeight + 16);

    // Position tooltip relative to inventory container (since it's now a child)
    // x and y are already relative to the inventory container
    this.tooltipContainer.setPosition(x + 10, y - 50);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip(): void {
    if (!this.tooltipContainer) return;
    this.tooltipContainer.setVisible(false);
  }

  public updateInventoryDisplay(): void {
    if (!this.inventoryContainer) return;

    // Clear existing item containers and event listeners
    this.inventorySlots.forEach((slot) => {
      // Remove event listeners
      if (slot.background) {
        slot.background.removeAllListeners();
      }
      if (slot.itemContainer) {
        slot.itemContainer.destroy();
        slot.itemContainer = undefined;
      }
      slot.item = undefined;
    });

    this.hotbarSlots.forEach((slot) => {
      // Remove event listeners
      if (slot.background) {
        slot.background.removeAllListeners();
      }
      if (slot.itemContainer) {
        slot.itemContainer.destroy();
        slot.itemContainer = undefined;
      }
      slot.item = undefined;
    });

    // Get all items with quantity > 0
    const itemsWithQuantity: InventoryItem[] = [];
    this.inventoryItems.forEach((item) => {
      if (item.quantity > 0) {
        itemsWithQuantity.push({ ...item });
      }
    });

    // Display items in main inventory slots
    itemsWithQuantity.forEach((item, index) => {
      if (index >= this.inventorySlots.length) return;

      const slot = this.inventorySlots[index];
      const slotX = slot.background.x;
      const slotY = slot.background.y;
      const slotSize = slot.background.width;

      const itemContainer = this.scene.add.container(slotX, slotY);
      itemContainer.setScrollFactor(0);
      itemContainer.setDepth(151);

      // Item icon
      const itemSize = slotSize * 0.7;

      // Check if texture exists, otherwise fallback to color
      if (this.scene.textures.exists(item.id)) {
        const itemIcon = this.scene.add.image(0, 0, item.id);
        itemIcon.setDisplaySize(itemSize, itemSize);
        itemContainer.add(itemIcon);
      } else {
        const itemIcon = this.scene.add.rectangle(
          0,
          0,
          itemSize,
          itemSize,
          item.color,
          1,
        );
        itemIcon.setStrokeStyle(2, 0xffffff, 0.3);
        itemContainer.add(itemIcon);
      }

      // Quantity text
      if (item.quantity > 1) {
        const quantityText = this.scene.add.text(
          slotSize / 2 - 4,
          slotSize / 2 - 4,
          item.quantity.toString(),
          {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3,
            align: "right",
          },
        );
        quantityText.setOrigin(1, 1);
        itemContainer.add(quantityText);
      }

      this.inventoryContainer?.add(itemContainer);
      slot.itemContainer = itemContainer;
      slot.item = item;

      // Add hover events for tooltip
      slot.background.setInteractive({ useHandCursor: true });
      slot.background.on("pointerover", () => {
        this.showTooltip(slot.background.x, slot.background.y, item);
      });
      slot.background.on("pointerout", () => {
        this.hideTooltip();
      });
    });

    // Display first 8 items in hotbar
    itemsWithQuantity.slice(0, 8).forEach((item, index) => {
      if (index >= this.hotbarSlots.length) return;

      const slot = this.hotbarSlots[index];
      const slotX = slot.background.x;
      const slotY = slot.background.y;
      const slotSize = slot.background.width;

      const itemContainer = this.scene.add.container(slotX, slotY);
      itemContainer.setScrollFactor(0);
      itemContainer.setDepth(151);

      // Item icon
      const itemSize = slotSize * 0.7;

      // Check if texture exists, otherwise fallback to color
      if (this.scene.textures.exists(item.id)) {
        const itemIcon = this.scene.add.image(0, 0, item.id);
        itemIcon.setDisplaySize(itemSize, itemSize);
        itemContainer.add(itemIcon);
      } else {
        const itemIcon = this.scene.add.rectangle(
          0,
          0,
          itemSize,
          itemSize,
          item.color,
          1,
        );
        itemIcon.setStrokeStyle(2, 0xffffff, 0.3);
        itemContainer.add(itemIcon);
      }

      // Quantity text
      if (item.quantity > 1) {
        const quantityText = this.scene.add.text(
          slotSize / 2 - 4,
          slotSize / 2 - 4,
          item.quantity.toString(),
          {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
            align: "right",
          },
        );
        quantityText.setOrigin(1, 1);
        itemContainer.add(quantityText);
      }

      this.inventoryContainer?.add(itemContainer);
      slot.itemContainer = itemContainer;
      slot.item = item;

      // Add hover events for tooltip
      slot.background.setInteractive({ useHandCursor: true });
      slot.background.on("pointerover", () => {
        this.showTooltip(slot.background.x, slot.background.y, item);
      });
      slot.background.on("pointerout", () => {
        this.hideTooltip();
      });
    });

    // Update inventory recap
    this.updateInventoryRecap();
  }

  public addItem(itemId: string, quantity: number = 1): void {
    const item = this.inventoryItems.get(itemId);
    if (item) {
      item.quantity += quantity;
      this.updateInventoryDisplay();
      if (this.onInventoryChange) {
        this.onInventoryChange();
      }
    }
  }

  public removeItem(itemId: string, quantity: number = 1): boolean {
    const item = this.inventoryItems.get(itemId);
    if (item && item.quantity >= quantity) {
      item.quantity -= quantity;
      this.updateInventoryDisplay();
      if (this.onInventoryChange) {
        this.onInventoryChange();
      }
      return true;
    }
    return false;
  }

  public getItemQuantity(itemId: string): number {
    const item = this.inventoryItems.get(itemId);
    return item?.quantity || 0;
  }

  public toggleInventory(): void {
    if (!this.inventoryContainer) {
      return;
    }

    this.isInventoryOpen = !this.isInventoryOpen;
    this.inventoryContainer.setVisible(this.isInventoryOpen);
  }

  public isOpen(): boolean {
    return this.isInventoryOpen;
  }

  public getInventoryData(): Record<string, number> {
    const inventory: Record<string, number> = {};
    this.inventoryItems.forEach((item, itemId) => {
      if (item.quantity > 0) {
        inventory[itemId] = item.quantity;
      }
    });
    return inventory;
  }

  public loadInventoryData(inventory: Record<string, number>): void {
    Object.entries(inventory).forEach(([itemId, quantity]) => {
      const item = this.inventoryItems.get(itemId);
      if (item) {
        item.quantity = quantity;
      }
    });
    this.updateInventoryDisplay();
  }

  public getInventoryItems(): Map<string, InventoryItem> {
    return this.inventoryItems;
  }
}
