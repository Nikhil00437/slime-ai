/**
 * RAG Embedding Service
 *
 * Provides text embedding via Ollama API and cosine similarity search.
 * Includes a MockEmbedder for testing without a running Ollama instance.
 */

import { DocumentChunk, ChunkResult, RagSearchOptions, RAG_SEARCH_DEFAULTS } from '../../types/rag';

// ─── Embedder Interface ───────────────────────────────────────────────────

export interface Embedder {
  /** Embed text into a vector of floating point numbers. */
  embed(text: string): Promise<number[]>;
}

// ─── Mock Embedder (deterministic, for tests) ─────────────────────────────

export class MockEmbedder implements Embedder {
  private dimension: number;

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  /**
   * Generates a deterministic mock embedding vector from text content.
   * Uses a simple hash-based approach to produce consistent vectors.
   * Vectors are normalized to unit length.
   */
  async embed(text: string): Promise<number[]> {
    const vec = new Array(this.dimension).fill(0);

    // Hash-based positioning: each character influences nearby dimensions
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const dimBase = (code * 7 + i * 13) % this.dimension;
      const influence = (code % 10) / 10;

      for (let j = -2; j <= 2; j++) {
        const idx = (dimBase + j + this.dimension) % this.dimension;
        vec[idx] += influence / (Math.abs(j) + 1);
      }
    }

    // Normalize to unit length
    return normalizeVector(vec);
  }
}

// ─── Ollama Embedder ──────────────────────────────────────────────────────

export class OllamaEmbedder implements Embedder {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'nomic-embed-text') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Ollama returned invalid embedding response');
    }

    return data.embedding as number[];
  }
}

// ─── Vector Math ──────────────────────────────────────────────────────────

/**
 * Computes cosine similarity between two vectors.
 * Returns values in [-1, 1] where 1 = identical direction.
 *
 * @throws If vectors have different lengths or are empty.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    throw new Error('Vectors must not be empty');
  }
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) {
    return 0; // One or both vectors are zero
  }

  return dotProduct / magnitude;
}

/**
 * Normalizes a vector to unit length.
 */
function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

// ─── Search ───────────────────────────────────────────────────────────────

/**
 * Embeds a query string and returns the embedding vector.
 */
export async function embedQuery(query: string, embedder: Embedder): Promise<number[]> {
  return embedder.embed(query);
}

/**
 * Finds the closest chunks to a query using cosine similarity.
 *
 * @param query - The search query.
 * @param chunks - Candidate chunks to search.
 * @param embedder - Embedder instance.
 * @param options - Search options (topK, minScore).
 * @returns Ranked results sorted by descending similarity score.
 */
export async function findClosestChunks(
  query: string,
  chunks: DocumentChunk[],
  embedder: Embedder,
  options: Partial<RagSearchOptions> = {},
): Promise<ChunkResult[]> {
  const cfg = { ...RAG_SEARCH_DEFAULTS, ...options };

  if (chunks.length === 0) {
    return [];
  }

  // Embed query once
  const queryVec = await embedder.embed(query);

  // Embed all chunks (in parallel for performance)
  const chunkVectors = await Promise.all(
    chunks.map(async (chunk) => ({
      chunk,
      vector: await embedder.embed(chunk.content),
    })),
  );

  // Compute similarities
  const results: ChunkResult[] = chunkVectors
    .map(({ chunk, vector }) => ({
      chunk,
      score: cosineSimilarity(queryVec, vector),
    }))
    .filter((r) => r.score >= cfg.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.topK);

  return results;
}
