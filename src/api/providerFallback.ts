/**
 * Provider Fallback Mechanism
 * Day 8: Auto-switch to backup provider when primary fails
 */

import { ProviderType, Provider, ModelInfo } from '../types';
import { checkProviderHealth } from './providers';

export interface FallbackConfig {
  enabled: boolean;
  fallbackOrder: ProviderType[];
  maxAttempts: number;
  attemptDelayMs: number;
  requireSameModel: boolean;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enabled: true,
  fallbackOrder: ['ollama', 'lmstudio', 'openrouter', 'openai', 'anthropic', 'gemini', 'grok'],
  maxAttempts: 3,
  attemptDelayMs: 1000,
  requireSameModel: false,
};

interface FallbackAttempt {
  provider: ProviderType;
  success: boolean;
  error?: string;
  timestamp: number;
}

let fallbackHistory: FallbackAttempt[] = [];

/**
 * Find next available provider in fallback order
 */
export async function findFallbackProvider(
  currentProvider: ProviderType,
  providers: Provider[],
  config: Partial<FallbackConfig> = {}
): Promise<{ provider: Provider | null; attempts: FallbackAttempt[] }> {
  const cfg = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  const attempts: FallbackAttempt[] = [];

  if (!cfg.enabled) {
    return { provider: null, attempts };
  }

  // Get current provider's index in fallback order
  const currentIndex = cfg.fallbackOrder.indexOf(currentProvider);
  const candidates = [
    ...cfg.fallbackOrder.slice(currentIndex + 1),
    ...cfg.fallbackOrder.slice(0, currentIndex),
  ];

  for (const providerId of candidates) {
    const provider = providers.find(p => p.id === providerId && p.enabled);
    if (!provider) continue;

    try {
      const healthy = await Promise.race([
        checkProviderHealth(providerId, provider.baseUrl, provider.apiKey),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      const attempt: FallbackAttempt = {
        provider: providerId,
        success: healthy,
        timestamp: Date.now(),
      };

      if (!healthy) {
        attempt.error = 'Health check failed';
      }

      attempts.push(attempt);
      fallbackHistory.push(attempt);

      if (healthy) {
        return { provider, attempts };
      }

      // Delay before next attempt
      if (cfg.attemptDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, cfg.attemptDelayMs));
      }
    } catch (e: any) {
      const attempt: FallbackAttempt = {
        provider: providerId,
        success: false,
        error: e.message || 'Unknown error',
        timestamp: Date.now(),
      };
      attempts.push(attempt);
      fallbackHistory.push(attempt);
    }
  }

  return { provider: null, attempts };
}

/**
 * Get fallback history
 */
export function getFallbackHistory(): FallbackAttempt[] {
  return [...fallbackHistory];
}

/**
 * Clear fallback history
 */
export function clearFallbackHistory(): void {
  fallbackHistory = [];
}

/**
 * Check if provider is in fallback order
 */
export function isFallbackCandidate(providerId: ProviderType, config?: Partial<FallbackConfig>): boolean {
  const cfg = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  return cfg.fallbackOrder.includes(providerId);
}

/**
 * Get fallback status summary
 */
export function getFallbackStatus(): {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  lastAttempt: FallbackAttempt | null;
} {
  return {
    totalAttempts: fallbackHistory.length,
    successfulAttempts: fallbackHistory.filter(a => a.success).length,
    failedAttempts: fallbackHistory.filter(a => !a.success).length,
    lastAttempt: fallbackHistory.length > 0 ? fallbackHistory[fallbackHistory.length - 1] : null,
  };
}
