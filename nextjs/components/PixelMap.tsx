"use client";

import { ISO_TILE_HEIGHT, ISO_TILE_WIDTH, latLonToPixel, TILE_SIZE, worldToIso } from "@/lib/coords";
import { analyzeOSMTile, TerrainType } from "@/lib/osmAnalyzer";
import { useEffect, useRef, useState } from "react";

const ZOOM = 18; // good level for real-world nearby
const PIXEL_SIZE = 8; // downscale before pixelating (smaller for isometric)
const WEATHER_ICON_SIZE = 64; // pixel-art icon size
const WEATHER_ICON_POS = { x: 20, y: 20 }; // position on canvas
const CANVAS_SIZE = 800; // Larger canvas for isometric view
const PLAYER_HEIGHT_OFFSET = 8; // Offset for player sprite depth

interface WeatherData {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
  daily?: {
    sunrise: string[];
    sunset: string[];
  };
}

interface Particle {
  x: number;
  y: number;
  speed: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
}

interface LoadedTile {
  col: number;
  row: number;
  img: HTMLCanvasElement;
}

// Map weather codes to icon filenames
const getWeatherIconName = (weathercode: number): string => {
  if (weathercode === 0) return "sunny";
  if (weathercode <= 3) return "cloudy";
  if (weathercode <= 48) return "foggy";
  if (weathercode <= 67) return "rainy";
  if (weathercode <= 86) return "snowy";
  return "stormy";
};

export default function PixelMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  // Game State Refs
  const playerRef = useRef({ x: 0, y: 0 });
  const playerDirectionRef = useRef(0); // 0-7 for 8 directions (0=S, 1=SW, 2=W, 3=NW, 4=N, 5=NE, 6=E, 7=SE)
  const playerVelocityRef = useRef({ x: 0, y: 0 }); // Current movement direction
  const cameraRef = useRef({ x: 0, y: 0 });
  const loadedTilesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const loadingTilesRef = useRef<Set<string>>(new Set());
  const weatherRef = useRef<WeatherData | null>(null);
  
  // Assets Refs
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const weatherIconRef = useRef<HTMLImageElement | null>(null);
  const cloudImageRef = useRef<HTMLImageElement | null>(null);
  
  // Isometric Tile Assets
  const isoTilesRef = useRef<{
    grass: HTMLImageElement | null;
    water: HTMLImageElement | null;
    road: HTMLImageElement | null;
    park: HTMLImageElement | null;
    building: HTMLImageElement | null;
  }>({ grass: null, water: null, road: null, park: null, building: null });
  
  // Terrain Cache: Maps grid position to terrain type from OSM analysis
  const terrainCacheRef = useRef<Map<string, TerrainType>>(new Map());
  
  // Particle Refs
  const raindropsRef = useRef<Particle[]>([]);
  const snowflakesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);

  // Update refs when state changes
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  // 1️⃣ Initialize & Load Assets
  useEffect(() => {
    // Load Player Sprite Sheet
    const pImg = new Image();
    pImg.src = "/player/Small-8-Direction-Characters_by_AxulArt.png";
    pImg.onload = () => { playerImageRef.current = pImg; };

    // Load Cloud
    const cImg = new Image();
    cImg.src = "/weather/cloudy.png";
    cImg.onload = () => { cloudImageRef.current = cImg; };

    // Load Isometric Tiles
    const grassImg = new Image();
    grassImg.src = "/tiles/grass.png";
    grassImg.onload = () => { isoTilesRef.current.grass = grassImg; };
    
    const waterImg = new Image();
    waterImg.src = "/tiles/water.png";
    waterImg.onload = () => { isoTilesRef.current.water = waterImg; };
    
    const roadImg = new Image();
    roadImg.src = "/tiles/road.png";
    roadImg.onload = () => { isoTilesRef.current.road = roadImg; };
    
    const parkImg = new Image();
    parkImg.src = "/tiles/park.png";
    parkImg.onload = () => { isoTilesRef.current.park = parkImg; };
    
    const buildingImg = new Image();
    buildingImg.src = "/tiles/building.png";
    buildingImg.onload = () => { isoTilesRef.current.building = buildingImg; };

    // Initialize Particles
    raindropsRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
      speed: 2 + Math.random() * 2
    }));
    snowflakesRef.current = Array.from({ length: 40 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
      speed: 1 + Math.random() * 1
    }));
    cloudsRef.current = Array.from({ length: 3 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * (CANVAS_SIZE / 2),
      speed: 0.5 + Math.random() * 0.5
    }));
  }, []);

  // 2️⃣ GPS Tracking
  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const { x, y } = latLonToPixel(latitude, longitude, ZOOM);
        
        // If first fix, set player directly
        if (playerRef.current.x === 0 && playerRef.current.y === 0) {
          playerRef.current = { x, y };
        } else {
          // Smooth transition could be added here, but direct update for now
          playerRef.current = { x, y };
        }

        // Fetch weather if we moved significantly or don't have it
        if (!weatherRef.current) {
           fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
             .then(res => res.json())
             .then(setWeather)
             .catch(console.error);
        }
      },
      console.error,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 3️⃣ Load Weather Icon
  useEffect(() => {
    if (!weather) return;
    const iconName = getWeatherIconName(weather.weathercode);
    const img = new Image();
    img.src = `/weather/${iconName}.png`;
    img.onload = () => { weatherIconRef.current = img; };
  }, [weather]);

  // 4️⃣ Virtual Movement (Keyboard - 8 directions)
  useEffect(() => {
    const keys = new Set<string>();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.add(e.key);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
    };
    
    // Update player velocity and direction based on keys
    const updateMovement = () => {
      const step = 10; // pixels per frame
      let vx = 0;
      let vy = 0;
      
      if (keys.has('ArrowUp')) vy -= 1;
      if (keys.has('ArrowDown')) vy += 1;
      if (keys.has('ArrowLeft')) vx -= 1;
      if (keys.has('ArrowRight')) vx += 1;
      
      // Normalize diagonal movement
      if (vx !== 0 && vy !== 0) {
        const len = Math.sqrt(vx * vx + vy * vy);
        vx /= len;
        vy /= len;
      }
      
      playerVelocityRef.current = { x: vx, y: vy };
      
      // Update position
      playerRef.current.x += vx * step;
      playerRef.current.y += vy * step;
      
      // Calculate direction (0-7) based on velocity
      if (vx !== 0 || vy !== 0) {
        // Calculate angle in radians
        const angle = Math.atan2(vy, vx);
        // Convert to 8 directions (0=South, clockwise)
        // We need to rotate by 90 degrees and flip to match sprite sheet
        let dir = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
        // Adjust mapping to match sprite sheet layout
        // Sprite sheet order: S, SW, W, NW, N, NE, E, SE
        playerDirectionRef.current = dir;
      }
    };
    
    const interval = setInterval(updateMovement, 16); // ~60fps
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 5️⃣ Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;

    const render = () => {
      // 1. Update Camera (now based on isometric coordinates)
      const screenW = canvas.width;
      const screenH = canvas.height;
      
      // Convert player world position to isometric
      const playerWorldX = playerRef.current.x / PIXEL_SIZE;
      const playerWorldY = playerRef.current.y / PIXEL_SIZE;
      const { isoX: playerIsoX, isoY: playerIsoY } = worldToIso(playerWorldX, playerWorldY);
      
      cameraRef.current.x = playerIsoX - screenW / 2;
      cameraRef.current.y = playerIsoY - screenH / 2;

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;

      // Clear canvas
      ctx.clearRect(0, 0, screenW, screenH);

      // 2. Draw Isometric Map
      // Calculate visible world grid bounds
      const gridSize = 50; // Tiles to render in each direction
      const centerGridX = Math.floor(playerWorldX);
      const centerGridY = Math.floor(playerWorldY);
      
      // Collect all entities to render (tiles + player) for depth sorting
      const renderQueue: Array<{
        depth: number;
        render: () => void;
      }> = [];
      
      // Add isometric tiles to render queue
      for (let y = centerGridY - gridSize; y < centerGridY + gridSize; y++) {
        for (let x = centerGridX - gridSize; x < centerGridX + gridSize; x++) {
          const { isoX, isoY } = worldToIso(x, y);
          const screenX = isoX - camX;
          const screenY = isoY - camY;
          
          // Only render if on screen
          if (screenX > -ISO_TILE_WIDTH && screenX < screenW &&
              screenY > -ISO_TILE_HEIGHT && screenY < screenH) {
            
            const tileKey = `${x},${y}`;
            
            // Get terrain type from cache or analyze OSM tile
            let terrainType: TerrainType = 'grass';
            
            if (terrainCacheRef.current.has(tileKey)) {
              terrainType = terrainCacheRef.current.get(tileKey)!;
            } else {
              // Need to analyze OSM tile for this position
              // Convert grid position back to OSM tile coordinates
              const worldPixelX = x * PIXEL_SIZE;
              const worldPixelY = y * PIXEL_SIZE;
              
              // Determine which OSM tile this belongs to
              const osmTileCol = Math.floor(worldPixelX / TILE_SIZE);
              const osmTileRow = Math.floor(worldPixelY / TILE_SIZE);
              const osmTileKey = `${osmTileCol},${osmTileRow}`;
              
              // Check if we have this OSM tile loaded
              if (loadedTilesRef.current.has(osmTileKey)) {
                const osmTile = loadedTilesRef.current.get(osmTileKey)!;
                
                // Calculate position within the tile
                const localX = Math.floor((worldPixelX % TILE_SIZE) / PIXEL_SIZE);
                const localY = Math.floor((worldPixelY % TILE_SIZE) / PIXEL_SIZE);
                
                // Analyze the tile to get terrain map
                const gridSize = TILE_SIZE / PIXEL_SIZE;
                const terrainMap = analyzeOSMTile(osmTile, gridSize, gridSize);
                
                // Get terrain type for this position
                if (localY >= 0 && localY < terrainMap.length &&
                    localX >= 0 && localX < terrainMap[0].length) {
                  terrainType = terrainMap[localY][localX];
                  terrainCacheRef.current.set(tileKey, terrainType);
                }
              } else if (!loadingTilesRef.current.has(osmTileKey)) {
                // Load OSM tile if not present
                loadingTilesRef.current.add(osmTileKey);
                loadTile(osmTileCol, osmTileRow, ZOOM).then(img => {
                  loadingTilesRef.current.delete(osmTileKey);
                  if (img) {
                    const pixelated = pixelate(img);
                    loadedTilesRef.current.set(osmTileKey, pixelated);
                  }
                });
              }
            }
            
            // Select tile image based on terrain type
            let tileImg = isoTilesRef.current.grass;
            if (terrainType === 'water') tileImg = isoTilesRef.current.water;
            else if (terrainType === 'road') tileImg = isoTilesRef.current.road;
            else if (terrainType === 'park') tileImg = isoTilesRef.current.park;
            else if (terrainType === 'building') tileImg = isoTilesRef.current.building;
            
            const depth = y + x; // Depth sorting key
            
            renderQueue.push({
              depth,
              render: () => {
                if (tileImg) {
                  ctx.drawImage(
                    tileImg,
                    Math.floor(screenX),
                    Math.floor(screenY),
                    ISO_TILE_WIDTH,
                    ISO_TILE_HEIGHT
                  );
                }
              }
            });
          }
        }
      }
      
      // 3. Add Player to render queue
      if (playerImageRef.current) {
        // Sprite sheet layout: 8 rows (one per direction), 3 columns (animation frames)
        // Each sprite is 48x48 pixels
        // We're using the first character (leftmost section)
        const SPRITE_WIDTH = 48;
        const SPRITE_HEIGHT = 48;
        const PLAYER_SIZE = 32; // Render size
        
        const direction = playerDirectionRef.current;
        
        // Calculate sprite position in sheet
        // Using middle frame (column 1) for now - you can animate later
        const srcX = SPRITE_WIDTH; // Middle frame
        const srcY = direction * SPRITE_HEIGHT; // Row based on direction
        
        const playerScreenX = screenW / 2 - PLAYER_SIZE / 2;
        const playerScreenY = screenH / 2 - PLAYER_SIZE / 2 - PLAYER_HEIGHT_OFFSET;
        const playerDepth = playerWorldY + playerWorldX;
        
        renderQueue.push({
          depth: playerDepth,
          render: () => {
            ctx.drawImage(
              playerImageRef.current!,
              srcX, srcY, SPRITE_WIDTH, SPRITE_HEIGHT, // Source rectangle
              playerScreenX, playerScreenY, PLAYER_SIZE, PLAYER_SIZE // Destination rectangle
            );
          }
        });
      }
      
      // Sort by depth and render
      renderQueue.sort((a, b) => a.depth - b.depth);
      renderQueue.forEach(item => item.render());

      // 4. Weather Effects & Overlays
      const currentWeather = weatherRef.current;
      if (currentWeather) {
        const code = currentWeather.weathercode;
        const enableRain = [51,53,55,61,63,65,80,81,82].includes(code);
        const enableSnow = [71,73,75,77,85,86].includes(code);
        const enableClouds = [1, 2, 3].includes(code);

        if (enableRain) renderRain(ctx, raindropsRef.current);
        if (enableSnow) renderSnow(ctx, snowflakesRef.current);
        if (enableClouds && cloudImageRef.current) renderClouds(ctx, cloudsRef.current, cloudImageRef.current);

        // Icon
        if (weatherIconRef.current) {
          ctx.drawImage(weatherIconRef.current, WEATHER_ICON_POS.x, WEATHER_ICON_POS.y, WEATHER_ICON_SIZE, WEATHER_ICON_SIZE);
        }

        // Day/Night
        if (currentWeather.daily?.sunrise && currentWeather.daily?.sunset) {
           const now = new Date().getTime();
           const sunrise = new Date(currentWeather.daily.sunrise[0]).getTime();
           const sunset = new Date(currentWeather.daily.sunset[0]).getTime();
           const brightness = getBrightness(now, sunrise, sunset);
           if (brightness < 1) {
             ctx.fillStyle = `rgba(0,0,40,${1 - brightness})`;
             ctx.fillRect(0, 0, screenW, screenH);
           }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE} // Keep fixed size or make responsive? User prompt implied fixed or screen.
        height={CANVAS_SIZE}
        className="border-4 border-gray-800 rounded-lg shadow-2xl"
      />
    </div>
  );
}

// --- Helper Functions ---

function renderRain(ctx: CanvasRenderingContext2D, raindrops: Particle[]) {
  ctx.fillStyle = "#6bbaff"; // pixel-rain color
  raindrops.forEach(d => {
    ctx.fillRect(d.x, d.y, 2, 4); // tiny pixel droplet
    d.y += d.speed;
    if (d.y > CANVAS_SIZE) d.y = -10;
  });
}

function renderSnow(ctx: CanvasRenderingContext2D, snowflakes: Particle[]) {
  ctx.fillStyle = "#ffffff";
  snowflakes.forEach(s => {
    ctx.fillRect(s.x, s.y, 3, 3);
    s.y += s.speed;
    if (s.y > CANVAS_SIZE) s.y = -10;
  });
}

function renderClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[], cloudSprite: HTMLImageElement) {
  clouds.forEach(c => {
    ctx.drawImage(cloudSprite, c.x, c.y, 100, 60); // Draw cloud with some size
    c.x -= 0.5;
    if (c.x < -100) c.x = CANVAS_SIZE + Math.random() * 100;
  });
}

function getBrightness(now: number, sunrise: number, sunset: number) {
  if (now < sunrise || now > sunset) return 0.3; // night
  if (now > sunrise && now < sunrise + 60*60*1000) return 0.5; // dawn
  if (now < sunset && now > sunset - 60*60*1000) return 0.5; // dusk
  return 1; // day
}

async function loadTile(
  x: number,
  y: number,
  z: number
): Promise<HTMLImageElement | null> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function pixelate(img: HTMLImageElement): HTMLCanvasElement {
  const temp = document.createElement("canvas");
  temp.width = PIXEL_SIZE;
  temp.height = PIXEL_SIZE;
  const tctx = temp.getContext("2d")!;
  tctx.drawImage(img, 0, 0, PIXEL_SIZE, PIXEL_SIZE);

  const out = document.createElement("canvas");
  out.width = TILE_SIZE;
  out.height = TILE_SIZE;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(
    temp,
    0,
    0,
    PIXEL_SIZE,
    PIXEL_SIZE,
    0,
    0,
    TILE_SIZE,
    TILE_SIZE
  );

  return out;
}
