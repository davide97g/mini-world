"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
}

interface LocationState {
  lat: number | null;
  lon: number | null;
  error: string | null;
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const getWeatherIcon = (weathercode: number): string => {
  if (weathercode === 0) return "☀️";
  if (weathercode <= 3) return "⛅";
  if (weathercode <= 48) return "🌫️";
  if (weathercode <= 67) return "🌧️";
  if (weathercode <= 86) return "❄️";
  return "⛈️";
};

const formatTime = (timeString: string): string => {
  const date = new Date(timeString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const WeatherWidget = () => {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lon: null,
    error: null,
  });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleGetLocation = () => {
      if (!navigator.geolocation) {
        setLocation({ lat: null, lon: null, error: "Geolocation not supported" });
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            error: null,
          });
        },
        (err) => {
          let errorMessage = "Unable to get your location";
          if (err.code === 1) {
            errorMessage = "Location access denied. Please enable location permissions.";
          } else if (err.code === 2) {
            errorMessage = "Location unavailable. Please check your connection.";
          } else if (err.code === 3) {
            errorMessage = "Location request timed out. Please try again.";
          }
          setLocation({
            lat: null,
            lon: null,
            error: errorMessage,
          });
          setLoading(false);
        }
      );
    };

    handleGetLocation();
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location.lat || !location.lon) {
        if (location.error) {
          setError(location.error);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/weather?lat=${location.lat}&lon=${location.lon}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
        setWeather(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location.lat, location.lon, location.error]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-full max-w-sm">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-300">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-full max-w-sm">
        <div className="text-red-600 dark:text-red-400">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error || "Unable to fetch weather data"}</p>
        </div>
      </div>
    );
  }

  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || "Unknown";
  const weatherIcon = getWeatherIcon(weather.weathercode);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-full max-w-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-3xl">{weatherIcon}</span>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {weather.temperature.toFixed(1)}°C
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {weatherDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span>Wind Speed:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {weather.windspeed.toFixed(1)} km/h
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last Updated:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatTime(weather.time)}
          </span>
        </div>
      </div>
    </div>
  );
};

