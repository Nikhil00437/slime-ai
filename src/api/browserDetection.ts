/**
 * Browser Detection Module
 * Detects browser type and capabilities for Vault support
 */

export type BrowserType = 'chrome' | 'brave' | 'edge' | 'opera' | 'firefox' | 'safari' | 'unknown';

export interface BrowserCapabilities {
  supportsFileSystemAccess: boolean;
  supportsShowOpenFilePicker: boolean;
  supportsShowSaveFilePicker: boolean;
  supportsShowDirectoryPicker: boolean;
  supportsMultipleSelection: boolean;
  requiresFallback: boolean;
}

export interface BrowserInfo {
  browser: BrowserType;
  browserName: string;
  capabilities: BrowserCapabilities;
  isRecommended: boolean;
  isChromiumBased: boolean;
  version?: string;
}

/**
 * Detect the current browser type
 */
export function detectBrowserType(): BrowserType {
  const ua = navigator.userAgent;

  if (ua.includes('Brave')) return 'brave';
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'opera';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Chrome')) return 'chrome';

  return 'unknown';
}

/**
 * Check if the browser supports the File System Access API
 */
export function checkFileSystemAccessSupport(): boolean {
  return 'showOpenFilePicker' in window;
}

/**
 * Check if the browser supports showSaveFilePicker
 */
export function checkShowSaveFilePickerSupport(): boolean {
  return 'showSaveFilePicker' in window;
}

/**
 * Check if the browser supports showDirectoryPicker
 */
export function checkShowDirectoryPickerSupport(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Get browser capabilities
 */
export function getBrowserCapabilities(): BrowserCapabilities {
  const hasFSA = checkFileSystemAccessSupport();
  const hasSavePicker = checkShowSaveFilePickerSupport();
  const hasDirPicker = checkShowDirectoryPickerSupport();
  const browserType = detectBrowserType();

  // Firefox and Safari require fallback
  const requiresFallback = browserType === 'firefox' || 
    (browserType === 'safari' && !hasFSA);

  return {
    supportsFileSystemAccess: hasFSA && (browserType === 'chrome' || browserType === 'brave' || browserType === 'edge' || browserType === 'opera'),
    supportsShowOpenFilePicker: hasFSA,
    supportsShowSaveFilePicker: hasSavePicker,
    supportsShowDirectoryPicker: hasDirPicker,
    supportsMultipleSelection: hasFSA,
    requiresFallback,
  };
}

/**
 * Get comprehensive browser information
 */
export function getBrowserInfo(): BrowserInfo {
  const browser = detectBrowserType();
  const capabilities = getBrowserCapabilities();

  const browserNames: Record<BrowserType, string> = {
    chrome: 'Google Chrome',
    brave: 'Brave',
    edge: 'Microsoft Edge',
    opera: 'Opera',
    firefox: 'Mozilla Firefox',
    safari: 'Apple Safari',
    unknown: 'Unknown Browser',
  };

  const isChromiumBased = ['chrome', 'brave', 'edge', 'opera'].includes(browser);

  // Extract version if available
  let version: string | undefined;
  const ua = navigator.userAgent;
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  const safariMatch = ua.match(/Version\/(\d+)/);

  if (chromeMatch) version = chromeMatch[1];
  else if (firefoxMatch) version = firefoxMatch[1];
  else if (safariMatch) version = safariMatch[1];

  // Recommended browsers for full vault support
  const recommendedBrowsers: BrowserType[] = ['chrome', 'brave', 'edge', 'opera'];

  return {
    browser,
    browserName: browserNames[browser],
    capabilities,
    isRecommended: recommendedBrowsers.includes(browser),
    isChromiumBased,
    version,
  };
}

/**
 * Check if the current browser supports full vault features
 */
export function supportsFullVault(): boolean {
  const capabilities = getBrowserCapabilities();
  return capabilities.supportsFileSystemAccess;
}

/**
 * Check if fallback mode is required
 */
export function requiresFallbackMode(): boolean {
  const capabilities = getBrowserCapabilities();
  return capabilities.requiresFallback;
}

/**
 * Get a human-readable message about browser vault support
 */
export function getVaultSupportMessage(): string {
  const info = getBrowserInfo();

  if (info.capabilities.supportsFileSystemAccess) {
    return `${info.browserName} supports full Vault features.`;
  }

  if (info.browser === 'firefox') {
    return `${info.browserName} uses fallback storage (IndexedDB). Some features may be limited.`;
  }

  if (info.browser === 'safari') {
    return `${info.browserName} has limited Vault support. Using fallback storage.`;
  }

  return `${info.browserName} may have limited Vault support.`;
}

/**
 * Get browser icon based on type
 */
export function getBrowserIcon(): string {
  const browser = detectBrowserType();

  const icons: Record<BrowserType, string> = {
    chrome: '🔵',
    brave: '🦁',
    edge: '🌐',
    opera: '🔴',
    firefox: '🦊',
    safari: '🧭',
    unknown: '❓',
  };

  return icons[browser];
}

/**
 * Get storage limit for fallback mode (in bytes)
 */
export function getFallbackStorageLimit(): number {
  // Default to 50MB for IndexedDB fallback
  return 50 * 1024 * 1024;
}

/**
 * Check if the browser is running in a secure context
 * (required for File System Access API)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Get detailed browser environment info
 */
export function getEnvironmentInfo(): {
  isSecureContext: boolean;
  isLocalhost: boolean;
  protocol: string;
  platform: string;
} {
  return {
    isSecureContext: isSecureContext(),
    isLocalhost: window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1',
    protocol: window.location.protocol,
    platform: navigator.platform,
  };
}