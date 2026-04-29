/**
 * Search API - Direct fetch with CORS handling
 */

/**
 * Fetch search results via direct Google CSE
 */
export async function googleSearch(query: string, numResults = 10): Promise<any[]> {
  if (!query || typeof query !== 'string') return [];

  try {
    const cseUrl = `https://cse.google.com/cse?cx=031f85cf6daa24759&q=${encodeURIComponent(query)}`;
    const res = await fetch(cseUrl, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const html = await res.text();
      return parseSearchResults(html, numResults);
    }
  } catch (e) {
    console.log('[Search] Error:', e);
  }

  return [];
}

/**
 * Fetch webpage content directly
 */
export async function googleFetch(url: string, maxLength = 15000): Promise<{ content: string; url: string; source: string }> {
  if (!url) return { content: '', url: '', source: '' };

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (res.ok) {
      const html = await res.text();
      const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
      return { content: text, url, source: 'direct' };
    }
  } catch (e) {
    console.log('[Fetch] Error:', e);
  }

  return { content: '', url, source: '' };
}

function parseSearchResults(html: string, limit: number): any[] {
  const results: any[] = [];
  const seen = new Set<string>();
  const regex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match, count = 0;
  while ((match = regex.exec(html)) !== null && count < limit) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    if (url?.startsWith('http') && title && !seen.has(url) &&
        !url.includes('google') && !url.includes('youtube') && title.length < 200) {
      seen.add(url);
      results.push({ title, url, snippet: '', source: 'search' });
      count++;
    }
  }
  return results;
}