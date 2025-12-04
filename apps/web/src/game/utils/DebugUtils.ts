/**
 * Debug logging utilities
 */

import { DEBUG } from "../config/GameConstants";

export const debugLog = (...args: unknown[]): void => {
  if (DEBUG) {
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]): void => {
  if (DEBUG) {
    console.warn(...args);
  }
};
