import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => {
      result.current[1]('updated');
    });
    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe('"updated"');
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage<number>('counter', 0));
    act(() => {
      result.current[1](prev => prev + 1);
    });
    expect(result.current[0]).toBe(1);
    expect(localStorage.getItem('counter')).toBe('1');
  });

  it('removes key and resets to initial value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => {
      result.current[1]('stored');
    });
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('handles complex objects', () => {
    const initial = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('obj-key', initial));

    act(() => {
      result.current[1]({ name: 'updated', count: 42 });
    });
    expect(result.current[0]).toEqual({ name: 'updated', count: 42 });
    expect(JSON.parse(localStorage.getItem('obj-key')!)).toEqual({ name: 'updated', count: 42 });
  });

  it('handles JSON parse errors gracefully and falls back', () => {
    localStorage.setItem('corrupt', '{invalid json}');
    const { result } = renderHook(() => useLocalStorage('corrupt', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('handles getItem errors gracefully and falls back', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('StorageError');
    });
    const { result } = renderHook(() => useLocalStorage('error-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
    getItemSpy.mockRestore();
  });

  it('handles setItem errors during write and keeps in-memory state', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    act(() => {
      result.current[1]('new-value');
    });

    // Value should still update in memory even if localStorage.write fails
    expect(result.current[0]).toBe('new-value');
    setItemSpy.mockRestore();
  });

  it('handles removeItem errors gracefully', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => {
      result.current[1]('stored');
    });
    expect(result.current[0]).toBe('stored');

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('StorageError');
    });

    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
    removeItemSpy.mockRestore();
  });
});
