// Playwright is optional - only works in environments with Node.js
import type { Browser as PlaywrightBrowser, BrowserContext, Page } from 'playwright';
import {
  BrowserSession,
  DEFAULT_BROWSER_OPTIONS,
  BrowserOptions,
} from './browserTypes';

// Dynamic import to handle missing playwright
let chromium: any = null;
let playwrightModule: any = null;

async function loadPlaywright() {
  if (chromium) return chromium;
  
  try {
    playwrightModule = await import('playwright');
    chromium = playwrightModule.chromium;
    return chromium;
  } catch {
    chromium = null;
    return null;
  }
}

function isPlaywrightAvailable(): boolean {
  return chromium !== null;
}

// ============== State ==============

let browser: PlaywrightBrowser | null = null;
const sessions: Map<string, BrowserSession> = new Map();

// Default configuration
const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ============== Utility Functions ==============

function generateSessionId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  if (!sanitized || sanitized.length < 2) {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  return sanitized;
}

// ============== Browser Management ==============

/**
 * Get or create the persistent browser instance
 */
export async function getBrowser(): Promise<PlaywrightBrowser> {
  const pw = await loadPlaywright();
  if (!pw) {
    throw new Error('Playwright not available. Browser automation requires a Node.js environment.');
  }
  
  if (!browser || !browser.isConnected()) {
    browser = await pw.chromium.launch({
      headless: DEFAULT_BROWSER_OPTIONS.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        // Common stealth options
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  }
  
  return browser;
}

/**
 * Close the browser entirely
 */
export async function closeBrowser(): Promise<void> {
  // Close all sessions first
  for (const [id] of sessions) {
    await closeSession(id);
  }
  
  // Close browser
  if (browser && browser.isConnected()) {
    await browser.close();
  }
  browser = null;
}

// ============== Session Management ==============

/**
 * Create a new browser session
 */
export async function createSession(
  name?: string,
  options?: {
    cookies?: any[];
    viewport?: { width: number; height: number };
    userAgent?: string;
  }
): Promise<BrowserSession> {
  const playwrightBrowser = await getBrowser();
  
  // Generate session ID
  const sessionId = generateSessionId(name || `session_${Date.now()}`);
  
  // Check if session already exists
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId)!;
    // If existing and connected, return it
    if (existing.context.browser().isConnected()) {
      return existing;
    }
    // Otherwise clean up and recreate
    await closeSessionInternal(sessionId);
  }
  
  // Create new context with options
  const contextOptions: any = {
    viewport: options?.viewport || DEFAULT_BROWSER_OPTIONS.viewport,
  };
  
  if (options?.userAgent) {
    contextOptions.userAgent = options.userAgent;
  }
  
  const context = await playwrightBrowser.newContext(contextOptions);
  const page = await context.newPage();
  
  // Set default timeout
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  
  const session: BrowserSession = {
    id: sessionId,
    name: name || sessionId,
    context,
    page,
    history: [],
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  
  sessions.set(sessionId, session);
  
  return session;
}

/**
 * Get an existing session by name or ID
 */
export async function getSession(name?: string): Promise<BrowserSession | null> {
  const sessionId = generateSessionId(name || 'default');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // Verify it's still connected
  if (!session.context.browser().isConnected()) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * Get or create the default session
 */
export async function getOrCreateSession(name?: string): Promise<BrowserSession> {
  const existing = await getSession(name);
  
  if (existing) {
    return existing;
  }
  
  return createSession(name);
}

/**
 * Close a session by name or ID
 */
export async function closeSession(name?: string): Promise<void> {
  const sessionId = generateSessionId(name || 'default');
  await closeSessionInternal(sessionId);
}

/**
 * Internal close session function
 */
async function closeSessionInternal(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  
  if (session) {
    try {
      await session.context.close();
    } catch {
      // Ignore close errors
    }
    sessions.delete(sessionId);
  }
}

/**
 * Close all sessions
 */
export async function closeAllSessions(): Promise<void> {
  for (const [id] of sessions) {
    await closeSessionInternal(id);
  }
}

/**
 * Get all active sessions
 */
export function getAllSessions(): BrowserSession[] {
  return Array.from(sessions.values()).filter(s => 
    s.context.browser().isConnected()
  );
}

/**
 * Get session info (without the heavy page/context objects)
 */
export function getSessionInfo(name?: string): {
  id: string;
  name: string;
  url: string;
  historyLength: number;
  createdAt: number;
  lastActive: number;
  active: boolean;
} | null {
  const sessionId = generateSessionId(name || 'default');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  return {
    id: session.id,
    name: session.name,
    url: session.page.url(),
    historyLength: session.history.length,
    createdAt: session.createdAt,
    lastActive: session.lastActive,
    active: session.context.browser().isConnected(),
  };
}

// ============== Cleanup ==============

/**
 * Clean up idle sessions
 */
export async function cleanupIdleSessions(
  timeoutMs: number = DEFAULT_IDLE_TIMEOUT
): Promise<number> {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, session] of sessions) {
    if (now - session.lastActive > timeoutMs) {
      await closeSessionInternal(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Start periodic cleanup (call once from app initialization)
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startSessionCleanup(
  intervalMs: number = DEFAULT_IDLE_TIMEOUT,
  checkEveryMs: number = 60000
): void {
  if (cleanupInterval) {
    return; // Already running
  }
  
  cleanupInterval = setInterval(() => {
    cleanupIdleSessions(intervalMs).catch(console.error);
  }, checkEveryMs);
}

export function stopSessionCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// ============== Export ==============

export default {
  getBrowser,
  closeBrowser,
  createSession,
  getSession,
  getOrCreateSession,
  closeSession,
  closeAllSessions,
  getAllSessions,
  getSessionInfo,
  cleanupIdleSessions,
  startSessionCleanup,
  stopSessionCleanup,
};