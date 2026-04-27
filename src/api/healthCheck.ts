/**
 * Health Check Endpoint for Self-Hosting
 * Day 9: Enable monitoring + uptime verification
 */

import { ProviderType } from '../types';
import { checkProviderHealth } from './providers';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    browser: boolean;
    localStorage: boolean;
    fileSystemAccess: boolean;
    providers: Record<string, boolean>;
  };
  memory?: {
    used: number;
    total: number;
  };
}

const APP_VERSION = '1.0.0';
let startTime = Date.now();

/**
 * Check if browser supports required APIs
 */
function checkBrowserSupport(): { browser: boolean; localStorage: boolean; fileSystemAccess: boolean } {
  return {
    browser: typeof window !== 'undefined',
    localStorage: (() => {
      try {
        const test = '__health_test__';
        localStorage.setItem(test, '1');
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    })(),
    fileSystemAccess: 'showDirectoryPicker' in window,
  };
}

/**
 * Get memory info if available
 */
function getMemoryInfo(): { used: number; total: number } | undefined {
  if ('memory' in performance && performance.memory) {
    const mem = performance.memory as any;
    return {
      used: Math.round(mem.usedJSHeapSize / 1048576),
      total: Math.round(mem.totalJSHeapSize / 1048576),
    };
  }
  return undefined;
}

/**
 * Run full health check
 */
export async function runHealthCheck(
  providers: Array<{ id: ProviderType; baseUrl: string; apiKey?: string; enabled: boolean }>
): Promise<HealthStatus> {
  const browserChecks = checkBrowserSupport();
  const providerChecks: Record<string, boolean> = {};

  // Check enabled providers
  for (const provider of providers.filter(p => p.enabled)) {
    try {
      const healthy = await Promise.race([
        checkProviderHealth(provider.id, provider.baseUrl, provider.apiKey),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);
      providerChecks[provider.id] = healthy;
    } catch {
      providerChecks[provider.id] = false;
    }
  }

  const allHealthy = Object.values(providerChecks).every(v => v);
  const anyHealthy = Object.values(providerChecks).some(v => v);

  let status: HealthStatus['status'] = 'healthy';
  if (!anyHealthy && providers.filter(p => p.enabled).length > 0) {
    status = 'unhealthy';
  } else if (!allHealthy) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks: {
      ...browserChecks,
      providers: providerChecks,
    },
    memory: getMemoryInfo(),
  };
}

/**
 * Quick health check (no provider checks)
 */
export function quickHealthCheck(): Omit<HealthStatus, 'checks' | 'memory'> & { checks: Omit<HealthStatus['checks'], 'providers'> } {
  const browserChecks = checkBrowserSupport();
  return {
    status: browserChecks.browser && browserChecks.localStorage ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks: browserChecks,
  };
}

/**
 * Create health endpoint response for server
 */
export function createHealthEndpointResponse(status: HealthStatus): Response {
  return new Response(JSON.stringify(status, null, 2), {
    status: status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
