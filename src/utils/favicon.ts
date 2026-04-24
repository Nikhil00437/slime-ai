/**
 * Dynamic favicon utility for showing streaming/busy state in browser tab
 */

type FaviconStatus = 'idle' | 'streaming' | 'success' | 'error';

const originalFavicon = {
  href: '',
  node: null as HTMLLinkElement | null,
};

// Default SVG favicon as data URL
const defaultSvgFavicon = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1f2937"/>
  <path d="M8 12h16M8 16h12M8 20h14" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
</svg>
`)}`;

/**
 * Initialize favicon tracking (call once on app load)
 */
export function initFavicon() {
  const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (link) {
    originalFavicon.href = link.href;
    originalFavicon.node = link;
  }
}

/**
 * Update favicon based on current status
 */
export function setFaviconStatus(status: FaviconStatus): void {
  const link = originalFavicon.node || document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) return;

  switch (status) {
    case 'streaming':
      link.href = createStreamingFavicon();
      break;
    case 'success':
      link.href = createSuccessFavicon();
      setTimeout(() => link.href = originalFavicon.href || defaultSvgFavicon, 1500);
      break;
    case 'error':
      link.href = createErrorFavicon();
      setTimeout(() => link.href = originalFavicon.href || defaultSvgFavicon, 2000);
      break;
    case 'idle':
    default:
      link.href = originalFavicon.href || defaultSvgFavicon;
      break;
  }
}

/**
 * Create animated streaming indicator favicon
 */
function createStreamingFavicon(): string {
  return `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1f2937"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="50" stroke-dashoffset="25">
    <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>
`)}`;
}

/**
 * Create success checkmark favicon
 */
function createSuccessFavicon(): string {
  return `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1f2937"/>
  <circle cx="16" cy="16" r="10" fill="#22c55e"/>
  <path d="M10 16l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`)}`;
}

/**
 * Create error X favicon
 */
function createErrorFavicon(): string {
  return `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1f2937"/>
  <circle cx="16" cy="16" r="10" fill="#ef4444"/>
  <path d="M11 11l10 10M21 11l-10 10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`)}`;
}

/**
 * Update favicon badge count (for notifications)
 */
export function setFaviconBadge(count: number): void {
  if (count <= 0) {
    setFaviconStatus('idle');
    return;
  }

  const badge = count > 99 ? '99+' : count.toString();
  const link = originalFavicon.node || document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) return;

  link.href = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#ef4444"/>
  <text x="16" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${badge}</text>
</svg>
`)}`;
}

// Export a hook for React components
export function useFavicon() {
  return { setFaviconStatus, setFaviconBadge, initFavicon };
}