/**
 * Text chunker for RAG document ingestion.
 *
 * Splits text into overlapping chunks, preferring paragraph boundaries
 * to keep semantic units intact.
 */

export interface ChunkerConfig {
  /** Maximum characters per chunk (default: 1000) */
  chunkSize: number;
  /** Overlap characters between consecutive chunks (default: 200) */
  overlap: number;
}

export const CHUNKER_DEFAULTS: ChunkerConfig = {
  chunkSize: 1000,
  overlap: 200,
};

/**
 * Splits text into chunks suitable for embedding and retrieval.
 *
 * Strategy:
 * 1. Split on paragraph boundaries (\n\n) when possible.
 * 2. If a paragraph exceeds chunkSize, split mid-paragraph at word boundaries.
 * 3. Overlap trailing context from the previous chunk into the next one.
 *
 * @param text - The full document text to chunk.
 * @param config - Optional chunker configuration.
 * @returns Array of text chunks.
 * @throws If config values are invalid (chunkSize <= 0 or overlap >= chunkSize).
 */
export function chunkText(text: string, config?: Partial<ChunkerConfig>): string[] {
  const cfg: ChunkerConfig = { ...CHUNKER_DEFAULTS, ...config };

  // Validate config
  if (cfg.chunkSize <= 0) {
    throw new Error(`chunkSize must be positive, got ${cfg.chunkSize}`);
  }
  if (cfg.overlap >= cfg.chunkSize) {
    throw new Error(`overlap (${cfg.overlap}) must be less than chunkSize (${cfg.chunkSize})`);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  // If the whole text fits in one chunk, return it directly
  if (trimmed.length <= cfg.chunkSize) {
    return [trimmed];
  }

  // Split into paragraphs (double newlines)
  const paragraphs = splitParagraphs(trimmed);

  // Greedy merge paragraphs into chunks, splitting oversized ones
  const rawChunks: string[] = mergeParagraphs(paragraphs, cfg.chunkSize);

  // Apply overlap between consecutive chunks
  return applyOverlap(rawChunks, cfg.overlap);
}

/**
 * Splits text on paragraph boundaries (\n\n), preserving the paragraph text.
 */
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

/**
 * Merges paragraphs greedily into chunks up to chunkSize.
 * Oversized paragraphs are split at word boundaries.
 */
function mergeParagraphs(paragraphs: string[], chunkSize: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    // If this single paragraph exceeds chunkSize, split it
    if (para.length > chunkSize) {
      // Flush current buffer first
      if (current) {
        chunks.push(current);
        current = '';
      }
      // Split the long paragraph
      const subChunks = splitLongText(para, chunkSize);
      chunks.push(...subChunks);
      continue;
    }

    // Check if adding this paragraph would exceed chunkSize
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      // Flush current and start new
      if (current) {
        chunks.push(current);
      }
      current = para;
    }
  }

  // Flush remaining
  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Splits a single long text at word boundaries to fit within chunkSize.
 */
function splitLongText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // If we're not at the end, try to break at a word boundary
    if (end < text.length) {
      // Look backwards for a space within the last 20% of the chunk
      const searchStart = Math.max(start, end - Math.floor(chunkSize * 0.2));
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > searchStart) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Applies overlapping suffixes between consecutive chunks.
 * The last `overlap` characters of chunk[i] are prepended to chunk[i+1].
 */
function applyOverlap(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1 || overlap <= 0) {
    return chunks;
  }

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1];
    const overlapText = prevEnd.slice(-overlap);
    result[i] = overlapText + chunks[i];
  }

  return result;
}
