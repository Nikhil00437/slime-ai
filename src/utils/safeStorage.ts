/**
 * Safe localStorage wrapper with error handling
 * All operations gracefully handle quota exceeded, disabled storage, etc.
 */

const STORAGE_PREFIX = 'mm_';

/**
 * Safely get item from localStorage
 */
export function safeGetItem<T = string>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    // Try to parse as JSON if it looks like JSON
    if (item.startsWith('{') || item.startsWith('[')) {
      return JSON.parse(item) as T;
    }
    return item as unknown as T;
  } catch (e) {
    console.warn(`[LocalStorage] Failed to get "${key}":`, e);
    return null;
  }
}

/**
 * Safely set item in localStorage
 * @returns true if successful, false otherwise
 */
export function safeSetItem<T>(key: string, value: T): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error(`[LocalStorage] Quota exceeded for "${key}"`);
    } else {
      console.warn(`[LocalStorage] Failed to set "${key}":`, e);
    }
    return false;
  }
}

/**
 * Safely remove item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[LocalStorage] Failed to remove "${key}":`, e);
    return false;
  }
}

/**
 * Get parsed JSON from localStorage with fallback
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = `${STORAGE_PREFIX}test`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: boolean } {
  try {
    let used = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage.getItem(key)?.length ?? 0;
      }
    }
    return { used, available: true };
  } catch {
    return { used: 0, available: false };
  }
}