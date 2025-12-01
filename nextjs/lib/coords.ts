export const TILE_SIZE = 256;

// Isometric tile dimensions (2:1 ratio)
export const ISO_TILE_WIDTH = 32;
export const ISO_TILE_HEIGHT = 16;

export function latLonToPixel(lat: number, lon: number, zoom: number) {
  const scale = Math.pow(2, zoom) * TILE_SIZE;

  const x = ((lon + 180) / 360) * scale;

  const y = (
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2
  ) * scale;

  return { x, y };
}

export function latLonToTile(lat: number, lon: number, zoom: number) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2 * Math.pow(2, zoom)
  );
  return { x, y };
}

/**
 * Convert world coordinates to isometric screen coordinates
 * @param worldX - X position in world grid
 * @param worldY - Y position in world grid
 * @returns Isometric screen coordinates
 */
export function worldToIso(worldX: number, worldY: number) {
  const isoX = (worldX - worldY) * (ISO_TILE_WIDTH / 2);
  const isoY = (worldX + worldY) * (ISO_TILE_HEIGHT / 2);
  return { isoX, isoY };
}

/**
 * Convert isometric screen coordinates back to world coordinates
 * @param isoX - Isometric X position
 * @param isoY - Isometric Y position
 * @returns World grid coordinates
 */
export function isoToWorld(isoX: number, isoY: number) {
  const worldX = (isoX / (ISO_TILE_WIDTH / 2) + isoY / (ISO_TILE_HEIGHT / 2)) / 2;
  const worldY = (isoY / (ISO_TILE_HEIGHT / 2) - isoX / (ISO_TILE_WIDTH / 2)) / 2;
  return { worldX, worldY };
}

