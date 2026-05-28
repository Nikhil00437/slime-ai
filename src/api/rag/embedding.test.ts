import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  MockEmbedder,
  Embedder,
  embedQuery,
  findClosestChunks,
} from './embedding';
import { DocumentChunk } from '../../types/rag';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('handles zero vector gracefully', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('throws for mismatched lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });

  it('throws for empty vectors', () => {
    expect(() => cosineSimilarity([], [])).toThrow();
  });
});

describe('MockEmbedder', () => {
  const embedder: Embedder = new MockEmbedder(4);

  it('returns vector of specified dimension', async () => {
    const vec = await embedder.embed('hello');
    expect(vec).toHaveLength(4);
  });

  it('returns deterministic vectors for same text', async () => {
    const a = await embedder.embed('same text');
    const b = await embedder.embed('same text');
    expect(a).toEqual(b);
  });

  it('returns different vectors for different text', async () => {
    const a = await embedder.embed('apple');
    const b = await embedder.embed('banana');
    expect(a).not.toEqual(b);
  });

  it('returns normalized vectors (unit length)', async () => {
    const vec = await embedder.embed('test');
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('produces higher similarity for related text', async () => {
    const programming = await embedder.embed('javascript code');
    const coding = await embedder.embed('python programming');
    const cooking = await embedder.embed('cake recipe');

    const progCodingSim = cosineSimilarity(programming, coding);
    const progCookingSim = cosineSimilarity(programming, cooking);

    expect(progCodingSim).toBeGreaterThan(progCookingSim);
  });
});

describe('findClosestChunks', () => {
  const embedder: Embedder = new MockEmbedder(4);

  const chunks: DocumentChunk[] = [
    { id: 'c1', documentId: 'd1', content: 'javascript programming guide', index: 0 },
    { id: 'c2', documentId: 'd1', content: 'python for data science', index: 1 },
    { id: 'c3', documentId: 'd1', content: 'cake baking instructions', index: 2 },
    { id: 'c4', documentId: 'd1', content: 'react frontend development', index: 3 },
  ];

  it('returns top K results ordered by score descending', async () => {
    const results = await findClosestChunks('programming code', chunks, embedder, { topK: 2, minScore: 0 });

    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('filters results below minScore', async () => {
    // Use an impossibly high threshold to verify filtering works
    const results = await findClosestChunks('programming code', chunks, embedder, { topK: 10, minScore: 1.5 });

    // No embedding similarity can exceed 1.0, so all should be filtered
    expect(results).toHaveLength(0);
  });

  it('returns all results with minScore of -1', async () => {
    const results = await findClosestChunks('programming code', chunks, embedder, { topK: 10, minScore: -1 });
    expect(results).toHaveLength(4);
  });

  it('returns empty array for empty chunks', async () => {
    const results = await findClosestChunks('test', [], embedder, { topK: 5, minScore: 0 });
    expect(results).toEqual([]);
  });

  it('returns chunk objects with scores', async () => {
    const results = await findClosestChunks('javascript', chunks, embedder, { topK: 1, minScore: 0 });
    expect(results[0]).toHaveProperty('chunk');
    expect(results[0]).toHaveProperty('score');
    expect(results[0].chunk.id).toBeDefined();
    expect(typeof results[0].score).toBe('number');
  });

  it('handles single chunk', async () => {
    const results = await findClosestChunks('test', [chunks[0]], embedder, { topK: 5, minScore: 0 });
    expect(results).toHaveLength(1);
  });
});

describe('embedQuery', () => {
  it('embeds text via MockEmbedder and returns vector', async () => {
    const embedder = new MockEmbedder(4);
    const vec = await embedQuery('hello world', embedder);
    expect(vec).toHaveLength(4);
  });
});
