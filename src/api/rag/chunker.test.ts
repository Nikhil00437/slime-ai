import { describe, it, expect } from 'vitest';
import { chunkText, CHUNKER_DEFAULTS, ChunkerConfig } from './chunker';

describe('chunkText', () => {
  it('returns empty array for empty text', () => {
    const result = chunkText('');
    expect(result).toEqual([]);
  });

  it('returns empty array for whitespace-only text', () => {
    const result = chunkText('   \n  \t  ');
    expect(result).toEqual([]);
  });

  it('returns single chunk for text shorter than chunk size', () => {
    const text = 'Hello, world!';
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it('splits text into multiple chunks at paragraph boundaries', () => {
    const paragraph = 'A'.repeat(200);
    // Two paragraphs separated by newlines
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const result = chunkText(text, { chunkSize: 500, overlap: 0 });
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should be at most chunkSize
    result.forEach((chunk, i) => {
      expect(chunk.length).toBeLessThanOrEqual(500);
    });
  });

  it('respects chunk size limit', () => {
    const text = 'A'.repeat(2500);
    const chunkSize = 1000;
    const result = chunkText(text, { chunkSize, overlap: 0 });
    expect(result.length).toBeGreaterThanOrEqual(3);
    result.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(chunkSize);
    });
  });

  it('includes overlap between consecutive chunks', () => {
    const text = 'Hello world. This is a test. '.repeat(50);
    const overlap = 100;
    const chunkSize = 300;
    const result = chunkText(text, { chunkSize, overlap });

    expect(result.length).toBeGreaterThan(1);
    // Check that overlap exists: each chunk (except first) should end with
    // text that also appears at the start of the previous chunk
    for (let i = 1; i < result.length; i++) {
      const prevChunk = result[i - 1];
      const currChunk = result[i];
      // The start of current chunk should appear near the end of previous chunk
      const overlapSample = currChunk.substring(0, Math.min(50, currChunk.length));
      expect(prevChunk).toContain(overlapSample);
    }
  });

  it('uses default config when no options provided', () => {
    const text = 'A'.repeat(CHUNKER_DEFAULTS.chunkSize * 3);
    const result = chunkText(text);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('preserves paragraph boundaries when possible', () => {
    // Create text with distinct paragraph-sized chunks
    const paragraphs = [
      'First paragraph about something interesting.',
      'Second paragraph about something else entirely.',
      'Third paragraph with more detailed information.',
      'Fourth paragraph concluding the discussion.',
    ];
    const text = paragraphs.join('\n\n');
    const result = chunkText(text, { chunkSize: 200, overlap: 0 });

    // Each paragraph should be wholly contained in some chunk
    paragraphs.forEach((p) => {
      const found = result.some((chunk) => chunk.includes(p));
      expect(found).toBe(true);
    });
  });

  it('handles single character text', () => {
    const result = chunkText('X');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('X');
  });

  it('handles text exactly at chunk size', () => {
    const text = 'A'.repeat(CHUNKER_DEFAULTS.chunkSize);
    const result = chunkText(text, { chunkSize: CHUNKER_DEFAULTS.chunkSize, overlap: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(CHUNKER_DEFAULTS.chunkSize);
  });

  it('handles text with only newlines', () => {
    const result = chunkText('\n\n\n\n\n');
    expect(result).toEqual([]);
  });

  it('throws for invalid config', () => {
    expect(() => chunkText('test', { chunkSize: 0 })).toThrow();
    expect(() => chunkText('test', { chunkSize: -1 })).toThrow();
    expect(() => chunkText('test', { chunkSize: 100, overlap: 150 })).toThrow();
  });
});
