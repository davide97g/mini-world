"use client";

import { latLonToTile } from "@/lib/coords";
import { useEffect, useRef, useState } from "react";

const ZOOM = 17; // good level for real-world nearby
const PIXEL_SIZE = 32; // downscale before pixelating
const TILE_SIZE = 256; // OSM default
const WEATHER_ICON_SIZE = 64; // pixel-art icon size
const WEATHER_ICON_POS = { x: 20, y: 20 }; // position on canvas

interface WeatherData {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
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
  const weatherIconRef = useRef<HTMLImageElement | null>(null);

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

  // 3️⃣ Load weather icon
  useEffect(() => {
    if (!weather) return;

    const iconName = getWeatherIconName(weather.weathercode);
    const img = new Image();
    img.src = `/weather/${iconName}.png`;
    img.onload = () => {
      weatherIconRef.current = img;
      // Trigger redraw when icon loads
      if (canvasRef.current && pos) {
        drawWeatherIcon(canvasRef.current, img);
      }
    };
    img.onerror = () => {
      console.warn(`Weather icon not found: /weather/${iconName}.png`);
    };
  }, [weather, pos]);

  // 4️⃣ Draw pixel-art map
  useEffect(() => {
    if (!pos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const { x, y } = latLonToTile(pos.lat, pos.lon, ZOOM);

    const tilesToLoad = [
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1],
    ];

    // Capture canvas dimensions and context to avoid closure issues
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const context: CanvasRenderingContext2D = ctx; // Type assertion after null check

    async function draw() {
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let i = 0; i < tilesToLoad.length; i++) {
        const [tx, ty] = tilesToLoad[i];

        const img = await loadTile(tx, ty, ZOOM);
        if (!img) continue;

        const pixelated = pixelate(img);

        const col = i % 3;
        const row = Math.floor(i / 3);

        context.drawImage(
          pixelated,
          col * TILE_SIZE,
          row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }

      // Draw weather icon overlay after map tiles
      if (weatherIconRef.current && canvas) {
        drawWeatherIcon(canvas, weatherIconRef.current);
      }
    }

    draw();
  }, [pos, weather]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        width={TILE_SIZE * 3}
        height={TILE_SIZE * 3}
        style={{ border: "4px solid black", background: "#000" }}
      />
    </div>
  );
}

// Helper function to draw weather icon on canvas
function drawWeatherIcon(canvas: HTMLCanvasElement, icon: HTMLImageElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    icon,
    WEATHER_ICON_POS.x,
    WEATHER_ICON_POS.y,
    WEATHER_ICON_SIZE,
    WEATHER_ICON_SIZE
  );
}

// 5️⃣ Load OSM tile
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

// 4️⃣ Pixelation: downscale -> upscale
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
