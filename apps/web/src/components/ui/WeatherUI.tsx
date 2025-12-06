import { type ReactElement, useEffect, useState } from "react";
import { WEATHER_UPDATE_INTERVAL } from "../../game/config/GameConstants";
import {
  getWeatherIcon,
  WEATHER_CODE_MAP,
  type WeatherData,
} from "../../game/config/WeatherConfig";
import { gameEventBus } from "../../game/utils/GameEventBus";
import { fetchWeatherData, formatTime } from "../../game/utils/WeatherUtils";

const WeatherUI = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocationDenied, setIsLocationDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    const fetchWeather = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const weatherData = await fetchWeatherData(lat, lon);
            setWeather(weatherData);
            setError(null);
            gameEventBus.emit("weather:update", { weather: weatherData });
          } catch {
            setError("Unable to fetch weather");
          }
        },
        (err) => {
          let errorMessage = "Unable to get location";
          if (err.code === 1) {
            errorMessage = "Location access denied";
            setIsLocationDenied(true);
          } else if (err.code === 2) {
            errorMessage = "Location unavailable";
          } else if (err.code === 3) {
            errorMessage = "Location request timed out";
          }
          setError(errorMessage);
        },
      );
    };

    fetchWeather();

    const interval = setInterval(fetchWeather, WEATHER_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setIsLocationDenied(false);
    setError(null);
    // Retry location request
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const weatherData = await fetchWeatherData(lat, lon);
            setWeather(weatherData);
            setError(null);
          } catch {
            setError("Unable to fetch weather");
          }
        },
        () => {
          setError("Location access denied");
          setIsLocationDenied(true);
        },
      );
    }
  };

  if (error && isLocationDenied) {
    return (
      <div
        className="fixed top-3 right-3 bg-white bg-opacity-50 border-2 border-black border-opacity-30 rounded-2xl z-30"
        style={{
          width: "100px",
          height: "60px",
        }}
      >
        <p
          className="text-red-600 font-mono text-center mb-2"
          style={{ fontSize: "9px" }}
        >
          Location denied
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-black font-mono font-bold text-center w-full hover:text-blue-600"
          style={{ fontSize: "16px" }}
        >
          ↻
        </button>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div
        className="fixed top-3 right-3 bg-white bg-opacity-50 border-2 border-black border-opacity-30 rounded-2xl z-30"
        style={{
          width: "100px",
          height: "60px",
        }}
      >
        <p
          className="text-red-600 font-mono text-center"
          style={{ fontSize: "11px" }}
        >
          {error || "Unable to fetch weather"}
        </p>
      </div>
    );
  }

  const weatherDescription = WEATHER_CODE_MAP[weather.weathercode] || "Unknown";
  const weatherIcon = getWeatherIcon(weather.weathercode);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: test
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: test
    <div
      className="fixed top-3 right-3 bg-white bg-opacity-50 border-2 border-black border-opacity-30 rounded-2xl z-30 cursor-pointer transition-all"
      style={{
        width: isExpanded ? "200px" : "100px",
        height: isExpanded ? "260px" : "60px",
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      aria-label="Weather information"
    >
      {isExpanded ? (
        <div style={{ position: "relative" }}>
          {/* Icon - positioned at (15, 15) from container */}
          <div
            className="font-mono"
            style={{
              position: "absolute",
              left: "15px",
              top: "15px",
              fontSize: "24px",
              color: "#000000",
            }}
          >
            {weatherIcon}
          </div>

          {/* Temperature - positioned at (50, 12) from container */}
          <p
            className="font-mono font-bold"
            style={{
              position: "absolute",
              left: "50px",
              top: "12px",
              fontSize: "16px",
              color: "#000000",
            }}
          >
            {weather.temperature.toFixed(1)}°C
          </p>

          {/* Description - positioned at (50, 32) from container */}
          <p
            className="font-mono"
            style={{
              position: "absolute",
              left: "50px",
              top: "32px",
              fontSize: "10px",
              color: "#333333",
              maxWidth: "140px",
            }}
          >
            {weatherDescription}
          </p>

          {/* Additional details - starting at yOffset 60, incrementing by 18px */}
          {(() => {
            let yOffset = 60;
            const details: ReactElement[] = [];

            // Wind
            details.push(
              <p
                key="wind"
                className="font-mono"
                style={{
                  position: "absolute",
                  left: "15px",
                  top: `${yOffset}px`,
                  fontSize: "10px",
                  color: "#666666",
                }}
              >
                Wind: {weather.windspeed.toFixed(1)} km/h
              </p>,
            );
            yOffset += 18;

            // Gusts
            if (
              weather.windgusts_10m !== undefined &&
              weather.windgusts_10m !== null
            ) {
              details.push(
                <p
                  key="gusts"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Gusts: {weather.windgusts_10m.toFixed(1)} km/h
                </p>,
              );
              yOffset += 18;
            }

            // Feels like
            if (
              weather.apparent_temperature !== undefined &&
              weather.apparent_temperature !== null
            ) {
              details.push(
                <p
                  key="feels"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Feels: {weather.apparent_temperature.toFixed(1)}°C
                </p>,
              );
              yOffset += 18;
            }

            // Humidity
            if (
              weather.relative_humidity_2m !== undefined &&
              weather.relative_humidity_2m !== null
            ) {
              details.push(
                <p
                  key="humidity"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Humidity: {weather.relative_humidity_2m.toFixed(0)}%
                </p>,
              );
              yOffset += 18;
            }

            // Cloud cover
            if (
              weather.cloudcover !== undefined &&
              weather.cloudcover !== null
            ) {
              details.push(
                <p
                  key="clouds"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Clouds: {weather.cloudcover.toFixed(0)}%
                </p>,
              );
              yOffset += 18;
            }

            // Pressure
            if (
              weather.pressure_msl !== undefined &&
              weather.pressure_msl !== null
            ) {
              details.push(
                <p
                  key="pressure"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Pressure: {weather.pressure_msl.toFixed(0)} hPa
                </p>,
              );
              yOffset += 18;
            }

            // UV Index
            if (weather.uv_index !== undefined && weather.uv_index !== null) {
              details.push(
                <p
                  key="uv"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  UV: {weather.uv_index.toFixed(1)}
                </p>,
              );
              yOffset += 18;
            }

            // Solar radiation
            if (
              weather.shortwave_radiation !== undefined &&
              weather.shortwave_radiation !== null
            ) {
              details.push(
                <p
                  key="solar"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Solar: {weather.shortwave_radiation.toFixed(0)} W/m²
                </p>,
              );
              yOffset += 18;
            }

            // Soil moisture
            if (
              weather.soil_moisture_0_to_7cm !== undefined &&
              weather.soil_moisture_0_to_7cm !== null
            ) {
              details.push(
                <p
                  key="soil"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "10px",
                    color: "#666666",
                  }}
                >
                  Soil: {weather.soil_moisture_0_to_7cm.toFixed(2)} m³/m³
                </p>,
              );
              yOffset += 18;
            }

            // Updated time
            if (weather.time) {
              details.push(
                <p
                  key="time"
                  className="font-mono"
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: `${yOffset}px`,
                    fontSize: "9px",
                    color: "#666666",
                  }}
                >
                  Updated: {formatTime(weather.time)}
                </p>,
              );
            }

            return details;
          })()}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Icon - positioned at (10, 10) from container */}
          <span
            className="font-mono"
            style={{
              position: "absolute",
              left: "10px",
              top: "10px",
              fontSize: "20px",
              color: "#000000",
            }}
          >
            {weatherIcon}
          </span>
          {/* Temperature - positioned at (35, 8) from container */}
          <span
            className="font-mono font-bold"
            style={{
              position: "absolute",
              left: "35px",
              top: "8px",
              fontSize: "14px",
              color: "#000000",
            }}
          >
            {weather.temperature.toFixed(1)}°C
          </span>
          {/* Description - positioned at (35, 24) from container */}
          <span
            className="font-mono"
            style={{
              position: "absolute",
              left: "35px",
              top: "24px",
              fontSize: "10px",
              color: "#333333",
              maxWidth: "60px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {weatherDescription}
          </span>
        </div>
      )}
    </div>
  );
};

export default WeatherUI;
