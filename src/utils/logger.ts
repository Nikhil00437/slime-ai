/**
 * Production-safe logger utility
 * - Debug logs only in development
 * - Structured logging with categories
 * - Optional remote logging support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

const LOG_PREFIX = '[Slime]';
// Determine if we're in development mode
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const ENABLE_DEBUG = isDev;

/**
 * Core logging function
 */
function log(level: LogLevel, category: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    category,
    message,
    data,
  };

  const prefix = `${LOG_PREFIX}[${category}]`;
  const formattedData = data !== undefined ? data : '';

  switch (level) {
    case 'debug':
      if (ENABLE_DEBUG) {
        console.debug(prefix, message, formattedData);
      }
      break;
    case 'info':
      console.info(prefix, message, formattedData);
      break;
    case 'warn':
      console.warn(prefix, message, formattedData);
      break;
    case 'error':
      console.error(prefix, message, formattedData);
      break;
  }
}

/**
 * Create a logger instance for a specific category
 */
export function createLogger(category: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', category, message, data),
    info: (message: string, data?: unknown) => log('info', category, message, data),
    warn: (message: string, data?: unknown) => log('warn', category, message, data),
    error: (message: string, data?: unknown) => log('error', category, message, data),
    category,
  };
}

// Pre-configured loggers for common modules
export const logger = {
  app: createLogger('App'),
  memory: createLogger('Memory'),
  vault: createLogger('Vault'),
  provider: createLogger('Provider'),
  tools: createLogger('Tools'),
  chat: createLogger('Chat'),
  ui: createLogger('UI'),
};

// Default export
export default createLogger;