/**
 * Collection System - Handles item collection, progress bars, and notifications
 */

import type Phaser from "phaser";
import type { InventoryItem } from "../config/GameConstants";
import {
  COLLECTION_LIMITS,
  COLLECTION_PROXIMITY_DISTANCE,
} from "../config/GameConstants";
import { debugLog, debugWarn } from "../utils/DebugUtils";
import { getTileProperty } from "../utils/TileUtils";

export class CollectionSystem {
  private scene: Phaser.Scene;
  private gameMap: Phaser.Tilemaps.Tilemap | null = null;
  protected worldLayer?: Phaser.Tilemaps.TilemapLayer;
  private player?: { getPosition: () => { x: number; y: number } };
  private inventoryItems: Map<string, InventoryItem>;
  private onItemCollected?: (itemId: string, quantity: number) => void;
  private onCollectionCountChanged?: () => void;
  private onPlayHitSound?: () => void;

  // Tile collection tracking
  private tileCollectionCounts: Map<string, number> = new Map();
  private tileProgressBars: Map<string, Phaser.GameObjects.Container> =
    new Map();
  private nearbyTiles: Set<string> = new Set();
  private collectionNotifications: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene, inventoryItems: Map<string, InventoryItem>) {
    this.scene = scene;
    this.inventoryItems = inventoryItems;
  }

  public setGameMap(gameMap: Phaser.Tilemaps.Tilemap | null): void {
    this.gameMap = gameMap;
  }

  public setWorldLayer(worldLayer?: Phaser.Tilemaps.TilemapLayer): void {
    this.worldLayer = worldLayer;
  }

  public setPlayer(player: {
    getPosition: () => { x: number; y: number };
  }): void {
    this.player = player;
  }

  public setOnItemCollected(
    callback: (itemId: string, quantity: number) => void,
  ): void {
    this.onItemCollected = callback;
  }

  public setOnCollectionCountChanged(callback: () => void): void {
    this.onCollectionCountChanged = callback;
  }

  public setOnPlayHitSound(callback: () => void): void {
    this.onPlayHitSound = callback;
  }

  public checkTileProximity(): {
    itemId: string;
    tileX: number;
    tileY: number;
  } | null {
    if (!this.player || !this.gameMap) return null;

    const playerPos = this.player.getPosition();
    const tileWidth = this.gameMap.tileWidth || 32;
    const tileHeight = this.gameMap.tileHeight || 32;

    // Get the tile the player is on or near
    const tileX = Math.floor(playerPos.x / tileWidth);
    const tileY = Math.floor(playerPos.y / tileHeight);

    // Check tiles in a 3x3 area around the player
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const checkX = tileX + dx;
        const checkY = tileY + dy;

        const worldX = checkX * tileWidth + tileWidth / 2;
        const worldY = checkY * tileHeight + tileHeight / 2;

        const distance = Math.sqrt(
          (playerPos.x - worldX) ** 2 + (playerPos.y - worldY) ** 2,
        );

        if (distance <= COLLECTION_PROXIMITY_DISTANCE) {
          // Check if this tile exists and is collectible
          const worldLayer = this.gameMap.getLayer("World");
          if (worldLayer?.tilemapLayer) {
            const tile = worldLayer.tilemapLayer.getTileAt(checkX, checkY);
            if (tile && tile.index !== null && tile.index !== -1) {
              // Check if tile is already hidden (collected max times)
              const tileKey = `${checkX},${checkY}`;
              const collectionCount =
                this.tileCollectionCounts.get(tileKey) || 0;

              // Get collectable item type to check limit
              let itemId: string | null = null;
              const collectableValue = getTileProperty(tile, "collectable");
              if (collectableValue) {
                itemId = collectableValue;
              }

              // Check if tile has reached its collection limit
              if (itemId) {
                const limit = COLLECTION_LIMITS.get(itemId) || Infinity;
                if (collectionCount >= limit) {
                  continue; // Skip hidden tiles
                }
              }

              // Check for collectable property
              if (itemId) {
                return {
                  itemId,
                  tileX: checkX,
                  tileY: checkY,
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  public collectItem(
    itemId: string,
    tileX: number,
    tileY: number,
    onHideTile: (tileX: number, tileY: number) => void,
  ): void {
    // Check if the item type exists in inventory
    if (!this.inventoryItems.has(itemId)) {
      debugWarn(`Unknown collectable item type: ${itemId}`);
      return;
    }

    const tileKey = `${tileX},${tileY}`;
    const currentCount = this.tileCollectionCounts.get(tileKey) || 0;
    const newCount = currentCount + 1;

    // Update collection count
    this.tileCollectionCounts.set(tileKey, newCount);

    if (this.onCollectionCountChanged) {
      this.onCollectionCountChanged();
    }

    // Get collection limit for this item type
    const limit = COLLECTION_LIMITS.get(itemId) || Infinity;

    // Update progress bar if item has a limit
    if (limit !== Infinity) {
      this.updateProgressBar(tileX, tileY, itemId, newCount, limit);
    }

    // If reached limit, hide the tile and remove progress bar
    if (newCount >= limit) {
      onHideTile(tileX, tileY);
      this.removeProgressBar(tileKey);
      this.nearbyTiles.delete(tileKey);
      debugLog(
        `${itemId} at (${tileX}, ${tileY}) disappeared after ${limit} collections`,
      );
    }

    if (this.onItemCollected) {
      this.onItemCollected(itemId, 1);
    }

    this.showCollectionNotification(itemId, 1);
    if (this.onPlayHitSound) {
      this.onPlayHitSound();
    }
    debugLog(`Collected 1x ${itemId}`);
  }

  private updateProgressBar(
    tileX: number,
    tileY: number,
    _itemId: string,
    collectionCount: number,
    limit: number,
  ): void {
    if (!this.gameMap) return;

    const tileKey = `${tileX},${tileY}`;
    const tileWidth = this.gameMap.tileWidth || 32;
    const tileHeight = this.gameMap.tileHeight || 32;

    // Calculate world position (center of tile)
    const worldX = tileX * tileWidth + tileWidth / 2;
    const worldY = tileY * tileHeight + tileHeight / 2;

    // Calculate remaining percentage
    const remainingPercentage = ((limit - collectionCount) / limit) * 100;

    // Check if progress bar already exists
    let progressBarContainer = this.tileProgressBars.get(tileKey);

    if (!progressBarContainer) {
      // Create new progress bar container
      progressBarContainer = this.scene.add.container(
        worldX,
        worldY - tileHeight / 2 - 8,
      );
      progressBarContainer.setDepth(20); // Above tiles but below player
      progressBarContainer.setVisible(false); // Hidden by default, shown when in proximity
      this.tileProgressBars.set(tileKey, progressBarContainer);

      // Progress bar dimensions
      const barWidth = tileWidth * 0.8;
      const barHeight = 4;
      const padding = 2;

      // Background (black)
      const background = this.scene.add.rectangle(
        0,
        0,
        barWidth + padding * 2,
        barHeight + padding * 2,
        0x000000,
        0.9,
      );
      background.setStrokeStyle(1, 0x333333, 1);
      progressBarContainer.add(background);

      // Foreground (red) - will be updated
      const foreground = this.scene.add.rectangle(
        -barWidth / 2 + padding,
        0,
        barWidth - padding * 2,
        barHeight,
        0xff0000,
        1,
      );
      foreground.setOrigin(0, 0.5);
      progressBarContainer.add(foreground);

      // Store reference to foreground for updates
      (
        progressBarContainer as Phaser.GameObjects.Container & {
          foregroundBar?: Phaser.GameObjects.Rectangle;
        }
      ).foregroundBar = foreground;
    }

    // Update progress bar width based on remaining percentage
    const foregroundBar = (
      progressBarContainer as Phaser.GameObjects.Container & {
        foregroundBar?: Phaser.GameObjects.Rectangle;
      }
    ).foregroundBar;

    if (foregroundBar) {
      const barWidth = (this.gameMap.tileWidth || 32) * 0.8;
      const padding = 2;
      const maxWidth = barWidth - padding * 2;
      const currentWidth = (remainingPercentage / 100) * maxWidth;

      foregroundBar.setSize(Math.max(0, currentWidth), 4);
    }
  }

  public updateProgressBarsVisibility(): void {
    if (!this.player || !this.gameMap) return;

    const playerPos = this.player.getPosition();
    const tileWidth = this.gameMap.tileWidth || 32;
    const tileHeight = this.gameMap.tileHeight || 32;
    const tileX = Math.floor(playerPos.x / tileWidth);
    const tileY = Math.floor(playerPos.y / tileHeight);

    // Track which tiles are currently in proximity
    const currentNearbyTiles = new Set<string>();

    // Check tiles in a 3x3 area around the player
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const checkX = tileX + dx;
        const checkY = tileY + dy;

        const worldX = checkX * tileWidth + tileWidth / 2;
        const worldY = checkY * tileHeight + tileHeight / 2;

        const distance = Math.sqrt(
          (playerPos.x - worldX) ** 2 + (playerPos.y - worldY) ** 2,
        );

        if (distance <= COLLECTION_PROXIMITY_DISTANCE) {
          const tileKey = `${checkX},${checkY}`;
          const collectionCount = this.tileCollectionCounts.get(tileKey) || 0;

          // Check if this tile is collectable and not exhausted
          const worldLayer = this.gameMap.getLayer("World");
          if (worldLayer?.tilemapLayer) {
            const tile = worldLayer.tilemapLayer.getTileAt(checkX, checkY);
            if (tile && tile.index !== null && tile.index !== -1) {
              // Get item type
              const itemId = getTileProperty(tile, "collectable");

              // Check if item has a collection limit and hasn't reached it
              if (itemId) {
                const limit = COLLECTION_LIMITS.get(itemId) || Infinity;
                // Only show progress bar if item has a limit, hasn't reached it, and tile is visible
                if (
                  limit !== Infinity &&
                  collectionCount < limit &&
                  tile.alpha > 0
                ) {
                  currentNearbyTiles.add(tileKey);

                  // Create progress bar if it doesn't exist
                  if (!this.tileProgressBars.has(tileKey)) {
                    this.updateProgressBar(
                      checkX,
                      checkY,
                      itemId,
                      collectionCount,
                      limit,
                    );
                  }

                  // Show progress bar
                  const progressBar = this.tileProgressBars.get(tileKey);
                  if (progressBar) {
                    progressBar.setVisible(true);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Hide progress bars that are no longer in proximity
    this.tileProgressBars.forEach((progressBar, tileKey) => {
      if (!currentNearbyTiles.has(tileKey)) {
        progressBar.setVisible(false);
      }
    });

    this.nearbyTiles = currentNearbyTiles;
  }

  private removeProgressBar(tileKey: string): void {
    const progressBar = this.tileProgressBars.get(tileKey);
    if (progressBar) {
      progressBar.destroy();
      this.tileProgressBars.delete(tileKey);
    }
  }

  private showCollectionNotification(itemId: string, quantity: number): void {
    const item = this.inventoryItems.get(itemId);
    if (!item) return;

    const padding = 16;
    const notificationWidth = 200;
    const notificationHeight = 60;
    const itemImageSize = 40;
    const spacing = 8; // Space between notifications

    // Calculate Y position based on existing notifications
    const startY = padding + notificationHeight / 2;
    const notificationY =
      startY +
      this.collectionNotifications.length * (notificationHeight + spacing);

    // Create notification container
    const notificationContainer = this.scene.add.container(
      padding + notificationWidth / 2,
      notificationY,
    );
    notificationContainer.setScrollFactor(0);
    notificationContainer.setDepth(200);

    // Shadow background (darker, offset) with rounded corners
    const shadowOffset = 3;
    const radius = 8;
    const shadowGraphics = this.scene.add.graphics();
    shadowGraphics.fillStyle(0x000000, 0.6);
    shadowGraphics.fillRoundedRect(
      shadowOffset - notificationWidth / 2,
      shadowOffset - notificationHeight / 2,
      notificationWidth,
      notificationHeight,
      radius,
    );
    notificationContainer.add(shadowGraphics);

    // Main background with rounded corners
    const backgroundGraphics = this.scene.add.graphics();
    backgroundGraphics.fillStyle(0x000000, 0.5);
    backgroundGraphics.lineStyle(2, 0xffffff, 0.3);
    backgroundGraphics.fillRoundedRect(
      -notificationWidth / 2,
      -notificationHeight / 2,
      notificationWidth,
      notificationHeight,
      radius,
    );
    backgroundGraphics.strokeRoundedRect(
      -notificationWidth / 2,
      -notificationHeight / 2,
      notificationWidth,
      notificationHeight,
      radius,
    );
    notificationContainer.add(backgroundGraphics);

    // Item image
    const itemImageX = -notificationWidth / 2 + itemImageSize / 2 + 12;
    if (this.scene.textures.exists(itemId)) {
      const itemImage = this.scene.add.image(itemImageX, 0, itemId);
      itemImage.setDisplaySize(itemImageSize, itemImageSize);
      notificationContainer.add(itemImage);
    } else {
      const itemImage = this.scene.add.rectangle(
        itemImageX,
        0,
        itemImageSize,
        itemImageSize,
        item.color,
        1,
      );
      itemImage.setStrokeStyle(2, 0xffffff, 0.3);
      notificationContainer.add(itemImage);
    }

    // Item name and quantity text
    const textX = itemImageX + itemImageSize / 2 + 12;
    const itemText = this.scene.add.text(textX, -8, item.name, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    itemText.setOrigin(0, 0.5);
    notificationContainer.add(itemText);

    const quantityText = this.scene.add.text(textX, 8, `x${quantity}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
      stroke: "#000000",
      strokeThickness: 2,
    });
    quantityText.setOrigin(0, 0.5);
    notificationContainer.add(quantityText);

    // Add to notifications array
    this.collectionNotifications.push(notificationContainer);

    // Remove notification after 1 second
    this.scene.time.delayedCall(1000, () => {
      this.removeCollectionNotification(notificationContainer);
    });
  }

  private removeCollectionNotification(
    notification: Phaser.GameObjects.Container,
  ): void {
    const index = this.collectionNotifications.indexOf(notification);
    if (index === -1) return;

    // Remove from array
    this.collectionNotifications.splice(index, 1);

    // Destroy the notification
    notification.destroy();

    // Update positions of remaining notifications
    this.updateNotificationPositions();
  }

  private updateNotificationPositions(): void {
    const padding = 16;
    const notificationHeight = 60;
    const spacing = 8;
    const startY = padding + notificationHeight / 2;

    this.collectionNotifications.forEach((notification, index) => {
      const newY = startY + index * (notificationHeight + spacing);
      this.scene.tweens.add({
        targets: notification,
        y: newY,
        duration: 200,
        ease: "Power2",
      });
    });
  }

  public getTileCollectionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.tileCollectionCounts.forEach((count, tileKey) => {
      counts[tileKey] = count;
    });
    return counts;
  }

  public loadTileCollectionCounts(counts: Record<string, number>): void {
    this.tileCollectionCounts.clear();
    Object.entries(counts).forEach(([tileKey, count]) => {
      this.tileCollectionCounts.set(tileKey, count);
    });
  }

  public shutdown(): void {
    // Clean up progress bars
    this.tileProgressBars.forEach((progressBar) => {
      progressBar.destroy();
    });
    this.tileProgressBars.clear();

    // Clean up notifications
    this.collectionNotifications.forEach((notification) => {
      notification.destroy();
    });
    this.collectionNotifications = [];
  }
}
