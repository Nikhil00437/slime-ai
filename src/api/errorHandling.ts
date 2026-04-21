import { ProviderType } from '../types';

// ==================== Error Handling ====================

export type ErrorCategory = 
  | 'network'      // Network issues, connectivity
  | 'timeout'     // Request timeout
  | 'rate_limit'  // API rate limit exceeded
  | 'auth'       // Authentication failed
  | 'quota'      // API quota exceeded
  | 'invalid'    // Invalid request/response
  | 'server'      // Server error (5xx)
  | 'unknown';   // Unknown error

export interface ErrorInfo {
  category: ErrorCategory;
  message: string;
  recoverable: boolean;
  retryAfter?: number; // seconds to wait before retry
  fallbackOption?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseBackoff: number; // ms
  maxBackoff: number; // ms
  backoffMultiplier: number;
  retryableCategories: ErrorCategory[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseBackoff: 1000,
  maxBackoff: 30000,
  backoffMultiplier: 2,
  retryableCategories: ['network', 'timeout', 'rate_limit', 'server'],
};

// ==================== Circuit Breaker ====================

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half_open';
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

const DEFAULT_CIRCUIT_BREAKER = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  halfOpenMaxCalls: 3,
};

export function getCircuitBreakerKey(provider: ProviderType, modelId: string): string {
  return `${provider}:${modelId}`;
}

export function getCircuitBreaker(key: string): CircuitBreakerState {
  return circuitBreakers.get(key) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  };
}

export function recordSuccess(key: string): void {
  const cb = circuitBreakers.get(key);
  if (!cb) return;
  
  if (cb.state === 'half_open') {
    // Success in half-open state - close the circuit
    circuitBreakers.set(key, { ...cb, state: 'closed', failures: 0 });
  } else {
    // Reset failure count on success
    circuitBreakers.set(key, { ...cb, failures: 0 });
  }
}

export function recordFailure(key: string): void {
  const cb = circuitBreakers.get(key) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  };
  
  const newFailures = cb.failures + 1;
  const now = Date.now();
  
  // Check if we should open the circuit
  if (newFailures >= DEFAULT_CIRCUIT_BREAKER.failureThreshold) {
    circuitBreakers.set(key, {
      failures: newFailures,
      lastFailure: now,
      state: 'open',
    });
  } else {
    circuitBreakers.set(key, {
      ...cb,
      failures: newFailures,
      lastFailure: now,
    });
  }
}

export function isCircuitOpen(key: string): boolean {
  const cb = getCircuitBreaker(key);
  const now = Date.now();
  
  if (cb.state === 'closed') return false;
  
  // Check if recovery timeout has passed
  if (cb.state === 'open' && now - cb.lastFailure > DEFAULT_CIRCUIT_BREAKER.recoveryTimeout) {
    // Transition to half-open
    circuitBreakers.set(key, { ...cb, state: 'half_open' });
    return false;
  }
  
  return cb.state === 'open';
}

// ==================== Error Categorization ====================

export function categorizeError(error: any): ErrorInfo {
  const message = error?.message || String(error);
  const lowerMessage = message.toLowerCase();
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connect')) {
    return { category: 'network', message, recoverable: true };
  }
  
  // Timeout
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return { category: 'timeout', message, recoverable: true, retryAfter: 10 };
  }
  
  // Rate limit
  if (lowerMessage.includes('rate') || lowerMessage.includes('too many requests')) {
    const retryMatch = message.match(/(\d+)\s*(?:second|sec)/i);
    const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;
    return { category: 'rate_limit', message, recoverable: true, retryAfter };
  }
  
  // Auth
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('auth') || lowerMessage.includes('api key')) {
    return { category: 'auth', message, recoverable: false };
  }
  
  // Quota
  if (lowerMessage.includes('quota') || lowerMessage.includes('limit') || lowerMessage.includes('credit')) {
    return { category: 'quota', message, recoverable: false };
  }
  
  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503') || lowerMessage.includes('server')) {
    return { category: 'server', message, recoverable: true, retryAfter: 30 };
  }
  
  // Invalid
  if (lowerMessage.includes('invalid') || lowerMessage.includes('parse') || lowerMessage.includes('json')) {
    return { category: 'invalid', message, recoverable: false };
  }
  
  return { category: 'unknown', message, recoverable: true };
}

// ==================== Retry with Backoff ====================

export interface RetryOptions<T> {
  maxRetries?: number;
  baseBackoff?: number;
  maxBackoff?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: ErrorInfo) => void;
  shouldRetry?: (error: ErrorInfo) => boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions<T> = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    baseBackoff = DEFAULT_RETRY_CONFIG.baseBackoff,
    maxBackoff = DEFAULT_RETRY_CONFIG.maxBackoff,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
    onRetry,
    shouldRetry,
  } = options;
  
  let lastError: ErrorInfo | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = categorizeError(error);
      
      // Check if we should retry
      const shouldRetryResult = shouldRetry 
        ? shouldRetry(lastError) 
        : DEFAULT_RETRY_CONFIG.retryableCategories.includes(lastError.category);
      
      if (!shouldRetryResult || attempt >= maxRetries) {
        throw error;
      }
      
      // Notify callback
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      // Calculate backoff
      const backoffMs = Math.min(
        maxBackoff,
        baseBackoff * Math.pow(backoffMultiplier, attempt)
      );
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  throw new Error(lastError?.message || 'Max retries exceeded');
}

// ==================== Fallback Model Switching ====================

export interface FallbackChain {
  primary: { provider: ProviderType; modelId: string };
  fallbacks: Array<{ provider: ProviderType; modelId: string }>;
}

export function createFallbackChain(
  primary: { provider: ProviderType; modelId: string },
  ...fallbacks: Array<{ provider: ProviderType; modelId: string }>
): FallbackChain {
  return {
    primary,
    fallbacks,
  };
}

export async function executeWithFallback<T>(
  fallbackChain: FallbackChain,
  executeFn: (provider: ProviderType, modelId: string) => Promise<T>,
  onFallback: (error: ErrorInfo, from: string, to: string) => void
): Promise<T> {
  const allModels = [fallbackChain.primary, ...fallbackChain.fallbacks];
  
  for (let i = 0; i < allModels.length; i++) {
    const current = allModels[i];
    const key = getCircuitBreakerKey(current.provider, current.modelId);
    
    // Check circuit breaker
    if (isCircuitOpen(key)) {
      console.log(`[ErrorHandling] Circuit open for ${key}, skipping...`);
      continue;
    }
    
    try {
      const result = await executeFn(current.provider, current.modelId);
      recordSuccess(key);
      return result;
    } catch (error: any) {
      const errorInfo = categorizeError(error);
      recordFailure(key);
      
      // If no more fallbacks, throw
      if (i >= allModels.length - 1) {
        throw error;
      }
      
      const next = allModels[i + 1];
      onFallback(
        errorInfo,
        `${current.provider}:${current.modelId}`,
        `${next.provider}:${next.modelId}`
      );
    }
  }
  
  throw new Error('All fallback models exhausted');
}

// ==================== Error Display ====================

export function getErrorDisplayInfo(error: ErrorInfo): { icon: string; color: string; action: string } {
  switch (error.category) {
    case 'network':
      return { icon: '📡', color: 'yellow', action: 'Checking connection...' };
    case 'timeout':
      return { icon: '⏱️', color: 'yellow', action: 'Retrying...' };
    case 'rate_limit':
      return { icon: '🚦', color: 'orange', action: `Wait ${error.retryAfter}s` };
    case 'auth':
      return { icon: '🔐', color: 'red', action: 'Check API key' };
    case 'quota':
      return { icon: '💳', color: 'red', action: 'Check quota' };
    case 'server':
      return { icon: '🔧', color: 'yellow', action: 'Retrying...' };
    case 'invalid':
      return { icon: '❌', color: 'red', action: 'Cannot recover' };
    default:
      return { icon: '⚠️', color: 'yellow', action: 'Retrying...' };
  }
}