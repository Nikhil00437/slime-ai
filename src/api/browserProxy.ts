// Browser automation via backend proxy
// Reads VITE_PROXY_URL from vault .env when vault is connected

import { restoreVaultHandle, loadEnvFromVault } from './vault';

export interface BrowserProxyOptions {
  action?: 'fetch' | 'screenshot' | 'click' | 'fill';
  timeout?: number;
  maxLength?: number;
  fullPage?: boolean;
  selector?: string;
  value?: string;
  submit?: string;
  waitForNavigation?: boolean;
}

export interface BrowserProxyResult {
  success: boolean;
  data?: {
    title?: string;
    text?: string;
    url?: string;
    image?: string;
    meta?: Record<string, string>;
  };
  error?: string;
  details?: string;
}

// Cache the proxy URL from vault
let cachedProxyUrl: string | null = null;

export async function getProxyUrl(): Promise<string | null> {
  // Return cached value if available
  if (cachedProxyUrl !== null) {
    return cachedProxyUrl;
  }

  // Check if vault is connected
  const handle = await restoreVaultHandle();
  if (!handle) {
    return null;
  }

  try {
    // Load .env from vault
    const env = await loadEnvFromVault();
    cachedProxyUrl = env.VITE_PROXY_URL || null;
    return cachedProxyUrl;
  } catch {
    return null;
  }
}

// Clear cache when vault changes
export function clearProxyCache(): void {
  cachedProxyUrl = null;
}

export async function automateProxy(
  url: string,
  options: BrowserProxyOptions = {}
): Promise<BrowserProxyResult> {
  const proxyUrl = await getProxyUrl();
  const TOOL_TIMEOUT = 10000; // 10 second timeout for browser harness tools

  if (!proxyUrl) {
    return { 
      success: false, 
      error: 'Proxy not configured. Add VITE_PROXY_URL to your vault .env file.' 
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOOL_TIMEOUT);
    
    const response = await fetch(`${proxyUrl}/api/automate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { 
        success: false, 
        error: error.error || `HTTP ${response.status}`,
        details: error.details,
      };
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: `Browser proxy request timed out after 10 seconds`,
      };
    }
    return { 
      success: false, 
      error: 'Network error connecting to proxy',
      details: error.message,
    };
  }
}

// Check if proxy is available
export async function checkProxyHealth(): Promise<{ available: boolean; uptime?: number }> {
  const proxyUrl = await getProxyUrl();
  
  if (!proxyUrl) {
    return { available: false };
  }

  try {
    const response = await fetch(`${proxyUrl}/health`);
    if (response.ok) {
      const data = await response.json();
      return { available: true, uptime: data.uptime };
    }
  } catch {
    // Proxy not available
  }
  
  return { available: false };
}

// Check if proxy is configured
export async function isProxyConfigured(): Promise<boolean> {
  const url = await getProxyUrl();
  return !!url;
}