/**
 * Input Sanitization & Injection Prevention
 * Prevents XSS, prompt injection, and skill manipulation
 */

// ==================== XSS Prevention ====================

// Dangerous HTML/JS patterns
const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,  // onerror=, onload=, etc.
  /on\w+\s*=\s*[^\s>]+/gi,
  /data:\s*text\/html/gi,
  /<svg\b[^>]*onload/gi,
  /<body\b[^>]*onload/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /<\w+\b[^>]*\s+style\s*=\s*["']/gi,
  /vbscript:/gi,
];

// ==================== Prompt Injection ====================

// Patterns that try to override/dismiss system prompts
const INJECTION_PATTERNS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /disregard\s+the\s+above/i,
  /forget\s+(everything|all|your)/i,
  /you\s+are\s+(now|no\s+longer)/i,
  /new\s+instruction/i,
  /system\s+(prompt|message)/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /\#\#\#\s*system/i,
  /system:\s*$/im,
  /you\s+are\s+a\s+different/i,
  /act\s+as\s+(if|though)/i,
  /pretend\s+to\s+be/i,
  /roleplay\s+as/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /\{[^{}]*system[^{}]*\}/i,
];

/**
 * Sanitize HTML to prevent XSS in rendered Markdown
 */
export function sanitizeHtml(html: string): string {
  let sanitized = html;
  
  // Remove script tags entirely
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script\b[^>]*/gi, '');
  
  // Remove iframe
  sanitized = sanitized.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs with HTML
  sanitized = sanitized.replace(/data:\s*text\/html[^,\s]*/gi, '');
  
  // Remove SVG onload
  sanitized = sanitized.replace(/<svg\b[^>]*onload[^>]*>/gi, '');
  
  return sanitized;
}

/**
 * Check if content contains XSS threats
 */
export function checkXss(content: string): { safe: boolean; threats: string[] } {
  const threats: string[] = [];
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(content)) {
      threats.push(pattern.source);
    }
  }
  
  return { safe: threats.length === 0, threats };
}

/**
 * Sanitize text for safe display (strip dangerous patterns)
 */
export function sanitizeForDisplay(text: string): string {
  let cleaned = text;
  
  // Remove null bytes
  cleaned = cleaned.replace(/\x00/g, '');
  
  // Remove invisible Unicode chars
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Remove control chars except newlines/tabs
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  
  return cleaned;
}

/**
 * Check for prompt injection attempts
 */
export function checkPromptInjection(input: string): { blocked: boolean; pattern: string | null } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { blocked: true, pattern: pattern.source };
    }
  }
  return { blocked: false, pattern: null };
}

/**
 * Sanitize user input for skill prompts
 * Removes attempts to override skill behavior
 */
export function sanitizeSkillInput(input: string): string {
  let sanitized = input;
  
  // Remove common injection prefixes
  const prefixes = [
    /^ignore\s+all\s+previous\s+instructions[.,\s]*/im,
    /^disregard\s+(the\s+)?above[.,\s]*/im,
    /^forget\s+(everything|all|your)[.,\s]*/im,
    /^you\s+are\s+(now|no\s+longer)[.,\s]*/im,
    /^new\s+instruction[.,\s]*/im,
    /^system:\s*/im,
    /^\[SYSTEM\]/im,
    /^\[INST\]/im,
  ];
  
  for (const prefix of prefixes) {
    sanitized = sanitized.replace(prefix, '');
  }
  
  // Escape common manipulation brackets
  // But preserve legitimate use - just warn instead of stripping
  sanitized = sanitized
    .replace(/<\|system\|>/gi, '&lt;|system|&gt;')
    .replace(/<\|user\|>/gi, '&lt;|user|&gt;');
  
  return sanitized.trim();
}

/**
 * Sanitize dynamic variables inserted into prompts
 * Prevents user input from breaking prompt structure
 */
export function sanitizePromptVariable(value: string): string {
  // Remove any attempt to close/exit the prompt
  let sanitized = value
    .replace(/<\/?[Pp]rompt[^>]*>/g, '')
    .replace(/<\|[^|]+\|>/g, '')
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/^system:/gim, '')
    .replace(/^instructions:/gim, '')
    .slice(0, 5000); // Limit variable length
  
  return sanitized;
}

/**
 * Full sanitization pipeline
 * Use before sending to LLM or rendering
 */
export function sanitizeComplete(
  input: string,
  options: { allowHtml?: boolean; checkInjection?: boolean } = {}
): { sanitized: string; threats: string[]; blocked: boolean } {
  const threats: string[] = [];
  let sanitized = input;
  
  // 1. Check prompt injection
  if (options.checkInjection !== false) {
    const injection = checkPromptInjection(sanitized);
    if (injection.blocked) {
      threats.push(`prompt_injection:${injection.pattern}`);
    }
    sanitized = sanitizeSkillInput(sanitized);
  }
  
  // 2. XSS check (always)
  if (!options.allowHtml) {
    const xss = checkXss(sanitized);
    if (!xss.safe) {
      threats.push(...xss.threats);
    }
    sanitized = sanitizeHtml(sanitized);
  }
  
  // 3. General sanitization
  sanitized = sanitizeForDisplay(sanitized);
  
  return {
    sanitized,
    threats,
    blocked: threats.length > 0
  };
}