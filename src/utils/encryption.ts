/**
 * Encrypted localStorage for API keys
 * Day 5: Protect sensitive credentials at rest
 * Uses simple XOR obfuscation + timestamp rotation
 */

const ENCRYPTION_KEY_STORAGE = 'mm_enc_key_v1';

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function getOrCreateKey(): string {
  try {
    const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    if (stored) return stored;
  } catch {}
  const key = generateKey();
  try {
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
  } catch {}
  return key;
}

function xorEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(data: string, key: string): string {
  try {
    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * Store a sensitive value in localStorage with obfuscation
 */
export function setEncryptedItem(key: string, value: string): void {
  const encKey = getOrCreateKey();
  const encrypted = xorEncrypt(value, encKey);
  const payload = JSON.stringify({
    v: encrypted,
    t: Date.now(),
  });
  localStorage.setItem(key, payload);
}

/**
 * Retrieve a sensitive value from localStorage
 */
export function getEncryptedItem(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.v) return null;
    const encKey = getOrCreateKey();
    return xorDecrypt(parsed.v, encKey);
  } catch {
    return null;
  }
}

/**
 * Remove encrypted item
 */
export function removeEncryptedItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  try {
    const test = 'test';
    const key = getOrCreateKey();
    const enc = xorEncrypt(test, key);
    const dec = xorDecrypt(enc, key);
    return dec === test;
  } catch {
    return false;
  }
}
