// Playwright is optional
import type { Browser as PlaywrightBrowser, BrowserContext, Page } from 'playwright';
import {
  BrowserToolResult,
  BrowserToolData,
  BrowserAction,
  ClickAction,
  FillAction,
  SelectAction,
  ScrollAction,
  HoverAction,
  PressKeyAction,
  CookieData,
  DEFAULT_BROWSER_OPTIONS,
  BrowserOptions,
  ERROR_CODES,
  BrowserError,
} from './browserTypes';
import { getOrCreateSession, getSession, closeSession } from './browserSession';

// Dynamic import to handle missing playwright
let playwrightModule: any = null;

export async function loadPlaywright() {
  if (playwrightModule !== null) return playwrightModule;
  
  try {
    playwrightModule = await import('playwright');
    return playwrightModule;
  } catch {
    playwrightModule = null;
    return null;
  }
}

export function isPlaywrightAvailable(): boolean {
  return playwrightModule !== null;
}

// ============== Utility Functions ==============

function generateId(): string {
  return `browser_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch {
    // Fallback: try networkidle
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 15000) }).catch(() => {});
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-retryable errors
      if (error instanceof BrowserError && !error.retryable) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============== Core Primitives ==============

/**
 * Navigate to a URL
 */
export async function navigate(
  url: string,
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getOrCreateSession(sessionName);
    const page = session.page;
    const currentHistoryLength = session.history.length;
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Wait for page to be mostly stable
      await waitForPageLoad(page, 15000);
      
      // Add to history
      session.history.push({
        url: page.url(),
        title: await page.title().catch(() => ''),
        timestamp: Date.now(),
      });
      
      session.lastActive = Date.now();
      
      // Take a screenshot to include in result
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      }).catch(() => undefined);
      
      return {
        success: true,
        data: {
          url: page.url(),
          title: await page.title().catch(() => ''),
        },
        screenshot: screenshot ? Buffer.from(screenshot).toString('base64') : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Determine if retryable
      const retryable = errorMessage.includes('timeout') || 
                        errorMessage.includes('net::ERR_') ||
                        errorMessage.includes('connection');
      
      throw new BrowserError(
        `Navigation failed: ${errorMessage}`,
        ERROR_CODES.NAVIGATION_FAILED,
        retryable
      );
    }
  });
}

/**
 * Get current page content
 */
export async function scrape(
  selector?: string,
  query?: string,
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    const page = session.page;
    const elements: BrowserToolData['elements'] = [];
    let content = '';
    
    try {
      if (selector) {
        // Specific selector - extract matching elements
        const matchingElements = await page.locator(selector).all();
        
        for (const el of matchingElements) {
          try {
            const tag = await el.evaluate(e => e.tagName.toLowerCase());
            const text = await el.textContent().then(t => t?.trim()).catch(() => '');
            const href = await el.getAttribute('href').catch(() => undefined);
            const src = await el.getAttribute('src').catch(() => undefined);
            
            const attributes: Record<string, string> = {};
            if (href) attributes.href = href;
            if (src) attributes.src = src;
            
            elements.push({ tag, text, href, src, attributes });
            if (text) content += text + '\n';
          } catch {
            // Skip elements we can't extract from
          }
        }
      } else if (query) {
        // Use text search to find elements containing query
        const matchingElements = await page.getByText(query, { exact: false }).all();
        
        for (const el of matchingElements.slice(0, 20)) {
          try {
            const tag = await el.evaluate(e => e.tagName.toLowerCase());
            const text = await el.textContent().then(t => t?.trim()).catch(() => '');
            
            elements.push({ tag, text });
            if (text) content += text + '\n';
          } catch {
            // Skip
          }
        }
      } else {
        // No selector or query - get all visible text
        content = await page.content().then(html => {
          // Simple HTML to text conversion
          return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()
            .slice(0, 50000); // Limit content size
        });
      }
      
      session.lastActive = Date.now();
      
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      }).catch(() => undefined);
      
      return {
        success: true,
        data: {
          content: content.slice(0, 50000),
          elements: elements.slice(0, 100),
        },
        screenshot: screenshot ? Buffer.from(screenshot).toString('base64') : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BrowserError(
        `Scrape failed: ${errorMessage}`,
        ERROR_CODES.ACTION_FAILED,
        false
      );
    }
  });
}

/**
 * Take a screenshot
 */
export async function screenshot(
  fullPage: boolean = false,
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    const page = session.page;
    
    try {
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage 
      });
      
      const base64 = Buffer.from(screenshot).toString('base64');
      const boundingBox = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      })).catch(() => ({ width: 1280, height: 720 }));
      
      session.lastActive = Date.now();
      
      return {
        success: true,
        data: {
          base64,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BrowserError(
        `Screenshot failed: ${errorMessage}`,
        ERROR_CODES.ACTION_FAILED,
        false
      );
    }
  });
}

/**
 * Perform an action (click, fill, select, scroll)
 */
export async function act(
  action: BrowserAction,
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    const page = session.page;
    const data: BrowserToolData = {};
    
    try {
      switch (action.type) {
        case 'click': {
          const clickAction = action as ClickAction;
          const locator = page.locator(clickAction.selector);
          
          await locator.first().click({ 
            button: clickAction.button || 'left',
            double: clickAction.double || false,
          });
          
          data.clickedElement = clickAction.selector;
          break;
        }
        
        case 'fill': {
          const fillAction = action as FillAction;
          const locator = page.locator(fillAction.selector);
          
          await locator.first().fill(fillAction.value);
          
          if (fillAction.pressEnter) {
            await locator.first().press('Enter');
          }
          
          data.filledFields = [fillAction.selector];
          break;
        }
        
        case 'select': {
          const selectAction = action as SelectAction;
          const locator = page.locator(selectAction.selector);
          
          let selected: string[];
          if (selectAction.values) {
            await locator.first().selectOption(selectAction.values);
            selected = selectAction.values;
          } else if (selectAction.value) {
            await locator.first().selectOption(selectAction.value);
            selected = [selectAction.value];
          }
          
          data.selectedOptions = selected;
          break;
        }
        
        case 'scroll': {
          const scrollAction = action as ScrollAction;
          
          if (scrollAction.selector) {
            const element = page.locator(scrollAction.selector);
            await element.first().scrollIntoViewIfNeeded();
          } else if (scrollAction.percentage !== undefined) {
            // Scroll by percentage of page height
            const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            const viewportHeight = await page.evaluate(() => window.innerHeight);
            const maxScroll = scrollHeight - viewportHeight;
            const y = (scrollAction.percentage / 100) * maxScroll;
            await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
          } else {
            await page.evaluate((opts) => window.scrollTo(opts.x || 0, opts.y || 0), {
              x: scrollAction.x || 0,
              y: scrollAction.y || 0,
            });
          }
          
          data.scrollPosition = scrollAction.y || scrollAction.percentage || 0;
          break;
        }
        
        case 'hover': {
          const hoverAction = action as HoverAction;
          await page.locator(hoverAction.selector).first().hover();
          break;
        }
        
        case 'press': {
          const pressAction = action as PressKeyAction;
          const modifiers = pressAction.modifiers || [];
          
          if (modifiers.length > 0) {
            // Press key combination
            await page.keyboard.press(
              [...modifiers, pressAction.key].join('+')
            );
          } else {
            await page.keyboard.press(pressAction.key);
          }
          break;
        }
      }
      
      // Wait briefly for any navigation that might have been triggered
      await waitForPageLoad(page, 5000).catch(() => {});
      
      session.lastActive = Date.now();
      
      // Take screenshot after action
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      }).catch(() => undefined);
      
      return {
        success: true,
        data: { ...data, success: true },
        screenshot: screenshot ? Buffer.from(screenshot).toString('base64') : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const retryable = errorMessage.includes('timeout') ||
                      errorMessage.includes('Element not found') ||
                      errorMessage.includes('not visible');
      
      throw new BrowserError(
        `Action failed: ${errorMessage}`,
        ERROR_CODES.ACTION_FAILED,
        retryable
      );
    }
  });
}

/**
 * Get cookies from current session
 */
export async function getCookies(
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    try {
      const cookies = await session.context.cookies();
      
      const cookieData: CookieData[] = cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires * 1000, // Convert to ms
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None',
      }));
      
      session.lastActive = Date.now();
      
      return {
        success: true,
        data: {
          cookies: cookieData,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BrowserError(
        `Get cookies failed: ${errorMessage}`,
        ERROR_CODES.COOKIE_FAILED,
        false
      );
    }
  });
}

/**
 * Set cookies in current session
 */
export async function setCookies(
  cookies: CookieData[],
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    try {
      const playrightCookies = cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires ? c.expires / 1000 : undefined, // Convert to seconds
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      }));
      
      await session.context.addCookies(playrightCookies);
      
      session.lastActive = Date.now();
      
      return {
        success: true,
        data: {
          success: true,
          cookies: cookies.map(c => ({ name: c.name, value: c.value })),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BrowserError(
        `Set cookies failed: ${errorMessage}`,
        ERROR_CODES.COOKIE_FAILED,
        false
      );
    }
  });
}

/**
 * Get navigation history
 */
export async function getHistory(
  sessionName?: string
): Promise<BrowserToolResult> {
  const session = await getSession(sessionName || 'default');
  
  if (!session) {
    throw new BrowserError(
      'No active browser session',
      ERROR_CODES.SESSION_CLOSED,
      false
    );
  }
  
  return {
    success: true,
    data: {
      history: session.history,
    },
  };
}

/**
 * Navigate back in history
 */
export async function back(
  sessionName?: string
): Promise<BrowserToolResult> {
  return withRetry(async () => {
    const session = await getSession(sessionName || 'default');
    
    if (!session) {
      throw new BrowserError(
        'No active browser session',
        ERROR_CODES.SESSION_CLOSED,
        false
      );
    }
    
    if (session.history.length < 2) {
      return {
        success: false,
        error: 'No previous page in history',
      };
    }
    
    // Remove current page from history
    session.history.pop();
    
    // Go back to previous
    const previous = session.history[session.history.length - 1];
    const page = session.page;
    
    await page.goto(previous.url, { waitUntil: 'domcontentloaded' });
    await waitForPageLoad(page, 10000).catch(() => {});
    
    session.lastActive = Date.now();
    
    const screenshot = await page.screenshot({ 
      type: 'png',
      fullPage: false 
    }).catch(() => undefined);
    
    return {
      success: true,
      data: {
        url: page.url(),
        title: await page.title().catch(() => ''),
      },
      screenshot: screenshot ? Buffer.from(screenshot).toString('base64') : undefined,
    };
  });
}

/**
 * Navigate forward in history
 */
export async function forward(
  sessionName?: string
): Promise<BrowserToolResult> {
  // Forward is tricky with manual history tracking
  // For now, just indicate it's not supported
  return {
    success: false,
    error: 'Forward navigation not supported. Use navigate() to go to a specific URL.',
  };
}

/**
 * Close a session
 */
export async function close(
  sessionName?: string
): Promise<BrowserToolResult> {
  try {
    await closeSession(sessionName || 'default');
    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============== Export all primitives ==============

export default {
  navigate,
  scrape,
  screenshot,
  act,
  getCookies,
  setCookies,
  getHistory,
  back,
  forward,
  close,
};