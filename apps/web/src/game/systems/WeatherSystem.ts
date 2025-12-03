import Phaser from "phaser";
import { WEATHER_UPDATE_INTERVAL } from "../config/GameConstants";
import {
  getWeatherIcon,
  WEATHER_CODE_MAP,
  type WeatherData,
} from "../config/WeatherConfig";
import { fetchWeatherData, formatTime } from "../utils/WeatherUtils";

export class WeatherSystem {
  private scene: Phaser.Scene;
  private weatherWidget: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initWeatherWidget();
  }

  private initWeatherWidget(): void {
    if (!navigator.geolocation) {
      this.createWeatherWidget(null, "Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const weather = await fetchWeatherData(lat, lon);
        this.createWeatherWidget(weather, null);
      },
      (err) => {
        let errorMessage = "Unable to get location";
        if (err.code === 1) {
          errorMessage = "Location access denied";
        } else if (err.code === 2) {
          errorMessage = "Location unavailable";
        } else if (err.code === 3) {
          errorMessage = "Location request timed out";
        }
        this.createWeatherWidget(null, errorMessage);
      },
    );
  }

  private createWeatherWidget(
    weather: WeatherData | null,
    error: string | null,
  ): void {
    const width = this.scene.cameras.main.width;
    const padding = 12;
    const widgetWidth = 200;
    const widgetHeight = 260;
    const x = width - widgetWidth - padding;
    const y = padding;
    const borderRadius = 16;

    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(30);

    // Create rounded rectangle background using graphics
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.lineStyle(2, 0x000000, 0.3);
    bg.fillRoundedRect(0, 0, widgetWidth, widgetHeight, borderRadius);
    bg.strokeRoundedRect(0, 0, widgetWidth, widgetHeight, borderRadius);
    container.add(bg);

    if (error || !weather) {
      const errorText = this.scene.add.text(
        widgetWidth / 2,
        widgetHeight / 2,
        error || "Unable to fetch weather",
        {
          font: "11px monospace",
          color: "#ff0000",
          align: "center",
          wordWrap: { width: widgetWidth - 20 },
          resolution: 1,
        },
      );
      errorText.setOrigin(0.5);
      container.add(errorText);
      this.weatherWidget = container;
      return;
    }

    this.renderWeatherContent(container, weather, widgetWidth);

    this.weatherWidget = container;

    // Update weather every 5 minutes
    setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const newWeather = await fetchWeatherData(lat, lon);
            if (newWeather && this.weatherWidget) {
              this.updateWeatherWidget(newWeather);
            }
          },
          () => {
            // Silently fail on update
          },
        );
      }
    }, WEATHER_UPDATE_INTERVAL);
  }

  private renderWeatherContent(
    container: Phaser.GameObjects.Container,
    weather: WeatherData,
    widgetWidth: number,
  ): void {
    const weatherDescription =
      WEATHER_CODE_MAP[weather.weathercode] || "Unknown";
    const weatherIcon = getWeatherIcon(weather.weathercode);

    const textStyle = {
      resolution: 1,
      fontFamily: "monospace",
    };

    const iconText = this.scene.add.text(15, 15, weatherIcon, {
      font: "24px monospace",
      color: "#000000",
      ...textStyle,
    });
    container.add(iconText);

    const tempText = this.scene.add.text(
      50,
      12,
      `${weather.temperature.toFixed(1)}°C`,
      {
        font: "bold 16px monospace",
        color: "#000000",
        ...textStyle,
      },
    );
    container.add(tempText);

    const descText = this.scene.add.text(50, 32, weatherDescription, {
      font: "10px monospace",
      color: "#333333",
      wordWrap: { width: widgetWidth - 60 },
      ...textStyle,
    });
    container.add(descText);

    let yOffset = 60;

    const windText = this.scene.add.text(
      15,
      yOffset,
      `Wind: ${weather.windspeed.toFixed(1)} km/h`,
      {
        font: "10px monospace",
        color: "#666666",
        ...textStyle,
      },
    );
    container.add(windText);
    yOffset += 18;

    if (weather.windgusts_10m !== undefined && weather.windgusts_10m !== null) {
      const gustsText = this.scene.add.text(
        15,
        yOffset,
        `Gusts: ${weather.windgusts_10m.toFixed(1)} km/h`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(gustsText);
      yOffset += 18;
    }

    if (
      weather.apparent_temperature !== undefined &&
      weather.apparent_temperature !== null
    ) {
      const feelsText = this.scene.add.text(
        15,
        yOffset,
        `Feels: ${weather.apparent_temperature.toFixed(1)}°C`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(feelsText);
      yOffset += 18;
    }

    if (
      weather.relative_humidity_2m !== undefined &&
      weather.relative_humidity_2m !== null
    ) {
      const humidityText = this.scene.add.text(
        15,
        yOffset,
        `Humidity: ${weather.relative_humidity_2m.toFixed(0)}%`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(humidityText);
      yOffset += 18;
    }

    if (weather.cloudcover !== undefined && weather.cloudcover !== null) {
      const cloudText = this.scene.add.text(
        15,
        yOffset,
        `Clouds: ${weather.cloudcover.toFixed(0)}%`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(cloudText);
      yOffset += 18;
    }

    if (weather.pressure_msl !== undefined && weather.pressure_msl !== null) {
      const pressureText = this.scene.add.text(
        15,
        yOffset,
        `Pressure: ${weather.pressure_msl.toFixed(0)} hPa`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(pressureText);
      yOffset += 18;
    }

    if (weather.uv_index !== undefined && weather.uv_index !== null) {
      const uvText = this.scene.add.text(
        15,
        yOffset,
        `UV: ${weather.uv_index.toFixed(1)}`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(uvText);
      yOffset += 18;
    }

    if (
      weather.shortwave_radiation !== undefined &&
      weather.shortwave_radiation !== null
    ) {
      const solarText = this.scene.add.text(
        15,
        yOffset,
        `Solar: ${weather.shortwave_radiation.toFixed(0)} W/m²`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(solarText);
      yOffset += 18;
    }

    if (
      weather.soil_moisture_0_to_7cm !== undefined &&
      weather.soil_moisture_0_to_7cm !== null
    ) {
      const soilText = this.scene.add.text(
        15,
        yOffset,
        `Soil: ${weather.soil_moisture_0_to_7cm.toFixed(2)} m³/m³`,
        {
          font: "10px monospace",
          color: "#666666",
          ...textStyle,
        },
      );
      container.add(soilText);
      yOffset += 18;
    }

    const timeText = this.scene.add.text(
      15,
      yOffset,
      `Updated: ${formatTime(weather.time)}`,
      {
        font: "9px monospace",
        color: "#666666",
        ...textStyle,
      },
    );
    container.add(timeText);
  }

  private updateWeatherWidget(weather: WeatherData): void {
    if (!this.weatherWidget || !weather) return;

    // Remove all children except the background (first child)
    const children = this.weatherWidget.list.slice(1);
    children.forEach((child) => {
      if (
        child instanceof Phaser.GameObjects.Text ||
        child instanceof Phaser.GameObjects.Graphics
      ) {
        child.destroy();
      }
    });

    const widgetWidth = 200;
    this.renderWeatherContent(this.weatherWidget, weather, widgetWidth);
  }
}
