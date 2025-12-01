"use client";

import { latLonToTile } from "@/lib/coords";
import { useEffect, useRef, useState } from "react";

const ZOOM = 17; // good level for real-world nearby
const PIXEL_SIZE = 32; // downscale before pixelating
const TILE_SIZE = 256; // OSM default
const WEATHER_ICON_SIZE = 64; // pixel-art icon size
const WEATHER_ICON_POS = { x: 20, y: 20 }; // position on canvas
const CANVAS_SIZE = TILE_SIZE * 3;

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
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  // Refs for animation loop to avoid stale closures
  const weatherRef = useRef<WeatherData | null>(null);
  const loadedTilesRef = useRef<LoadedTile[]>([]);
  const weatherIconRef = useRef<HTMLImageElement | null>(null);
  const cloudImageRef = useRef<HTMLImageElement | null>(null);
  
  // Particle systems
  const raindropsRef = useRef<Particle[]>([]);
  const snowflakesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);

  // Update refs when state changes
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  // 1️⃣ Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      console.error,
      { enableHighAccuracy: true }
    );
  }, []);

  // 2️⃣ Fetch weather data when position is available
  useEffect(() => {
    if (!pos) return;

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `/api/weather?lat=${pos.lat}&lon=${pos.lon}`
        );
        if (response.ok) {
          const data = await response.json();
          setWeather(data);
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      }
    };

    fetchWeather();
  }, [pos]);

  // 3️⃣ Load assets (Weather Icon & Cloud)
  useEffect(() => {
    if (!weather) return;

    // Load Weather Icon
    const iconName = getWeatherIconName(weather.weathercode);
    const img = new Image();
    img.src = `/weather/${iconName}.png`;
    img.onload = () => {
      weatherIconRef.current = img;
    };

    // Load Cloud Image
    const cloudImg = new Image();
    cloudImg.src = "/weather/cloudy.png"; // Using cloudy.png as the sprite
    cloudImg.onload = () => {
      cloudImageRef.current = cloudImg;
    };

  }, [weather]);

  // Initialize Particles
  useEffect(() => {
    // Raindrops
    raindropsRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
      speed: 2 + Math.random() * 2
    }));

    // Snowflakes
    snowflakesRef.current = Array.from({ length: 40 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
      speed: 1 + Math.random() * 1
    }));

    // Clouds
    cloudsRef.current = Array.from({ length: 3 }, () => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * (CANVAS_SIZE / 2), // Top half
      speed: 0.5 + Math.random() * 0.5
    }));
  }, []);

  // 4️⃣ Load Map Tiles
  useEffect(() => {
    if (!pos) return;

    const { x, y } = latLonToTile(pos.lat, pos.lon, ZOOM);

    const tilesToLoad = [
      [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
      [x - 1, y],     [x, y],     [x + 1, y],
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
    ];

    async function loadTiles() {
      const newTiles: LoadedTile[] = [];
      
      for (let i = 0; i < tilesToLoad.length; i++) {
        const [tx, ty] = tilesToLoad[i];
        const img = await loadTile(tx, ty, ZOOM);
        if (img) {
          const pixelated = pixelate(img);
          const col = i % 3;
          const row = Math.floor(i / 3);
          newTiles.push({ col, row, img: pixelated });
        }
      }
      loadedTilesRef.current = newTiles;
    }

    loadTiles();
  }, [pos]);

  // 5️⃣ Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw Map Tiles
      loadedTilesRef.current.forEach(tile => {
        ctx.drawImage(
          tile.img,
          tile.col * TILE_SIZE,
          tile.row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      });

      const currentWeather = weatherRef.current;
      if (currentWeather) {
        const code = currentWeather.weathercode;
        
        // Determine active effects
        const enableRain = [51,53,55,61,63,65,80,81,82].includes(code);
        const enableSnow = [71,73,75,77,85,86].includes(code);
        const enableClouds = [1, 2, 3].includes(code);
        
        // Render Effects
        if (enableRain) renderRain(ctx, raindropsRef.current);
        if (enableSnow) renderSnow(ctx, snowflakesRef.current);
        if (enableClouds && cloudImageRef.current) renderClouds(ctx, cloudsRef.current, cloudImageRef.current);

        // Draw Weather Icon
        if (weatherIconRef.current) {
          ctx.drawImage(
            weatherIconRef.current,
            WEATHER_ICON_POS.x,
            WEATHER_ICON_POS.y,
            WEATHER_ICON_SIZE,
            WEATHER_ICON_SIZE
          );
        }

        // Day/Night Cycle
        if (currentWeather.daily && currentWeather.daily.sunrise && currentWeather.daily.sunset) {
          const now = new Date().getTime();
          // Assuming sunrise/sunset are ISO strings, we need to parse them.
          // Open-Meteo returns local time ISO strings if timezone=auto is used.
          // But new Date(isoString) works.
          const sunrise = new Date(currentWeather.daily.sunrise[0]).getTime();
          const sunset = new Date(currentWeather.daily.sunset[0]).getTime();
          
          const brightness = getBrightness(now, sunrise, sunset);
          
          if (brightness < 1) {
            ctx.fillStyle = `rgba(0,0,40,${1 - brightness})`;
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Run once on mount, logic depends on refs

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ border: "4px solid black", background: "#000" }}
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
