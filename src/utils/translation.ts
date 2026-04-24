/**
 * Message translation utility using LibreTranslate or similar free API
 */

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
}

interface TranslationCache {
  [key: string]: {
    translation: string;
    timestamp: number;
  };
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const translationCache: TranslationCache = {};

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<string> {
  // Simple detection based on character ranges
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasKorean = /[\uac00-\ud7af]/.test(text);
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const hasCyrillic = /[\u0400-\u04ff]/.test(text);

  if (hasChinese) return 'zh';
  if (hasJapanese) return 'ja';
  if (hasKorean) return 'ko';
  if (hasArabic) return 'ar';
  if (hasCyrillic) return 'ru';

  // Default to English for Latin scripts
  return 'en';
}

/**
 * Translate text (placeholder - requires external API)
 * In production, this would call LibreTranslate or similar
 */
export async function translateText(
  text: string,
  targetLang: string = 'en',
  sourceLang?: string
): Promise<TranslationResult> {
  const cacheKey = `${text.slice(0, 50)}:${targetLang}`;

  // Check cache
  if (translationCache[cacheKey]) {
    const cached = translationCache[cacheKey];
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return {
        translatedText: cached.translation,
        detectedLanguage: sourceLang || 'auto',
      };
    }
  }

  // If no API is configured, return mock translation
  // In production, integrate with LibreTranslate or similar
  const detectedLang = sourceLang || await detectLanguage(text);

  // Mock translation for demo (replace with actual API call)
  const translatedText = `[${targetLang.toUpperCase()}] ${text}`;

  // Cache result
  translationCache[cacheKey] = {
    translation: translatedText,
    timestamp: Date.now(),
  };

  return {
    translatedText,
    detectedLanguage: detectedLang,
  };
}

/**
 * Get supported languages
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

/**
 * Estimate reading time (words per minute based on language)
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  // Count words (simple split by whitespace)
  const words = text.trim().split(/\s+/).length;

  // Adjust for language complexity
  const langMultiplier: Record<string, number> = {
    en: 1,
    es: 1.1,
    fr: 1.1,
    de: 1.2,
    zh: 0.4, // Characters instead of words
    ja: 0.4,
    ko: 0.5,
    ru: 1.1,
    ar: 0.9,
  };

  const lang = 'en'; // Default
  const adjustedWpm = wordsPerMinute * (langMultiplier[lang] || 1);

  return Math.ceil(words / adjustedWpm);
}

/**
 * Format reading time display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min read';
  if (minutes === 1) return '1 min read';
  return `~${minutes} min read`;
}

/**
 * React component for reading time display
 */
export function ReadingTimeIndicator({ text, className = '' }: { text: string; className?: string }) {
  const minutes = estimateReadingTime(text);
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      {formatReadingTime(minutes)}
    </span>
  );
}