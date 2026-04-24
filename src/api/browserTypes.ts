import type { Browser, BrowserContext, Page } from 'playwright';

// ============== Session Types ==============

export interface BrowserSession {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  history: PageHistoryEntry[];
  createdAt: number;
  lastActive: number;
}

export interface PageHistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

// ============== Tool Result Types ==============

export interface BrowserToolResult {
  success: boolean;
  data?: BrowserToolData;
  error?: string;
  screenshot?: string;
}

export interface BrowserToolData {
  // Common
  url?: string;
  title?: string;
  
  // Scrape results
  content?: string;
  elements?: ExtractedElement[];
  
  // Screenshot results
  base64?: string;
  width?: number;
  height?: number;
  
  // Cookie results
  cookies?: CookieData[];
  
  // Action results
  clickedElement?: string;
  filledFields?: string[];
  selectedOptions?: string[];
  scrollPosition?: number;
  
  // History
  history?: PageHistoryEntry[];
  
  // Status
  success?: boolean;
}

export interface ExtractedElement {
  tag: string;
  text: string;
  href?: string;
  src?: string;
  attributes?: Record<string, string>;
}

// ============== Action Types ==============

export type BrowserAction = 
  | ClickAction 
  | FillAction 
  | SelectAction 
  | ScrollAction 
  | HoverAction
  | PressKeyAction;

export interface ClickAction {
  type: 'click';
  selector: string;
  button?: 'left' | 'right' | 'middle';
  double?: boolean;
}

export interface FillAction {
  type: 'fill';
  selector: string;
  value: string;
  pressEnter?: boolean;
}

export interface SelectAction {
  type: 'select';
  selector: string;
  value?: string;
  values?: string[];
}

export interface ScrollAction {
  type: 'scroll';
  selector?: string;
  x?: number;
  y?: number;
  percentage?: number; // 0-100
}

export interface HoverAction {
  type: 'hover';
  selector: string;
}

export interface PressKeyAction {
  type: 'press';
  key: string;
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[];
}

// ============== Cookie Types ==============

export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// ============== Scrape Options ==============

export interface ScrapeOptions {
  selector?: string;
  query?: string;
  fullPage?: boolean;
}

// ============== Browser Options ==============

export interface BrowserOptions {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  args?: string[];
}

export const DEFAULT_BROWSER_OPTIONS: BrowserOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 },
};

// ============== Session Options ==============

export interface SessionOptions {
  name?: string;
  id?: string;
  cookies?: CookieData[];
}

// ============== Error Types ==============

export class BrowserError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export const ERROR_CODES = {
  NAVIGATION_FAILED: 'NAVIGATION_FAILED',
  SELECTOR_NOT_FOUND: 'SELECTOR_NOT_FOUND',
  ACTION_FAILED: 'ACTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  SESSION_CLOSED: 'SESSION_CLOSED',
  COOKIE_FAILED: 'COOKIE_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;
