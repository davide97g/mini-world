/**
 * Tile utility functions
 */

import type Phaser from "phaser";

/**
 * Helper to get a property value from a tile
 */
export const getTileProperty = (
  tile: Phaser.Tilemaps.Tile,
  propertyName: string,
): string | null => {
  if (!tile.properties) return null;

  if (Array.isArray(tile.properties)) {
    const property = tile.properties.find(
      (prop: { name: string; value: unknown }) => prop.name === propertyName,
    );
    if (property && typeof property.value === "string") {
      return property.value;
    }
  } else if (
    typeof tile.properties === "object" &&
    propertyName in tile.properties
  ) {
    const value = (tile.properties as Record<string, unknown>)[propertyName];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
};
