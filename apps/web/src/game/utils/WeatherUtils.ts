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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=uv_index,shortwave_radiation,soil_moisture_0_to_7cm,relative_humidity_2m,cloudcover,pressure_msl,windgusts_10m,apparent_temperature&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await response.json();
    const currentTime = data.current_weather?.time;

    // Find the two nearest hourly indices for averaging
    let lowerIndex = -1;
    let upperIndex = -1;
    let weight = 0.5; // Default 50/50 if exactly between hours

    if (data.hourly?.time && currentTime) {
      const currentDate = new Date(currentTime);

      // Find the hour that matches or is just before current time
      for (let i = 0; i < data.hourly.time.length; i++) {
        const hourlyDate = new Date(data.hourly.time[i]);
        const nextHourlyDate = new Date(
          data.hourly.time[i + 1] || data.hourly.time[i],
        );

        // If current time is between this hour and next hour
        if (currentDate >= hourlyDate && currentDate < nextHourlyDate) {
          lowerIndex = i;
          upperIndex = i + 1 < data.hourly.time.length ? i + 1 : i;

          // Calculate weight based on how close to each hour
          const timeDiff = currentDate.getTime() - hourlyDate.getTime();
          const hourDiff = nextHourlyDate.getTime() - hourlyDate.getTime();
          weight = hourDiff > 0 ? 1 - timeDiff / hourDiff : 0.5;
          break;
        }

        // If exact match
        if (data.hourly.time[i] === currentTime) {
          lowerIndex = i;
          upperIndex = i;
          weight = 1;
          break;
        }
      }

      // Fallback: find closest index if no match found
      if (lowerIndex === -1) {
        let closestIndex = 0;
        let minDiff = Infinity;
        for (let i = 0; i < data.hourly.time.length; i++) {
          const diff = Math.abs(
            new Date(data.hourly.time[i]).getTime() - currentDate.getTime(),
          );
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        lowerIndex = closestIndex;
        upperIndex = closestIndex;
        weight = 1;
      }
    }

    // Get averaged value from hourly data
    const getAveragedValue = (
      array: (number | null)[] | undefined,
    ): number | undefined => {
      if (!array || lowerIndex < 0) return undefined;

      const lowerValue = array[lowerIndex];
      const upperValue =
        upperIndex !== lowerIndex && array[upperIndex] !== undefined
          ? array[upperIndex]
          : lowerValue;

      // Handle null values
      if (lowerValue === null || lowerValue === undefined) {
        if (upperValue !== null && upperValue !== undefined) return upperValue;
        return undefined;
      }
      if (upperValue === null || upperValue === undefined) {
        return lowerValue;
      }

      // Calculate weighted average
      if (lowerIndex === upperIndex) {
        return lowerValue;
      }
      return lowerValue * weight + upperValue * (1 - weight);
    };

    return {
      ...data.current_weather,
      uv_index: getAveragedValue(data.hourly?.uv_index),
      shortwave_radiation: getAveragedValue(data.hourly?.shortwave_radiation),
      soil_moisture_0_to_7cm: getAveragedValue(
        data.hourly?.soil_moisture_0_to_7cm,
      ),
      relative_humidity_2m: getAveragedValue(data.hourly?.relative_humidity_2m),
      cloudcover: getAveragedValue(data.hourly?.cloudcover),
      pressure_msl: getAveragedValue(data.hourly?.pressure_msl),
      windgusts_10m: getAveragedValue(data.hourly?.windgusts_10m),
      apparent_temperature: getAveragedValue(data.hourly?.apparent_temperature),
      daily: data.daily,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};
