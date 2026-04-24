/**
 * Retry Logic with Exponential Backoff
 * And Request Timeout Handling
 */

import { ProviderType } from '../types';

// ==================== Timeouts ====================

// Default timeouts per provider (ms)
export const REQUEST_TIMEOUTS: Record<ProviderType, number> = {
  ollama: 120000,      // 2 min - local can be slow
  lmstudio: 120000,
  openrouter: 60000,  // 1 min
  openai: 60000,
  anthropic: 60000,
  gemini: 60000,
  grok: 60000,
};

/**
 * Get timeout for provider
 */
export function getRequestTimeout(provider: ProviderType): number {
  return REQUEST_TIMEOUTS[provider] || 60000;
}

// ==================== Retry Configuration ====================

export interface RetryConfig {
  maxRetries: number;      // Max retry attempts
  baseDelayMs: number;    // Base delay between retries
  maxDelayMs: number;      // Max delay cap
  backoffMultiplier: number; // Exponential factor
  retryableErrors: number[]; // HTTP codes to retry
}

/**
 * Default retry configs per provider type
 */
export const RETRY_CONFIGS: Record<ProviderType, RetryConfig> = {
  // Local providers - lenient (unlikely to rate limit)
  ollama: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  lmstudio: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  // Cloud providers - stricter
  openrouter: { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  openai: { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  anthropic: { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  gemini: { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
  grok: { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] },
};

/**
 * Get retry config for provider
 */
export function getRetryConfig(provider: ProviderType): RetryConfig {
  return RETRY_CONFIGS[provider] || { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2, retryableErrors: [429, 500, 502, 503, 504] };
}

/**
 * Calculate delay for retry attempt (exponential backoff)
 */
export function calculateRetryDelay(config: RetryConfig, attempt: number): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const capped = Math.min(delay, config.maxDelayMs);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = capped * 0.1 * (Math.random() * 2 - 1);
  return Math.round(capped + jitter);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: string | number, config: RetryConfig): boolean {
  // Network errors
  if (typeof error === 'string') {
    const networkErrors = ['fetch', 'network', 'timeout', 'connection', 'ECONNREFUSED', 'ENOTFOUND'];
    return networkErrors.some(e => error.toLowerCase().includes(e.toLowerCase()));
  }
  // HTTP status codes
  return config.retryableErrors.includes(error);
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutError || `Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (e) {
    clearTimeout(timeoutId!);
    throw e;
  }
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      
      // Check if should retry
      if (attempt < config.maxRetries && isRetryableError(lastError.message, config)) {
        const delay = calculateRetryDelay(config, attempt);
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable or max retries reached
      throw lastError;
    }
  }
  
  throw lastError!;
}

/**
 * Execute with both timeout and retry
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  provider: ProviderType,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const timeout = getRequestTimeout(provider);
  const config = getRetryConfig(provider);
  
  return withRetry(
    () => withTimeout(fn(), timeout),
    config,
    onRetry
  );
}