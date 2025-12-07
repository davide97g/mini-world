/**
 * Energy System - Handles energy collection based on weather, time of day, and power-ups
 */

import type Phaser from "phaser";
import { gameEventBus } from "../utils/GameEventBus";
import type { TimeOfDay } from "./DayNightSystem";
import type { WeatherType } from "./WeatherEffectsSystem";

export interface PowerUp {
  id: string;
  energyMultiplier: number; // Multiplier for energy generation (e.g., 1.5 for 50% boost)
}

interface EnergySystemConfig {
  maxEnergyPerMinute: number; // Maximum energy per minute (default: 10)
  baseEnergyPerMinute: number; // Base energy per minute (default: 1)
}

/**
 * Calculate energy per minute based on weather condition, time of day, and power-ups
 * @param weatherType - Current weather type
 * @param timeOfDay - Current time of day
 * @param powerUps - Array of active power-ups
 * @param config - System configuration
 * @returns Energy per minute (capped at maxEnergyPerMinute)
 */
export const calculateEnergyPerMinute = (
  weatherType: WeatherType,
  timeOfDay: TimeOfDay,
  powerUps: PowerUp[] = [],
  config: EnergySystemConfig = {
    maxEnergyPerMinute: 100,
    baseEnergyPerMinute: 10,
  },
): number => {
  let energyPerMinute = config.baseEnergyPerMinute;

  // Weather multipliers (better weather = more energy)
  const weatherMultipliers: Record<WeatherType, number> = {
    clear: 2.0, // Best weather - sunny day
    cloudy: 1.5, // Good weather
    foggy: 0.5, // Poor visibility reduces energy
    rain: 0.8, // Rain reduces energy slightly
    snow: 0.6, // Snow reduces energy more
    thunderstorm: 0.3, // Worst weather - very low energy
  };

  // Time of day multipliers
  const timeMultipliers: Record<TimeOfDay, number> = {
    day: 1.0, // Normal during day
    night: 0.7, // Reduced energy at night
  };

  // Apply weather multiplier
  energyPerMinute *= weatherMultipliers[weatherType] || 1.0;

  // Apply time of day multiplier
  energyPerMinute *= timeMultipliers[timeOfDay] || 1.0;

  // Apply power-up multipliers
  powerUps.forEach((powerUp) => {
    energyPerMinute *= powerUp.energyMultiplier;
  });

  // Cap at maximum
  return Math.min(energyPerMinute, config.maxEnergyPerMinute);
};

export class EnergySystem {
  private scene: Phaser.Scene;
  private currentEnergy: number = 0;
  private energyPerMinute: number = 0;
  lastUpdateTime: number = 0;
  private minuteTimer?: Phaser.Time.TimerEvent;
  private powerUps: PowerUp[] = [];
  private config: EnergySystemConfig = {
    maxEnergyPerMinute: 100,
    baseEnergyPerMinute: 10,
  };

  // Callbacks to get current state
  private getWeatherType?: () => WeatherType;
  private getTimeOfDay?: () => TimeOfDay;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lastUpdateTime = Date.now();
  }

  public init(
    getWeatherType: () => WeatherType,
    getTimeOfDay: () => TimeOfDay,
  ): void {
    this.getWeatherType = getWeatherType;
    this.getTimeOfDay = getTimeOfDay;

    // Calculate initial energy per minute
    this.updateEnergyPerMinute();

    // Set up minute timer to add energy every minute
    this.minuteTimer = this.scene.time.addEvent({
      delay: 60000, // 60 seconds = 1 minute
      callback: () => {
        this.addEnergy();
      },
      loop: true,
    });

    // Listen to weather changes
    gameEventBus.on("weather:change", () => {
      this.updateEnergyPerMinute();
    });

    // Listen to time of day changes
    gameEventBus.on("time-of-day:change", () => {
      this.updateEnergyPerMinute();
    });

    // Emit initial energy state
    this.emitEnergyUpdate();
  }

  /**
   * Update energy per minute based on current conditions
   */
  private updateEnergyPerMinute(): void {
    if (!this.getWeatherType || !this.getTimeOfDay) {
      return;
    }

    const weatherType = this.getWeatherType();
    const timeOfDay = this.getTimeOfDay();

    this.energyPerMinute = calculateEnergyPerMinute(
      weatherType,
      timeOfDay,
      this.powerUps,
      this.config,
    );

    // Emit update event
    this.emitEnergyUpdate();
  }

  /**
   * Add energy based on current energy per minute
   */
  private addEnergy(): void {
    // Update energy per minute in case conditions changed
    this.updateEnergyPerMinute();

    // Add energy (this is called every minute)
    this.currentEnergy += this.energyPerMinute;

    // Emit update event
    this.emitEnergyUpdate();
  }

  /**
   * Emit energy update event to UI
   */
  private emitEnergyUpdate(): void {
    gameEventBus.emit("energy:update", {
      currentEnergy: this.currentEnergy,
      energyPerMinute: this.energyPerMinute,
      maxEnergyPerMinute: this.config.maxEnergyPerMinute,
    });
  }

  /**
   * Get current energy
   */
  public getCurrentEnergy(): number {
    return this.currentEnergy;
  }

  /**
   * Get current energy per minute
   */
  public getEnergyPerMinute(): number {
    return this.energyPerMinute;
  }

  /**
   * Add power-up
   */
  public addPowerUp(powerUp: PowerUp): void {
    this.powerUps.push(powerUp);
    this.updateEnergyPerMinute();
  }

  /**
   * Remove power-up
   */
  public removePowerUp(powerUpId: string): void {
    this.powerUps = this.powerUps.filter((p) => p.id !== powerUpId);
    this.updateEnergyPerMinute();
  }

  /**
   * Set energy (for loading from save)
   */
  public setEnergy(energy: number): void {
    this.currentEnergy = Math.max(0, energy);
    this.emitEnergyUpdate();
  }

  /**
   * Consume energy
   */
  public consumeEnergy(amount: number): boolean {
    if (this.currentEnergy >= amount) {
      this.currentEnergy -= amount;
      this.emitEnergyUpdate();
      return true;
    }
    return false;
  }

  /**
   * Shutdown system
   */
  public shutdown(): void {
    if (this.minuteTimer) {
      this.minuteTimer.remove();
      this.minuteTimer = undefined;
    }
  }
}
