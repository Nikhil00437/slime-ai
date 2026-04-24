/**
 * Input Validation & Sanitization
 * Blocks oversized payloads, validates API keys, prevents double-submit
 */

import { ProviderType } from '../types';

// ==================== Input Length ====================

// Max input length (characters)
export const MAX_INPUT_LENGTH = 50000;

// Max message content length
export const MAX_MESSAGE_CONTENT = 100000;

// Provider-specific limits
export const INPUT_LIMITS: Record<ProviderType, { maxLength: number; maxTokens: number }> = {
  ollama: { maxLength: 100000, maxTokens: 4096 },
  lmstudio: { maxLength: 100000, maxTokens: 4096 },
  openrouter: { maxLength: 50000, maxTokens: 128000 },
  openai: { maxLength: 50000, maxTokens: 128000 },
  anthropic: { maxLength: 50000, maxTokens: 200000 },
  gemini: { maxLength: 50000, maxTokens: 100000 },
  grok: { maxLength: 50000, maxTokens: 131072 },
};

/**
 * Validate input length
 * @returns { valid: boolean; error?: string }
 */
export function validateInputLength(content: string, provider?: ProviderType): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > MAX_INPUT_LENGTH) {
    return { valid: false, error: `Input too long (${content.length}/${MAX_INPUT_LENGTH} chars)` };
  }
  
  if (provider && INPUT_LIMITS[provider]) {
    const limit = INPUT_LIMITS[provider];
    if (content.length > limit.maxLength) {
      return { valid: false, error: `Input exceeds ${provider} limit (${content.length}/${limit.maxLength})` };
    }
  }
  
  return { valid: true };
}

// ==================== API Key Validation ====================

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(key: string, provider: ProviderType): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: `${provider} API key is required` };
  }
  
  // Basic format checks
  const trimmed = key.trim();
  
  switch (provider) {
    case 'openai':
    case 'openrouter':
      // Starts with sk- or sk-ant...
      if (!trimmed.startsWith('sk-') && !trimmed.startsWith('sk-ant')) {
        return { valid: false, error: 'Invalid OpenAI key format' };
      }
      break;
      
    case 'anthropic':
      // sk-ant-...
      if (!trimmed.startsWith('sk-ant')) {
        return { valid: false, error: 'Invalid Anthropic key format' };
      }
      break;
      
    case 'gemini':
      // API key should be alphanumeric, min 20 chars
      if (trimmed.length < 20 || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return { valid: false, error: 'Invalid Gemini key format' };
      }
      break;
      
    case 'grok':
      // xk-...
      if (!trimmed.startsWith('xk-')) {
        return { valid: false, error: 'Invalid Grok key format' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Validate provider is ready to use
 */
export function validateProviderReady(
  provider: { apiKey?: string; enabled: boolean; status: string },
  providerName: string
): { valid: boolean; error?: string } {
  if (!provider.enabled) {
    return { valid: false, error: `${providerName} is disabled` };
  }
  
  if (provider.status === 'disconnected') {
    return { valid: false, error: `${providerName} is not connected` };
  }
  
  if (provider.status === 'checking') {
    return { valid: false, error: `${providerName} is still checking...` };
  }
  
  return { valid: true };
}

// ==================== Double-Submit Prevention ====================

let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 500;

/**
 * Check if submission is allowed (prevents double-click)
 */
export function checkSubmitAllowed(): { allowed: boolean; error?: string } {
  const now = Date.now();
  const timeSinceLastSubmit = now - lastSubmitTime;
  
  if (timeSinceLastSubmit < SUBMIT_COOLDOWN_MS) {
    return { 
      allowed: false, 
      error: `Please wait ${Math.ceil((SUBMIT_COOLDOWN_MS - timeSinceLastSubmit) / 1000)}s` 
    };
  }
  
  lastSubmitTime = now;
  return { allowed: true };
}

/**
 * Mark submission as complete (early release)
 */
export function markSubmitComplete(): void {
  // Allow faster resubmit after completion
  lastSubmitTime = 0;
}

/**
 * Reset submit lock (for stop streaming)
 */
export function resetSubmitLock(): void {
  lastSubmitTime = 0;
}

// ==================== Input Sanitization ====================

/**
 * Sanitize user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .slice(0, MAX_INPUT_LENGTH) // Truncate to max length
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove invisible chars
}

/**
 * Check for suspicious patterns
 */
export function checkSuspiciousInput(input: string): boolean {
  const suspicious = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,  // onerror=, onload=, etc.
    /data:\s*text\/html/i,
  ];
  
  return suspicious.some(pattern => pattern.test(input));
}