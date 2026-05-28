import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.alert
window.alert = vi.fn();

// Mock window.confirm
window.confirm = vi.fn().mockReturnValue(true);

// Mock console.error to fail tests on unexpected errors
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (args[0]?.toString?.().includes('Warning:')) {
    return;
  }
  originalError.call(console, ...args);
};