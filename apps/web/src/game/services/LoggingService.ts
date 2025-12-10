/**
 * LoggingService - Handles game event logging with timestamps
 * Tracks player accomplishments like steps and animal kills
 */

export interface StepLogEntry {
  type: "step";
  timestamp: number;
}

export interface AnimalKillLogEntry {
  type: "animal_killed";
  timestamp: number;
  animalType: string;
}

export type LogEntry = StepLogEntry | AnimalKillLogEntry;

const STORAGE_KEY_PREFIX = "mini-world-logs-";

/**
 * Get storage key for a specific world's logs
 */
const getStorageKey = (worldId: string): string => {
  return `${STORAGE_KEY_PREFIX}${worldId}`;
};

/**
 * Load logs for a specific world
 */
export const loadLogs = (worldId: string): LogEntry[] => {
  try {
    const storageKey = getStorageKey(worldId);
    const logsJson = localStorage.getItem(storageKey);
    if (!logsJson) return [];

    const logs = JSON.parse(logsJson) as LogEntry[];
    return logs;
  } catch (error) {
    console.error("Error loading logs:", error);
    return [];
  }
};

/**
 * Save logs for a specific world
 */
export const saveLogs = (worldId: string, logs: LogEntry[]): void => {
  try {
    const storageKey = getStorageKey(worldId);
    localStorage.setItem(storageKey, JSON.stringify(logs));
  } catch (error) {
    console.error("Error saving logs:", error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn(
        "Storage quota exceeded for logs. Consider clearing old logs.",
      );
    }
  }
};

/**
 * Add a step log entry
 */
export const logStep = (worldId: string): void => {
  const logs = loadLogs(worldId);
  const entry: StepLogEntry = {
    type: "step",
    timestamp: Date.now(),
  };
  logs.push(entry);
  saveLogs(worldId, logs);
};

/**
 * Add an animal kill log entry
 */
export const logAnimalKill = (worldId: string, animalType: string): void => {
  const logs = loadLogs(worldId);
  const entry: AnimalKillLogEntry = {
    type: "animal_killed",
    timestamp: Date.now(),
    animalType,
  };
  logs.push(entry);
  saveLogs(worldId, logs);
};

/**
 * Get all logs for a specific world
 */
export const getLogs = (worldId: string): LogEntry[] => {
  return loadLogs(worldId);
};

/**
 * Clear all logs for a specific world
 */
export const clearLogs = (worldId: string): void => {
  try {
    const storageKey = getStorageKey(worldId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Error clearing logs:", error);
  }
};

/**
 * Get logs filtered by type
 */
export const getLogsByType = (
  worldId: string,
  type: LogEntry["type"],
): LogEntry[] => {
  const logs = loadLogs(worldId);
  return logs.filter((log) => log.type === type);
};

/**
 * Get step count for a specific world
 */
export const getStepCount = (worldId: string): number => {
  return getLogsByType(worldId, "step").length;
};

/**
 * Get animal kill count for a specific world
 */
export const getAnimalKillCount = (worldId: string): number => {
  return getLogsByType(worldId, "animal_killed").length;
};

/**
 * Get animal kill count by type for a specific world
 */
export const getAnimalKillCountByType = (
  worldId: string,
  animalType: string,
): number => {
  const logs = getLogsByType(worldId, "animal_killed");
  return logs.filter(
    (log) => log.type === "animal_killed" && log.animalType === animalType,
  ).length;
};
