import type { WeatherData } from "../config/WeatherConfig";

export const formatTime = (timeString: string): string => {
  const date = new Date(timeString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fetchWeatherData = async (
  lat: number,
  lon: number,
): Promise<WeatherData | null> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await response.json();
    return {
      ...data.current_weather,
      daily: data.daily,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};
