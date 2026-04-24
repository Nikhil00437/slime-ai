// // // Robust search tool with proper timeout, error propagation, and fallback
// // // Inspired by Mozilla Readability for clean text extraction
// // import { restoreVaultHandle, loadEnvFromVault } from './vault';

// // // Cache for API key and custom search URL
// // let cachedApiKey: string | null = null;
// // let cachedSearchUrl: string | null = null;
// // let apiKeySource: 'tavily' | 'brave' | 'serper' | 'ddg' | 'custom' | null = null;

// // export interface SearchResult {
// //   title: string;
// //   url: string;
// //   snippet: string;
// //   content?: string; // Full cleaned text from page
// // }

// // export interface SearchError {
// //   error: string;
// //   errorCode?: string;
// //   provider?: string;
// // }

// // export interface SearchResponse {
// //   results?: SearchResult[];
// //   error?: never;
// //   provider: string;
// //   query: string;
// //   timedOut?: boolean;
// // }

// // export type SearchOutcome = SearchResponse | { results: SearchResult[] } | SearchError;

// // // Detect available API key and search URL from vault
// // async function getSearchConfig(): Promise<{ key: string; source: 'tavily' | 'brave' | 'serper' | 'ddg' | 'custom'; searchUrl?: string }> {
// //   if (cachedApiKey !== null && apiKeySource !== null) {
// //     return { key: cachedApiKey, source: apiKeySource, searchUrl: cachedSearchUrl || undefined };
// //   }

// //   const handle = await restoreVaultHandle();
// //   if (!handle) {
// //     return { key: '', source: 'ddg' };
// //   }

// //   try {
// //     const env = await loadEnvFromVault();
    
// //     // Check for custom search URL first
// //     if (env.SEARCH_URL) {
// //       cachedSearchUrl = env.SEARCH_URL;
// //       apiKeySource = 'custom';
// //       cachedApiKey = env.SEARCH_API_KEY || '';
// //       return { key: cachedApiKey, source: 'custom', searchUrl: cachedSearchUrl };
// //     }
    
// //     if (env.VITE_TAVILY_API_KEY) {
// //       cachedApiKey = env.VITE_TAVILY_API_KEY;
// //       apiKeySource = 'tavily';
// //     } else if (env.VITE_BRAVE_API_KEY) {
// //       cachedApiKey = env.VITE_BRAVE_API_KEY;
// //       apiKeySource = 'brave';
// //     } else if (env.VITE_SERPER_API_KEY) {
// //       cachedApiKey = env.VITE_SERPER_API_KEY;
// //       apiKeySource = 'serper';
// //     } else {
// //       apiKeySource = 'ddg';
// //     }
    
// //     return { key: cachedApiKey || '', source: apiKeySource };
// //   } catch {
// //     return { key: '', source: 'ddg' };
// //   }
// // }

// // // Sanitize query for API calls
// // export function sanitizeSearchQuery(query: string): string {
// //   return query
// //     .trim()
// //     .slice(0, 200)
// //     .replace(/[<>{}[\]()\\]/g, '') // Remove chars that break JSON/URLs
// //     .replace(/\s+/g, ' ') // Normalize whitespace
// //     .trim();
// // }

// // // Simplified fallback query (take first 5 words)
// // function simplifyQuery(query: string): string {
// //   const words = query.split(/\s+/).filter(Boolean).slice(0, 5);
// //   return words.join(' ') || query.slice(0, 30);
// // }

// // // Timeouts
// // const SEARCH_TIMEOUT = 15000; // 15 seconds for search API
// // const FETCH_TIMEOUT = 20000; // 20 seconds for fetching pages

// // async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
// //   const controller = new AbortController();
// //   const timeoutId = setTimeout(() => controller.abort(), ms);
  
// //   try {
// //     const result = await Promise.race([
// //       promise,
// //       new Promise<never>((_, reject) => 
// //         setTimeout(() => reject(new Error('TIMEOUT')), ms)
// //       )
// //     ]);
// //     clearTimeout(timeoutId);
// //     return result;
// //   } catch (e: any) {
// //     clearTimeout(timeoutId);
// //     if (e.message === 'TIMEOUT') {
// //       throw new Error(`timeout_${ms / 1000}s`);
// //     }
// //     throw e;
// //   }
// // }

// // // Mozilla Readability-style content extraction
// // // Uses cheerio-style DOM manipulation for clean article extraction
// // function extractReadableContent(html: string): string {
// //   const dom = new DOMParser().parseFromString(html, 'text/html');
  
// //   // 1. Remove noise elements (ads, navigation, tracking)
// //   const noiseSelectors = [
// //     'script', 'style', 'noscript', 'iframe', 'object', 'embed',
// //     'nav', 'header', 'footer', 'aside', 'form', 'button', 'input',
// //     'meta', 'link', 'svg', 'canvas', 'video', 'audio', 'source',
// //     '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
// //     '[role="search"]', '[aria-hidden="true"]'
// //   ];
// //   noiseSelectors.forEach(sel => {
// //     try { dom.querySelectorAll(sel).forEach(e => e.remove()); } catch { /* ignore bad selectors */ }
// //   });
  
// //   // 2. Remove hidden elements and display:none
// //   dom.querySelectorAll('[style*="display: none"], [style*="display:none"], [hidden], [aria-hidden]').forEach(e => e.remove());
  
// //   // 3. Remove classes and data attributes (reduce noise)
// //   dom.querySelectorAll('*').forEach(el => {
// //     if (el.hasAttribute('class')) el.removeAttribute('class');
// //     if (el.hasAttribute('style')) el.removeAttribute('style');
// //     if (el.hasAttribute('id')) el.removeAttribute('id');
// //     Array.from(el.attributes || []).forEach(attr => {
// //       if (attr.name.startsWith('data-') || attr.name.startsWith('on')) {
// //         el.removeAttribute(attr.name);
// //       }
// //     });
// //   });
  
// //   // 4. Extract main content areas (article, main, content)
// //   let mainContent = '';
// //   const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.post', '.article-body', '#content', '#main'];
  
// //   for (const sel of contentSelectors) {
// //     try {
// //       const el = dom.querySelector(sel);
// //       if (el && el.textContent && el.textContent.length > 200) {
// //         mainContent = el.textContent;
// //         break;
// //       }
// //     } catch { continue; }
// //   }
  
// //   // 5. Fallback to body if no main content found
// //   if (!mainContent || mainContent.length < 200) {
// //     const body = dom.body;
// //     if (!body) return '';
// //     mainContent = body.textContent || '';
// //   }
  
// //   // 6. Clean up text: normalize whitespace, remove short noise
// //   let text = mainContent
// //     .replace(/\s+/g, ' ')           // Collapse whitespace
// //     .replace(/\n\s*\n/g, '\n\n')     // Preserve paragraphs
// //     .trim();
  
// //   // 7. Remove common noise patterns (boilerplate)
// //   const noisePatterns = [
// //     /^(?:subscribe|sign in|log in|register|menu|home|about|contact|privacy|terms)[a-z0-9\s]{0,20}\s*/gi,
// //     /cookies?\s*used?\s*(?:for|to)?\s*[a-z]{5,30}\s*/gi,
// //     /advertisement\s*/gi,
// //   ];
// //   noisePatterns.forEach(pattern => {
// //     text = text.replace(pattern, '');
// //   });
  
// //   // 8. Limit to useful content (first 10k chars)
// //   return text.slice(0, 10000);
// // }

// // // Fetch and clean page content
// // async function fetchAndCleanPage(url: string): Promise<string> {
// //   try {
// //     const controller = new AbortController();
// //     const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
// //     const res = await fetch(url, {
// //       signal: controller.signal,
// //       headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlimeAI/1.0)' }
// //     });
    
// //     clearTimeout(timeoutId);
    
// //     if (!res.ok) {
// //       return '';
// //     }
    
// //     const html = await res.text();
// //     return extractReadableContent(html);
// //   } catch {
// //     return '';
// //   }
// // }

// // // Try a single search provider
// // async function tryProvider(
// //   source: 'tavily' | 'serper' | 'ddg' | 'custom',
// //   query: string,
// //   apiKey: string,
// //   searchUrl?: string,
// //   timeoutMs: number = SEARCH_TIMEOUT
// // ): Promise<{ results: SearchResult[]; error?: string }> {
// //   const encoded = encodeURIComponent(sanitizeSearchQuery(query));
  
// //   try {
// //     switch (source) {
// //       case 'custom': {
// //         // Custom search URL (like SearXNG or custom search engine)
// //         if (!searchUrl) throw new Error('SEARCH_URL not configured');
        
// //         const res = await withTimeout(
// //           fetch(`${searchUrl}?q=${encoded}&format=json`),
// //           timeoutMs
// //         );
        
// //         if (!res.ok) {
// //           throw new Error(`HTTP ${res.status}`);
// //         }
        
// //         const data = await res.json();
// //         const urls = (data.results || []).map((r: any) => r.url || r.link || r.url).slice(0, 3);
        
// //         // Fetch first few URLs and get full content
// //         const results: SearchResult[] = [];
// //         for (const url of urls) {
// //           const content = await fetchAndCleanPage(url);
// //           if (content) {
// //             results.push({
// //               title: url,
// //               url,
// //               snippet: content.slice(0, 200),
// //               content,
// //             });
// //           }
// //         }
        
// //         return { results };
// //       }
      
// //       case 'tavily': {
// //         const res = await withTimeout(
// //           fetch('https://api.tavily.com/search', {
// //             method: 'POST',
// //             headers: {
// //               'Content-Type': 'application/json',
// //               'Authorization': `Bearer ${apiKey}`,
// //             },
// //             body: JSON.stringify({
// //               query,
// //               maxResults: 5,
// //               searchDepth: 'basic',
// //               includeAnswer: false,
// //             }),
// //           }),
// //           timeoutMs
// //         );
        
// //         if (!res.ok) {
// //           throw new Error(`HTTP ${res.status}`);
// //         }
        
// //         const data = await res.json();
// //         return {
// //           results: (data.results || []).map((r: any) => ({
// //             title: r.title || 'Untitled',
// //             url: r.url || '',
// //             snippet: r.content?.slice(0, 300) || r.snippet || '',
// //             content: r.content,
// //           })),
// //         };
// //       }
      
// //       case 'serper': {
// //         const res = await withTimeout(
// //           fetch('https://google.serper.dev/search', {
// //             method: 'POST',
// //             headers: {
// //               'Content-Type': 'application/json',
// //               'X-API-KEY': apiKey,
// //             },
// //             body: JSON.stringify({ query, numResults: 5 }),
// //           }),
// //           timeoutMs
// //         );
        
// //         if (!res.ok) {
// //           throw new Error(`HTTP ${res.status}`);
// //         }
        
// //         const data = await res.json();
// //         return {
// //           results: (data.results || []).map((r: any) => ({
// //             title: r.title || 'Untitled',
// //             url: r.link || '',
// //             snippet: r.snippet || '',
// //           })),
// //         };
// //       }
      
// //       case 'ddg':
// //       default: {
// //         // DuckDuckGo Instant Answer (free, no key needed)
// //         const res = await withTimeout(
// //           fetch(
// //             `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
// //             { signal: AbortSignal.timeout(timeoutMs) }
// //           ),
// //           timeoutMs
// //         );
        
// //         if (!res.ok) {
// //           throw new Error(`HTTP ${res.status}`);
// //         }
        
// //         const data = await res.json();
// //         const results: SearchResult[] = [];
        
// //         // Extract from RelatedTopics
// //         if (data.RelatedTopics?.length > 0) {
// //           for (const topic of data.RelatedTopics.slice(0, 5)) {
// //             if (topic.FirstURL && topic.Text) {
// //               results.push({
// //                 title: topic.Text.split(' - ')[0]?.slice(0, 100) || topic.Text.slice(0, 100),
// //                 url: topic.FirstURL,
// //                 snippet: '',
// //               });
// //             }
// //           }
// //         }
        
// //         // Fallback to Abstract
// //         if (results.length === 0 && data.AbstractText) {
// //           results.push({
// //             title: data.Heading || query,
// //             url: data.AbstractURL || '',
// //             snippet: data.AbstractText.slice(0, 300),
// //             content: data.AbstractText,
// //           });
// //         }
        
// //         return { results };
// //       }
// //     }
// //   } catch (e: any) {
// //     const message = e.message || String(e);
// //     if (message.includes('timeout') || message.includes('AbortError')) {
// //       throw new Error('TIMEOUT');
// //     }
// //     throw new Error(message);
// //   }
// // }

// // // Main search function with fallback
// // export async function webSearch(query: string, fetchFullContent = false): Promise<SearchOutcome> {
// //   const cleanQuery = sanitizeSearchQuery(query);
  
// //   if (!cleanQuery) {
// //     return { error: 'empty_query', provider: 'none' };
// //   }
  
// //   const { key: apiKey, source: preferredSource, searchUrl } = await getSearchConfig();
  
// //   // Try preferred provider first
// //   let result: { results: SearchResult[]; error?: string } | null = null;
// //   let error: string | null = null;
  
// //   try {
// //     result = await tryProvider(preferredSource, cleanQuery, apiKey, searchUrl);
// //   } catch (e: any) {
// //     error = e.message || 'unknown';
// //   }
  
// //   // If first attempt failed and query is complex, try simplified version
// //   if ((!result?.results?.length || error === 'TIMEOUT') && cleanQuery.split(/\s+/).length > 5) {
// //     const simpleQuery = simplifyQuery(cleanQuery);
// //     if (simpleQuery !== cleanQuery) {
// //       try {
// //         result = await tryProvider(preferredSource, simpleQuery, apiKey, searchUrl, 10000);
// //         error = null;
// //       } catch (e: any) {
// //         error = e.message || 'retry_failed';
// //       }
// //     }
// //   }
  
// //   // If still failing and we have a paid provider, try DDG as last resort
// //   if (preferredSource !== 'ddg' && (!result?.results?.length || error)) {
// //     try {
// //       result = await tryProvider('ddg', cleanQuery, '', undefined);
// //       error = null;
// //     } catch {
// //       // Keep original error
// //     }
// //   }
  
// //   // Return results or error
// //   if (result?.results?.length) {
// //     return {
// //       results: result.results,
// //       provider: preferredSource,
// //       query: cleanQuery,
// //     };
// //   }
  
// //   // Return descriptive error
// //   return {
// //     error: error || 'no_results',
// //     errorCode: error === 'TIMEOUT' ? 'timeout_15s' : 'search_failed',
// //     provider: preferredSource,
// //   };
// // }

// // // Clear cached config (call when vault changes)
// // export function clearSearchCache(): void {
// //   cachedApiKey = null;
// //   cachedSearchUrl = null;
// //   apiKeySource = null;
// // }

// // // ============================================================================
// // // Ollama Integration for Search Results Summarization
// // // ============================================================================

// // /**
// //  * Get the default summarization model from settings or fallback
// //  */
// // async function getSummarizationModel(): Promise<string> {
// //   try {
// //     // Try to get from vault settings
// //     const { restoreVaultHandle, loadEnvFromVault } = await import('./vault');
// //     const handle = await restoreVaultHandle();
// //     if (handle) {
// //       const env = await loadEnvFromVault();
// //       // Use summarizationModel from vault or skillGenerationModel
// //       return env.summarizationModel || env.skillGenerationModel || 'qwen3-vl:8b';
// //     }
// //   } catch { /* ignore */ }
// //   return 'qwen3-vl:8b';
// // }

// // /**
// //  * Summarize/answer a query using search results via Ollama (direct HTTP fetch)
// //  * @param query - The user's search query
// //  * @param texts - Array of source texts (URL + content pairs)
// //  * @param model - Ollama model to use (falls back to summarizationModel from settings)
// //  * @returns Promise<string> with the final summarized answer
// //  */
// // export async function summarizeWithOllama(
// //   query: string,
// //   texts: Array<{ url: string; content: string }>,
// //   model?: string
// // ): Promise<string> {
// //   // Use provided model or fetch default from settings
// //   const modelToUse = model || await getSummarizationModel();
  
// //   const sources = texts.map(t => `Source: ${t.url}\n${t.content}`).join('\n\n---\n\n');
  
// //   const prompt = `${query}\n\nSummarize the information and provide a concise answer. Use only the information from the following sources:\n\n${sources}\n\nAnswer:`;
  
// //   const ollamaBody = {
// //     model: modelToUse,
// //     prompt,
// //     stream: false,
// //     options: {
// //       num_ctx: 16000,
// //       temperature: 0.3,
// //       top_p: 0.9,
// //     },
// //   };
  
// //   // Use direct HTTP fetch to local Ollama (like providers.ts)
// //   const endpoint = 'http://localhost:11434/api/generate';
  
// //   try {
// //     const res = await fetch(endpoint, {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify(ollamaBody),
// //     });
    
// //     if (!res.ok) {
// //       throw new Error(`Ollama error: ${res.status}`);
// //     }
    
// //     const data = await res.json() as { response?: string };
// //     return data.response || texts.map(t => t.content.slice(0, 500)).join('\n\n');
// //   } catch {
// //     // Fallback: return concatenated content if Ollama unavailable
// //     return texts.map(t => t.content.slice(0, 500)).join('\n\n');
// //   }
// // }







// // searchtool.ts
// // Robust search tool with SearXNG integration, multi-provider fallbacks, and local summarization
// import { restoreVaultHandle, loadEnvFromVault } from './vault';

// // Cache for API config
// let cachedApiKey: string | null = null;
// let cachedSearchUrl: string | null = null;
// let apiKeySource: 'tavily' | 'brave' | 'serper' | 'searxng' | 'ddg' | 'custom' | null = null;

// export interface SearchResult {
//   title: string;
//   url: string;
//   snippet: string;
//   content?: string; 
// }

// export interface SearchError {
//   error: string;
//   errorCode?: string;
//   provider?: string;
// }

// export interface SearchResponse {
//   results?: SearchResult[];
//   error?: never;
//   provider: string;
//   query: string;
//   timedOut?: boolean;
// }

// export type SearchOutcome = SearchResponse | { results: SearchResult[] } | SearchError;

// /**
//  * Detect available API key and search URL from vault
//  * Prioritizes SearXNG/Custom URLs for local-first workflows
//  */
// async function getSearchConfig(): Promise<{ key: string; source: 'tavily' | 'brave' | 'serper' | 'searxng' | 'ddg' | 'custom'; searchUrl?: string }> {
//   if (cachedApiKey !== null && apiKeySource !== null) {
//     return { key: cachedApiKey, source: apiKeySource, searchUrl: cachedSearchUrl || undefined };
//   }

//   const handle = await restoreVaultHandle();
//   if (!handle) return { key: '', source: 'ddg' };

//   try {
//     const env = await loadEnvFromVault();
    
//     // 1. Check for SearXNG specifically
//     if (env.VITE_SEARXNG_URL || env.SEARCH_URL?.includes('search')) {
//       cachedSearchUrl = env.VITE_SEARXNG_URL || env.SEARCH_URL;
//       apiKeySource = 'searxng';
//       cachedApiKey = env.VITE_SEARXNG_API_KEY || ''; // Usually empty for local SearXNG
//       return { key: cachedApiKey, source: 'searxng', searchUrl: cachedSearchUrl! };
//     }
    
//     // 2. Check for traditional providers
//     if (env.VITE_TAVILY_API_KEY) {
//       cachedApiKey = env.VITE_TAVILY_API_KEY;
//       apiKeySource = 'tavily';
//     } else if (env.VITE_BRAVE_API_KEY) {
//       cachedApiKey = env.VITE_BRAVE_API_KEY;
//       apiKeySource = 'brave';
//     } else if (env.VITE_SERPER_API_KEY) {
//       cachedApiKey = env.VITE_SERPER_API_KEY;
//       apiKeySource = 'serper';
//     } else {
//       apiKeySource = 'ddg';
//     }
    
//     return { key: cachedApiKey || '', source: apiKeySource };
//   } catch {
//     return { key: '', source: 'ddg' };
//   }
// }

// export function sanitizeSearchQuery(query: string): string {
//   return query
//     .trim()
//     .slice(0, 200)
//     .replace(/[<>{}[\]()\\]/g, '') 
//     .replace(/\s+/g, ' ') 
//     .trim();
// }

// function simplifyQuery(query: string): string {
//   const words = query.split(/\s+/).filter(Boolean).slice(0, 5);
//   return words.join(' ') || query.slice(0, 30);
// }

// const SEARCH_TIMEOUT = 12000; // 12s
// const FETCH_TIMEOUT = 15000; // 15s

// async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), ms);
  
//   try {
//     const result = await Promise.race([
//       promise,
//       new Promise<never>((_, reject) => 
//         setTimeout(() => reject(new Error('TIMEOUT')), ms)
//       )
//     ]);
//     clearTimeout(timeoutId);
//     return result;
//   } catch (e: any) {
//     clearTimeout(timeoutId);
//     throw e;
//   }
// }

// /**
//  * Enhanced content extraction (Mozilla Readability pattern)
//  */
// function extractReadableContent(html: string): string {
//   const dom = new DOMParser().parseFromString(html, 'text/html');
//   const noise = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'form'];
//   noise.forEach(sel => dom.querySelectorAll(sel).forEach(e => e.remove()));
  
//   let text = dom.body?.textContent || '';
//   return text.replace(/\s+/g, ' ').trim().slice(0, 8000);
// }

// async function fetchAndCleanPage(url: string): Promise<string> {
//   try {
//     const res = await withTimeout(fetch(url, { headers: { 'User-Agent': 'SlimeAI/1.0' } }), FETCH_TIMEOUT);
//     if (!res.ok) return '';
//     const html = await res.text();
//     return extractReadableContent(html);
//   } catch { return ''; }
// }

// /**
//  * Provider-specific implementation
//  */
// async function tryProvider(
//   source: string,
//   query: string,
//   apiKey: string,
//   searchUrl?: string,
//   timeoutMs: number = SEARCH_TIMEOUT
// ): Promise<{ results: SearchResult[]; error?: string }> {
//   const encoded = encodeURIComponent(sanitizeSearchQuery(query));
  
//   try {
//     switch (source) {
//       case 'searxng': {
//         const url = `${searchUrl}?q=${encoded}&format=json&engines=duckduckgo,brave,google`;
//         const res = await withTimeout(fetch(url), timeoutMs);
//         const data = await res.json();
//         return {
//           results: (data.results || []).slice(0, 5).map((r: any) => ({
//             title: r.title || 'No Title',
//             url: r.url,
//             snippet: r.content || r.snippet || '',
//           }))
//         };
//       }
      
//       case 'tavily': {
//         const res = await withTimeout(fetch('https://api.tavily.com/search', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
//           body: JSON.stringify({ query, maxResults: 5, searchDepth: 'basic' })
//         }), timeoutMs);
//         const data = await res.json();
//         return { results: (data.results || []).map((r: any) => ({
//           title: r.title, url: r.url, snippet: r.content, content: r.content 
//         }))};
//       }

//       case 'serper': {
//         const res = await withTimeout(fetch('https://google.serper.dev/search', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
//           body: JSON.stringify({ q: query, num: 5 })
//         }), timeoutMs);
//         const data = await res.json();
//         return { results: (data.organic || []).map((r: any) => ({
//           title: r.title, url: r.link, snippet: r.snippet 
//         }))};
//       }

//       default: // DuckDuckGo fallback
//         const res = await withTimeout(fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json`), timeoutMs);
//         const data = await res.json();
//         return { results: data.AbstractText ? [{ title: data.Heading, url: data.AbstractURL, snippet: data.AbstractText }] : [] };
//     }
//   } catch (e: any) {
//     throw new Error(e.message === 'TIMEOUT' ? 'TIMEOUT' : 'search_failed');
//   }
// }

// /**
//  * Main Search Export with cascading fallbacks
//  */
// export async function webSearch(query: string): Promise<SearchOutcome> {
//   const cleanQuery = sanitizeSearchQuery(query);
//   if (!cleanQuery) return { error: 'empty_query', provider: 'none' };

//   const config = await getSearchConfig();
//   let result: { results: SearchResult[] } | null = null;
//   let lastError: string | null = null;

//   // Attempt 1: Primary Source
//   try {
//     result = await tryProvider(config.source, cleanQuery, config.key, config.searchUrl);
//   } catch (e: any) { lastError = e.message; }

//   // Attempt 2: Simplified Fallback
//   if (!result?.results?.length && cleanQuery.split(' ').length > 4) {
//     try {
//       result = await tryProvider(config.source, simplifyQuery(cleanQuery), config.key, config.searchUrl, 8000);
//     } catch { /* ignore secondary failure */ }
//   }

//   // Attempt 3: Emergency DDG Fallback (if not already using it)
//   if (!result?.results?.length && config.source !== 'ddg') {
//     try {
//       result = await tryProvider('ddg', cleanQuery, '');
//     } catch { /* final stand failed */ }
//   }

//   if (result?.results?.length) {
//     return { results: result.results, provider: config.source, query: cleanQuery };
//   }

//   return { error: lastError || 'no_results', provider: config.source };
// }

// // export async function summarizeWithOllama(
// //   query: string,
// //   texts: Array<{ url: string; content: string }>,
// //   model: string = 'qwen3-vl:8b'
// // ): Promise<string> {
// //   const sources = texts.map(t => `[${t.url}]: ${t.content.slice(0, 1500)}`).join('\n\n');
// //   const prompt = `System: Use the provided sources to answer the user query accurately.\n\nSources:\n${sources}\n\nUser Query: ${query}\n\nAnswer:`;

// //   try {
// //     const res = await fetch('http://localhost:11434/api/generate', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify({ model, prompt, stream: false, options: { num_ctx: 12000, temperature: 0.2 } })
// //     });
// //     const data = await res.json();
// //     return data.response || "I couldn't synthesize the search data.";
// //   } catch {
// //     return "Error connecting to local Ollama for summarization.";
// //   }
// // }
// // Move this logic to where your 'selectedModel' and 'provider' state lives
// async function handleSearchAndSummarize(query: string) {
//   // 1. Get raw results from our updated searchtool
//   const searchOutcome = await webSearch(query);

//   if ("error" in searchOutcome) {
//     return `Search failed: ${searchOutcome.error}`;
//   }

//   // 2. Prepare the context for the model
//   const sources = searchOutcome.results
//     .map(res => `Source [${res.url}]: ${res.snippet}`)
//     .join('\n\n');

//   const toolPrompt = `
//     Context from web search:
//     ${sources}

//     Based on the above, answer the user's request: "${query}"
//   `;

//   // 3. Use the ALREADY SELECTED model and provider to generate the response
//   // This uses your existing callProvider function from providers.ts
//   return await callProvider(
//     state.selectedProvider, // e.g., 'gemini', 'ollama', 'openrouter'
//     state.selectedModel,    // whatever is in your dropdown
//     toolPrompt,
//     state.apiKeys
//   );
// }

// export function clearSearchCache(): void {
//   cachedApiKey = null;
//   cachedSearchUrl = null;
//   apiKeySource = null;
// }


/**
 * searchtool.ts
 * Robust web search with multi-provider cascading fallbacks and integrated summarization.
 *
 * Provider priority:
 *   SearXNG (local) → Tavily → Brave → Serper → DDG (free fallback)
 *
 * Architecture:
 *   - All providers share a single typed interface via ProviderAdapter
 *   - Timeout is applied per-attempt, not globally
 *   - Results flow into summarizeWithActiveModel() which delegates to whichever
 *     model/provider the user has selected in the app (no Ollama hard-coding)
 */

import { restoreVaultHandle, loadEnvFromVault } from './vault';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchProvider = 'searxng' | 'tavily' | 'brave' | 'serper' | 'ddg' | 'custom';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Full cleaned body text — only populated when fetchFullContent is requested */
  content?: string;
}

export interface SearchSuccess {
  results: SearchResult[];
  provider: SearchProvider;
  query: string;
  timedOut?: boolean;
}

export interface SearchFailure {
  error: string;
  errorCode?: string;
  provider: SearchProvider | 'none';
}

export type SearchOutcome = SearchSuccess | SearchFailure;

/** Narrowing helper */
export function isSearchSuccess(o: SearchOutcome): o is SearchSuccess {
  return 'results' in o && Array.isArray(o.results);
}

interface SearchConfig {
  key: string;
  source: SearchProvider;
  searchUrl?: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface ConfigCache {
  config: SearchConfig;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _cache: ConfigCache | null = null;

export function clearSearchCache(): void {
  _cache = null;
}

// ─── Config resolution ────────────────────────────────────────────────────────

async function getSearchConfig(): Promise<SearchConfig> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.config;
  }

  const handle = await restoreVaultHandle();
  if (!handle) return { key: '', source: 'ddg' };

  try {
    const env = await loadEnvFromVault();
    let config: SearchConfig;

    if (env.VITE_SEARXNG_URL) {
      config = { key: env.VITE_SEARXNG_API_KEY ?? '', source: 'searxng', searchUrl: env.VITE_SEARXNG_URL };
    } else if (env.SEARCH_URL) {
      config = { key: env.SEARCH_API_KEY ?? '', source: 'custom', searchUrl: env.SEARCH_URL };
    } else if (env.VITE_TAVILY_API_KEY) {
      config = { key: env.VITE_TAVILY_API_KEY, source: 'tavily' };
    } else if (env.VITE_BRAVE_API_KEY) {
      config = { key: env.VITE_BRAVE_API_KEY, source: 'brave' };
    } else if (env.VITE_SERPER_API_KEY) {
      config = { key: env.VITE_SERPER_API_KEY, source: 'serper' };
    } else {
      config = { key: '', source: 'ddg' };
    }

    _cache = { config, fetchedAt: Date.now() };
    return config;
  } catch {
    return { key: '', source: 'ddg' };
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .slice(0, 200)
    .replace(/[<>{}[\]()\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyQuery(query: string): string {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 5).join(' ') || query.slice(0, 30);
}

// ─── Timeout ──────────────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 12_000;
const FETCH_TIMEOUT_MS  = 15_000;

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`TIMEOUT_${ms}ms`);
    this.name = 'TimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });

  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer);
    return result;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Content extraction ───────────────────────────────────────────────────────

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'nav', 'header',
  'footer', 'aside', 'form', 'button', 'svg', 'canvas',
  '[aria-hidden="true"]', '[role="banner"]', '[role="navigation"]',
];

function extractReadableContent(html: string): string {
  const dom = new DOMParser().parseFromString(html, 'text/html');

  for (const sel of NOISE_SELECTORS) {
    try { dom.querySelectorAll(sel).forEach(el => el.remove()); } catch { /* ignore */ }
  }

  // Prefer semantic content containers
  const candidates = ['article', 'main', '[role="main"]', '#content', '.content', '.post'];
  for (const sel of candidates) {
    try {
      const el = dom.querySelector(sel);
      const text = el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (text.length > 300) return text.slice(0, 8_000);
    } catch { /* ignore */ }
  }

  return (dom.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 8_000);
}

async function fetchAndCleanPage(url: string): Promise<string> {
  try {
    const res = await withTimeout(
      fetch(url, { headers: { 'User-Agent': 'SlimeAI/1.0' } }),
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return '';
    return extractReadableContent(await res.text());
  } catch {
    return '';
  }
}

// ─── Provider adapters ────────────────────────────────────────────────────────

interface ProviderResult {
  results: SearchResult[];
}

type ProviderAdapter = (
  query: string,
  key: string,
  searchUrl: string | undefined,
  timeoutMs: number,
) => Promise<ProviderResult>;

function normalizeResults(raw: unknown[]): SearchResult[] {
  return (raw as Record<string, unknown>[]).map(r => ({
    title:   String(r.title   ?? r.heading   ?? 'Untitled'),
    url:     String(r.url     ?? r.link      ?? ''),
    snippet: String(r.content ?? r.snippet   ?? r.text ?? '').slice(0, 400),
    content: r.content ? String(r.content) : undefined,
  }));
}

const adapters: Record<SearchProvider, ProviderAdapter> = {

  searxng: async (query, _key, searchUrl, ms) => {
    if (!searchUrl) throw new Error('SEARXNG_URL_MISSING');
    const url = `${searchUrl}?q=${encodeURIComponent(query)}&format=json&engines=duckduckgo,brave,google`;
    const res = await withTimeout(fetch(url), ms);
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as { results?: unknown[] };
    return { results: normalizeResults((data.results ?? []).slice(0, 5)) };
  },

  custom: async (query, key, searchUrl, ms) => {
    if (!searchUrl) throw new Error('SEARCH_URL_MISSING');
    const headers: HeadersInit = key ? { 'Authorization': `Bearer ${key}` } : {};
    const res = await withTimeout(
      fetch(`${searchUrl}?q=${encodeURIComponent(query)}&format=json`, { headers }),
      ms,
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as { results?: unknown[] };
    return { results: normalizeResults((data.results ?? []).slice(0, 5)) };
  },

  tavily: async (query, key, _url, ms) => {
    const res = await withTimeout(
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ query, maxResults: 5, searchDepth: 'basic', includeAnswer: false }),
      }),
      ms,
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as { results?: unknown[] };
    return { results: normalizeResults(data.results ?? []) };
  },

  brave: async (query, key, _url, ms) => {
    const res = await withTimeout(
      fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
      }),
      ms,
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as { web?: { results?: unknown[] } };
    return { results: normalizeResults(data.web?.results ?? []) };
  },

  serper: async (query, key, _url, ms) => {
    const res = await withTimeout(
      fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
        body: JSON.stringify({ q: query, num: 5 }),
      }),
      ms,
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as { organic?: unknown[] };
    return { results: normalizeResults(data.organic ?? []) };
  },

  ddg: async (query, _key, _url, ms) => {
    const encoded = encodeURIComponent(query);
    const res = await withTimeout(
      fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`),
      ms,
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json() as {
      RelatedTopics?: Array<{ FirstURL?: string; Text?: string }>;
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
    };

    const results: SearchResult[] = [];

    for (const topic of (data.RelatedTopics ?? []).slice(0, 5)) {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title:   topic.Text.split(' - ')[0]?.slice(0, 100) ?? topic.Text.slice(0, 100),
          url:     topic.FirstURL,
          snippet: topic.Text.slice(0, 300),
        });
      }
    }

    if (results.length === 0 && data.AbstractText) {
      results.push({
        title:   data.Heading ?? query,
        url:     data.AbstractURL ?? '',
        snippet: data.AbstractText.slice(0, 300),
        content: data.AbstractText,
      });
    }

    return { results };
  },
};

// ─── Core search ──────────────────────────────────────────────────────────────

async function runProvider(
  source: SearchProvider,
  query: string,
  key: string,
  searchUrl: string | undefined,
  timeoutMs = SEARCH_TIMEOUT_MS,
): Promise<ProviderResult> {
  const adapter = adapters[source];
  if (!adapter) throw new Error(`UNKNOWN_PROVIDER: ${source}`);
  return adapter(query, key, searchUrl, timeoutMs);
}

/**
 * webSearch — primary export.
 *
 * Tries the configured provider, then a simplified query, then DDG as emergency fallback.
 * Returns a typed discriminated union — use `isSearchSuccess()` to narrow.
 */
export async function webSearch(
  query: string,
  options: { fetchFullContent?: boolean } = {},
): Promise<SearchOutcome> {
  const cleanQuery = sanitizeSearchQuery(query);
  if (!cleanQuery) {
    return { error: 'empty_query', errorCode: 'EMPTY', provider: 'none' };
  }

  const config = await getSearchConfig();
  let result: ProviderResult | null = null;
  let lastError = 'no_results';

  // Attempt 1 — primary provider, full timeout
  try {
    result = await runProvider(config.source, cleanQuery, config.key, config.searchUrl);
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }

  // Attempt 2 — simplified query on same provider (only if complex query and no results)
  if (!result?.results.length && cleanQuery.split(' ').length > 4) {
    const simple = simplifyQuery(cleanQuery);
    if (simple !== cleanQuery) {
      try {
        result = await runProvider(config.source, simple, config.key, config.searchUrl, 8_000);
        lastError = 'no_results'; // reset — simplified worked
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  // Attempt 3 — DDG free fallback
  if (!result?.results.length && config.source !== 'ddg') {
    try {
      result = await runProvider('ddg', cleanQuery, '', undefined, 10_000);
    } catch { /* keep lastError */ }
  }

  if (!result?.results.length) {
    return {
      error: lastError,
      errorCode: lastError.startsWith('TIMEOUT') ? 'TIMEOUT' : 'SEARCH_FAILED',
      provider: config.source,
    };
  }

  // Optionally enrich with full page content
  if (options.fetchFullContent) {
    await Promise.allSettled(
      result.results.slice(0, 3).map(async r => {
        if (!r.content && r.url) {
          r.content = await fetchAndCleanPage(r.url);
        }
      }),
    );
  }

  return { results: result.results, provider: config.source, query: cleanQuery };
}

// ─── Search + Summarize  ──────────────────────────────────────────────────────

export interface SummarizeOptions {
  /** The provider key already selected in the app (e.g. 'ollama', 'openai', 'gemini') */
  provider: string;
  /** The model name already selected in the app */
  model: string;
  /** API keys map from app state */
  apiKeys: Record<string, string>;
  /** Optional: pre-fetched full page content */
  fetchFullContent?: boolean;
}

/**
 * searchAndSummarize — convenience wrapper used by ChatPanel / tool executor.
 *
 * Runs webSearch then asks the ALREADY SELECTED model to synthesise an answer.
 * Delegates to callProvider() from providers.ts — no Ollama hard-coding.
 */
export async function searchAndSummarize(
  query: string,
  opts: SummarizeOptions,
  callProvider: (
    provider: string,
    model: string,
    prompt: string,
    apiKeys: Record<string, string>,
  ) => Promise<string>,
): Promise<string> {
  const outcome = await webSearch(query, { fetchFullContent: opts.fetchFullContent });

  if (!isSearchSuccess(outcome)) {
    return `⚠️ Search failed (${outcome.errorCode ?? outcome.error}). Try rephrasing your query.`;
  }

  if (outcome.results.length === 0) {
    return `No results found for: "${query}"`;
  }

  const context = outcome.results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}${r.content ? `\n\n${r.content.slice(0, 1_200)}` : ''}`)
    .join('\n\n---\n\n');

  const prompt = [
    `You are a helpful research assistant. Use ONLY the search results below to answer the user's query.`,
    `Cite sources by their number, e.g. [1], [2].`,
    `If the results don't contain enough information, say so clearly.\n`,
    `Search Results:\n${context}`,
    `\nUser Query: ${query}`,
    `\nAnswer:`,
  ].join('\n');

  return callProvider(opts.provider, opts.model, prompt, opts.apiKeys);
}