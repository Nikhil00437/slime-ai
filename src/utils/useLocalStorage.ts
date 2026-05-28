import { useState, useCallback } from 'react';

/**
 * Custom hook for persisting state to localStorage with type safety.
 * Handles JSON serialization/deserialization and SSR safety.
 *
 * @param key - localStorage key
 * @param initialValue - default value if nothing stored
 * @returns [storedValue, setValue, removeValue] tuple
 *
 * @example
 * ```ts
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'dark');
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`[useLocalStorage] Error writing key "${key}":`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    setStoredValue(() => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[useLocalStorage] Error removing key "${key}":`, error);
      }
      return initialValue;
    });
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
