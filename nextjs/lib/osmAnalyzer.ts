/**
 * OSM Tile Analyzer
 * Analyzes OSM tile pixels to determine terrain types for isometric rendering
 */

export type TerrainType = 'water' | 'road' | 'building' | 'park' | 'grass';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Get RGB values from ImageData at a specific pixel
 */
function getPixelColor(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2]
  };
}

/**
 * Calculate color distance between two RGB colors
 */
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * OSM color definitions (approximate)
 */
const OSM_COLORS = {
  water: [
    { r: 170, g: 211, b: 223 }, // #aad3df
    { r: 181, g: 208, b: 208 }, // #b5d0d0
    { r: 153, g: 204, b: 255 }, // Light blue
  ],
  road: [
    { r: 255, g: 255, b: 255 }, // White roads
    { r: 249, g: 249, b: 249 }, // #f9f9f9
    { r: 224, g: 224, b: 224 }, // Gray roads
    { r: 252, g: 214, b: 164 }, // Brown roads
  ],
  building: [
    { r: 218, g: 208, b: 201 }, // Beige
    { r: 239, g: 219, b: 174 }, // Light brown
    { r: 200, g: 200, b: 200 }, // Gray
  ],
  park: [
    { r: 200, g: 250, b: 204 }, // #c8facc
    { r: 155, g: 230, b: 158 }, // #9be69e
    { r: 205, g: 235, b: 176 }, // Light green
  ]
};

/**
 * Analyze a pixel from OSM tile to determine terrain type
 */
export function analyzeOSMPixel(imageData: ImageData, x: number, y: number): TerrainType {
  // Ensure coordinates are within bounds
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return 'grass';
  }

  const pixel = getPixelColor(imageData, x, y);
  
  // Check for water (blue tones)
  if (pixel.b > pixel.r + 20 && pixel.b > pixel.g + 10) {
    return 'water';
  }
  
  // Check against known OSM colors
  let minDistance = Infinity;
  let bestMatch: TerrainType = 'grass';
  
  // Check water colors
  for (const waterColor of OSM_COLORS.water) {
    const distance = colorDistance(pixel, waterColor);
    if (distance < minDistance && distance < 50) {
      minDistance = distance;
      bestMatch = 'water';
    }
  }
  
  // Check road colors (high brightness, low saturation)
  for (const roadColor of OSM_COLORS.road) {
    const distance = colorDistance(pixel, roadColor);
    if (distance < minDistance && distance < 40) {
      minDistance = distance;
      bestMatch = 'road';
    }
  }
  
  // Check building colors
  for (const buildingColor of OSM_COLORS.building) {
    const distance = colorDistance(pixel, buildingColor);
    if (distance < minDistance && distance < 45) {
      minDistance = distance;
      bestMatch = 'building';
    }
  }
  
  // Check park colors (green tones)
  for (const parkColor of OSM_COLORS.park) {
    const distance = colorDistance(pixel, parkColor);
    if (distance < minDistance && distance < 50) {
      minDistance = distance;
      bestMatch = 'park';
    }
  }
  
  // Alternative park detection: green dominant
  if (pixel.g > pixel.r + 15 && pixel.g > pixel.b + 15) {
    return 'park';
  }
  
  return bestMatch;
}

/**
 * Analyze an OSM tile canvas and create a terrain map
 * Returns a 2D array of terrain types
 */
export function analyzeOSMTile(
  canvas: HTMLCanvasElement,
  gridWidth: number = 8,
  gridHeight: number = 8
): TerrainType[][] {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const terrainMap: TerrainType[][] = [];
  
  const cellWidth = canvas.width / gridWidth;
  const cellHeight = canvas.height / gridHeight;
  
  for (let y = 0; y < gridHeight; y++) {
    terrainMap[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      // Sample the center of each grid cell
      const sampleX = Math.floor(x * cellWidth + cellWidth / 2);
      const sampleY = Math.floor(y * cellHeight + cellHeight / 2);
      
      terrainMap[y][x] = analyzeOSMPixel(imageData, sampleX, sampleY);
    }
  }
  
  return terrainMap;
}
