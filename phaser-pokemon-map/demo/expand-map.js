const fs = require("fs");
const path = require("path");

// Read the original map
const originalMapPath = path.join(
  __dirname,
  "../assets/tilemaps/tuxemon-town.json"
);
const originalMap = JSON.parse(fs.readFileSync(originalMapPath, "utf8"));

// Create expanded map
const expandedMap = JSON.parse(JSON.stringify(originalMap));

// Update main dimensions
const expansionFactor = 10;
expandedMap.width = originalMap.width * expansionFactor;
expandedMap.height = originalMap.height * expansionFactor;

// Expand each tile layer
expandedMap.layers.forEach((layer, layerIndex) => {
  if (layer.type === "tilelayer" && layer.data) {
    const originalWidth = layer.width;
    const originalHeight = layer.height;
    const originalData = layer.data;

    // Create new expanded data array
    const expandedData = [];
    const expandedWidth = originalWidth * expansionFactor;
    const expandedHeight = originalHeight * expansionFactor;

    // Tile the original map row by row
    // For each row in the expanded map
    for (let expandedY = 0; expandedY < expandedHeight; expandedY++) {
      // Calculate which row in the original map this corresponds to
      const originalY = expandedY % originalHeight;

      // For each column in the expanded map
      for (let expandedX = 0; expandedX < expandedWidth; expandedX++) {
        // Calculate which column in the original map this corresponds to
        const originalX = expandedX % originalWidth;

        // Get the tile value from the original map
        const originalIndex = originalY * originalWidth + originalX;
        expandedData.push(originalData[originalIndex]);
      }
    }

    // Update layer properties
    layer.width = expandedWidth;
    layer.height = expandedHeight;
    layer.data = expandedData;
  }

  // Expand object layer positions
  if (layer.type === "objectgroup" && layer.objects) {
    layer.objects.forEach((obj) => {
      // Scale object positions by expansion factor
      if (obj.x !== undefined) obj.x = obj.x * expansionFactor;
      if (obj.y !== undefined) obj.y = obj.y * expansionFactor;
      if (obj.width !== undefined) obj.width = obj.width * expansionFactor;
      if (obj.height !== undefined) obj.height = obj.height * expansionFactor;
    });
  }
});

// Save the expanded map (compact format for better performance)
const expandedMapPath = path.join(
  __dirname,
  "../assets/tilemaps/tuxemon-town-expanded.json"
);
fs.writeFileSync(expandedMapPath, JSON.stringify(expandedMap));

console.log(
  `Map expanded from ${originalMap.width}x${originalMap.height} to ${expandedMap.width}x${expandedMap.height}`
);
console.log(`Expanded map saved to: ${expandedMapPath}`);
