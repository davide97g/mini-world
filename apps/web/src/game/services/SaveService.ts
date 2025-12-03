/**
 * SaveService - Handles game state persistence in browser localStorage
 * Supports multiple game worlds with full state saving
 */

export interface GameSaveData {
  // World metadata
  worldId: string;
  worldName: string;
  createdAt: number;
  lastPlayedAt: number;
  totalPlayTime: number; // in milliseconds
  sessionStartTime?: number; // when current session started

  // Player state
  playerPosition: {
    x: number;
    y: number;
    direction?: string;
  };

  // Inventory state
  inventory: Record<string, number>; // itemId -> quantity

  // Map state
  tileCollectionCounts: Record<string, number>; // "tileX,tileY" -> count
  modifiedTiles: Array<{
    x: number;
    y: number;
    gid: number;
    collides: boolean;
  }>; // Tiles that were placed/modified (e.g., trees)
  hiddenTiles: Array<{
    x: number;
    y: number;
  }>; // Tiles that were collected and hidden

  // Game settings (per-world)
  musicVolume: number;
  isMuted: boolean;
}

export interface WorldMetadata {
  worldId: string;
  worldName: string;
  createdAt: number;
  lastPlayedAt: number;
  totalPlayTime: number;
}

const STORAGE_KEY_PREFIX = "mini-world-save-";
const WORLDS_LIST_KEY = "mini-world-worlds-list";
const CURRENT_WORLD_KEY = "mini-world-current-world";

/**
 * Add world ID to the worlds list
 */
const addWorldToList = (worldId: string): void => {
  try {
    const worldsJson = localStorage.getItem(WORLDS_LIST_KEY);
    const worldIds: string[] = worldsJson ? JSON.parse(worldsJson) : [];

    if (!worldIds.includes(worldId)) {
      worldIds.push(worldId);
      localStorage.setItem(WORLDS_LIST_KEY, JSON.stringify(worldIds));
    }
  } catch (error) {
    console.error("Error adding world to list:", error);
  }
};

/**
 * Remove world ID from the worlds list
 */
const removeWorldFromList = (worldId: string): void => {
  try {
    const worldsJson = localStorage.getItem(WORLDS_LIST_KEY);
    if (!worldsJson) return;

    const worldIds: string[] = JSON.parse(worldsJson);
    const filtered = worldIds.filter((id) => id !== worldId);
    localStorage.setItem(WORLDS_LIST_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing world from list:", error);
  }
};

/**
 * Load game state
 */
export const loadGame = (worldId: string): GameSaveData | null => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${worldId}`;
    const saveJson = localStorage.getItem(storageKey);
    if (!saveJson) return null;

    const saveData = JSON.parse(saveJson) as GameSaveData;
    return saveData;
  } catch (error) {
    console.error("Error loading game:", error);
    return null;
  }
};

/**
 * Save game state
 */
export const saveGame = (saveData: GameSaveData): void => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${saveData.worldId}`;
    localStorage.setItem(storageKey, JSON.stringify(saveData));
    addWorldToList(saveData.worldId);
  } catch (error) {
    console.error("Error saving game:", error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      alert(
        "Storage quota exceeded! Please delete some old saves or clear browser storage.",
      );
    }
  }
};

/**
 * Get list of all saved worlds
 */
export const getAllWorlds = (): WorldMetadata[] => {
  try {
    const worldsJson = localStorage.getItem(WORLDS_LIST_KEY);
    if (!worldsJson) return [];

    const worldIds: string[] = JSON.parse(worldsJson);
    const worlds: WorldMetadata[] = [];

    for (const worldId of worldIds) {
      const saveData = loadGame(worldId);
      if (saveData) {
        worlds.push({
          worldId: saveData.worldId,
          worldName: saveData.worldName,
          createdAt: saveData.createdAt,
          lastPlayedAt: saveData.lastPlayedAt,
          totalPlayTime: saveData.totalPlayTime,
        });
      }
    }

    // Sort by last played (most recent first)
    return worlds.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  } catch (error) {
    console.error("Error loading worlds list:", error);
    return [];
  }
};

/**
 * Create a new world save
 */
export const createWorld = (worldName: string): string => {
  const worldId = `world-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const now = Date.now();

  const saveData: GameSaveData = {
    worldId,
    worldName,
    createdAt: now,
    lastPlayedAt: now,
    totalPlayTime: 0,
    sessionStartTime: now,
    playerPosition: {
      x: 0,
      y: 0,
    },
    inventory: {},
    tileCollectionCounts: {},
    modifiedTiles: [],
    hiddenTiles: [],
    musicVolume: 0.5,
    isMuted: false,
  };

  saveGame(saveData);
  addWorldToList(worldId);
  setCurrentWorld(worldId);

  return worldId;
};

/**
 * Delete a world save
 */
export const deleteWorld = (worldId: string): boolean => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${worldId}`;
    localStorage.removeItem(storageKey);
    removeWorldFromList(worldId);

    // If this was the current world, clear it
    const currentWorldId = getCurrentWorldId();
    if (currentWorldId === worldId) {
      localStorage.removeItem(CURRENT_WORLD_KEY);
    }

    return true;
  } catch (error) {
    console.error("Error deleting world:", error);
    return false;
  }
};

/**
 * Get current active world ID
 */
export const getCurrentWorldId = (): string | null => {
  return localStorage.getItem(CURRENT_WORLD_KEY);
};

/**
 * Set current active world ID
 */
export const setCurrentWorld = (worldId: string): void => {
  localStorage.setItem(CURRENT_WORLD_KEY, worldId);
};

/**
 * Update last played time and calculate session playtime
 */
export const updatePlayTime = (worldId: string): void => {
  const saveData = loadGame(worldId);
  if (!saveData) return;

  const now = Date.now();

  // If session started, calculate elapsed time
  if (saveData.sessionStartTime) {
    const sessionTime = now - saveData.sessionStartTime;
    saveData.totalPlayTime += sessionTime;
    saveData.sessionStartTime = now; // Reset session start
  } else {
    saveData.sessionStartTime = now;
  }

  saveData.lastPlayedAt = now;
  saveGame(saveData);
};

/**
 * Start tracking playtime for a session
 */
export const startSession = (worldId: string): void => {
  const saveData = loadGame(worldId);
  if (!saveData) return;

  saveData.sessionStartTime = Date.now();
  saveData.lastPlayedAt = Date.now();
  saveGame(saveData);
};

/**
 * Stop tracking playtime (called when leaving game)
 */
export const stopSession = (worldId: string): void => {
  updatePlayTime(worldId);
  const saveData = loadGame(worldId);
  if (!saveData) return;

  saveData.sessionStartTime = undefined;
  saveGame(saveData);
};

/**
 * Format playtime for display
 */
export const formatPlayTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};
