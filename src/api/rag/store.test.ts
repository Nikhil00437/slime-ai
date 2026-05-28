import { describe, it, expect, beforeEach } from 'vitest';
import { createRagStore, RagStore } from './store';
import { RagDocument, DocumentChunk, KnowledgeBase } from '../../types/rag';

describe('RagStore (InMemory)', () => {
  let store: RagStore;

  beforeEach(() => {
    store = createRagStore('memory');
  });

  const sampleDoc: RagDocument = {
    id: 'doc-1',
    filename: 'test.txt',
    content: 'Hello world. This is a test document.',
    mimeType: 'text/plain',
    size: 42,
    importedAt: Date.now(),
    chunkCount: 1,
  };

  const sampleChunks: DocumentChunk[] = [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      content: 'Hello world. This is a test document.',
      index: 0,
    },
  ];

  describe('document operations', () => {
    it('adds a document with chunks', async () => {
      await store.addDocument(sampleDoc, sampleChunks);
      const retrieved = await store.getDocument('doc-1');
      expect(retrieved).toEqual(sampleDoc);
    });

    it('returns null for non-existent document', async () => {
      const result = await store.getDocument('nonexistent');
      expect(result).toBeNull();
    });

    it('lists all documents', async () => {
      await store.addDocument(sampleDoc, sampleChunks);
      await store.addDocument(
        { ...sampleDoc, id: 'doc-2', filename: 'test2.txt' },
        [{ id: 'chunk-2', documentId: 'doc-2', content: 'Second doc', index: 0 }],
      );
      const docs = await store.listDocuments();
      expect(docs).toHaveLength(2);
      expect(docs.map((d) => d.id)).toEqual(['doc-1', 'doc-2']);
    });

    it('returns empty list when no documents exist', async () => {
      const docs = await store.listDocuments();
      expect(docs).toEqual([]);
    });

    it('deletes a document and its chunks', async () => {
      await store.addDocument(sampleDoc, sampleChunks);
      await store.deleteDocument('doc-1');
      const doc = await store.getDocument('doc-1');
      expect(doc).toBeNull();
      const chunks = await store.getChunks('doc-1');
      expect(chunks).toEqual([]);
    });

    it('retrieves chunks for a document', async () => {
      await store.addDocument(sampleDoc, sampleChunks);
      const chunks = await store.getChunks('doc-1');
      expect(chunks).toEqual(sampleChunks);
    });

    it('returns empty array for unknown document chunks', async () => {
      const chunks = await store.getChunks('nonexistent');
      expect(chunks).toEqual([]);
    });

    it('retrieves all chunks across documents', async () => {
      await store.addDocument(sampleDoc, sampleChunks);
      await store.addDocument(
        { ...sampleDoc, id: 'doc-2', filename: 'test2.txt' },
        [{ id: 'chunk-2', documentId: 'doc-2', content: 'Second', index: 0 }],
      );
      const all = await store.getAllChunks();
      expect(all).toHaveLength(2);
    });
  });

  describe('knowledge base operations', () => {
    const sampleKb: KnowledgeBase = {
      id: 'kb-1',
      name: 'My Knowledge Base',
      description: 'Test KB',
      documentIds: ['doc-1'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('creates a knowledge base', async () => {
      await store.createKnowledgeBase(sampleKb);
      const retrieved = await store.getKnowledgeBase('kb-1');
      expect(retrieved).toEqual(sampleKb);
    });

    it('returns null for non-existent knowledge base', async () => {
      const result = await store.getKnowledgeBase('nonexistent');
      expect(result).toBeNull();
    });

    it('lists all knowledge bases', async () => {
      await store.createKnowledgeBase(sampleKb);
      await store.createKnowledgeBase({
        ...sampleKb,
        id: 'kb-2',
        name: 'Second KB',
      });
      const kbs = await store.listKnowledgeBases();
      expect(kbs).toHaveLength(2);
    });

    it('returns empty list when no knowledge bases exist', async () => {
      const kbs = await store.listKnowledgeBases();
      expect(kbs).toEqual([]);
    });

    it('updates a knowledge base', async () => {
      await store.createKnowledgeBase(sampleKb);
      const updated = { ...sampleKb, name: 'Updated KB' };
      await store.updateKnowledgeBase(updated);
      const retrieved = await store.getKnowledgeBase('kb-1');
      expect(retrieved?.name).toBe('Updated KB');
    });

    it('deletes a knowledge base', async () => {
      await store.createKnowledgeBase(sampleKb);
      await store.deleteKnowledgeBase('kb-1');
      const result = await store.getKnowledgeBase('kb-1');
      expect(result).toBeNull();
    });
  });
});
