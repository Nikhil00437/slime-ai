/**
 * Local Error Logging (Opt-in)
 * Day 6: Debug issues without sending data externally
 */

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogConfig {
  enabled: boolean;
  maxEntries: number;
  includeStackTrace: boolean;
  persistToStorage: boolean;
}

const DEFAULT_CONFIG: ErrorLogConfig = {
  enabled: true,
  maxEntries: 500,
  includeStackTrace: true,
  persistToStorage: true,
};

const STORAGE_KEY = 'mm_error_logs';

let config: ErrorLogConfig = { ...DEFAULT_CONFIG };
let logs: LogEntry[] = [];
let isInitialized = false;

/**
 * Initialize error logging
 */
export function initErrorLogging(userConfig?: Partial<ErrorLogConfig>): void {
  config = { ...DEFAULT_CONFIG, ...userConfig };

  if (config.persistToStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          logs = parsed.slice(-config.maxEntries);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  isInitialized = true;

  // Hook into global error handlers
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      logError({
        level: 'error',
        message: String(message),
        stack: error?.stack,
        metadata: { source, lineno, colno, type: 'global' },
      });
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    window.addEventListener('unhandledrejection', (event) => {
      logError({
        level: 'error',
        message: String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        metadata: { type: 'unhandledrejection' },
      });
    });
  }
}

/**
 * Log an error
 */
export function logError(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
  if (!isInitialized) {
    initErrorLogging();
  }

  if (!config.enabled) return;

  const logEntry: LogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    stack: config.includeStackTrace ? entry.stack : undefined,
  };

  logs.push(logEntry);

  // Trim to max entries
  if (logs.length > config.maxEntries) {
    logs = logs.slice(-config.maxEntries);
  }

  // Persist
  if (config.persistToStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // Storage might be full
    }
  }

  // Also log to console in development
  if ((import.meta as any).env?.DEV) {
    console.log('[ErrorLog]', logEntry);
  }
}

/**
 * Log a warning
 */
export function logWarn(message: string, metadata?: Record<string, unknown>): void {
  logError({ level: 'warn', message, metadata });
}

/**
 * Log info
 */
export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  logError({ level: 'info', message, metadata });
}

/**
 * Get all logs
 */
export function getLogs(): LogEntry[] {
  return [...logs];
}

/**
 * Get logs filtered by level
 */
export function getLogsByLevel(level: LogEntry['level']): LogEntry[] {
  return logs.filter(l => l.level === level);
}

/**
 * Get logs within time range
 */
export function getLogsInRange(startTime: number, endTime: number): LogEntry[] {
  return logs.filter(l => l.timestamp >= startTime && l.timestamp <= endTime);
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logs = [];
  if (config.persistToStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Export logs as JSON string
 */
export function exportLogs(): string {
  return JSON.stringify(logs, null, 2);
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  last24h: number;
  last7d: number;
} {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  return {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warn').length,
    infos: logs.filter(l => l.level === 'info').length,
    last24h: logs.filter(l => l.timestamp > dayAgo).length,
    last7d: logs.filter(l => l.timestamp > weekAgo).length,
  };
}
