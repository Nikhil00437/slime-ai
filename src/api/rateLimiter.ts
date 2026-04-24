/**
 * API Rate Limiter & Request Throttling
 * Prevents provider bans + controls costs
 */

interface RateLimitConfig {
  maxRequests: number;      // Max requests per window
  windowMs: number;         // Time window in milliseconds
  retryAfterMs?: number;    // Extra wait time on limit hit
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

// Default configs per provider
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Cloud providers (strict limits)
  openai: { maxRequests: 60, windowMs: 60000 },        // 60 req/min
  anthropic: { maxRequests: 50, windowMs: 60000 },  // 50 req/min
  openrouter: { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  gemini: { maxRequests: 60, windowMs: 60000 },       // 60 req/min
  grok: { maxRequests: 30, windowMs: 60000 },       // 30 req/min
  // Local providers (relaxed)
  ollama: { maxRequests: 500, windowMs: 60000 },
  lmstudio: { maxRequests: 500, windowMs: 60000 },
};

// Provider-specific override
export function getRateLimit(provider: string): RateLimitConfig {
  return DEFAULT_RATE_LIMITS[provider] || { maxRequests: 100, windowMs: 60000 };
}

// In-memory tracking (per-session)
const limitState = new Map<string, RateLimitState>();

/**
 * Check if request is allowed under rate limit
 * @returns { allowed: boolean, retryAfter: number | null }
 */
export function checkRateLimit(provider: string): { allowed: boolean; retryAfter: number | null } {
  const config = getRateLimit(provider);
  const now = Date.now();
  
  let state = limitState.get(provider);
  
  // First request or window expired
  if (!state || now > state.resetTime) {
    limitState.set(provider, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, retryAfter: null };
  }
  
  // Within limit
  if (state.count < config.maxRequests) {
    state.count++;
    limitState.set(provider, state);
    return { allowed: true, retryAfter: null };
  }
  
  // Over limit - calculate retry time
  const retryAfter = state.resetTime - now;
  return { allowed: false, retryAfter: Math.max(0, retryAfter) };
}

/**
 * Wait for rate limit to reset (for automatic retry)
 */
export async function waitForRateLimit(provider: string): Promise<void> {
  const { retryAfter } = checkRateLimit(provider);
  if (retryAfter) {
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }
}

/**
 * Reset rate limit for provider (manual clear)
 */
export function resetRateLimit(provider: string): void {
  limitState.delete(provider);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(provider: string): { remaining: number; resetIn: number } | null {
  const config = getRateLimit(provider);
  const state = limitState.get(provider);
  const now = Date.now();
  
  if (!state || now > state.resetTime) {
    return { remaining: config.maxRequests, resetIn: config.windowMs };
  }
  
  return {
    remaining: Math.max(0, config.maxRequests - state.count),
    resetIn: state.resetTime - now
  };
}