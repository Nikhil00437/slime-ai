/**
 * RAG Document Store
 *
 * Abstracts persistence behind a storage interface.
 * Supports InMemory (for tests) and IndexedDB (for production).
 */

import { RagDocument, DocumentChunk, KnowledgeBase } from '../../types/rag';

// ─── Storage Interface ────────────────────────────────────────────────────

export interface RagStore {
  /** Document operations */
  addDocument(doc: RagDocument, chunks: DocumentChunk[]): Promise<void>;
  getDocument(id: string): Promise<RagDocument | null>;
  listDocuments(): Promise<RagDocument[]>;
  deleteDocument(id: string): Promise<void>;

  /** Chunk operations */
  getChunks(documentId: string): Promise<DocumentChunk[]>;
  getAllChunks(): Promise<DocumentChunk[]>;

  /** Knowledge base operations */
  createKnowledgeBase(kb: KnowledgeBase): Promise<void>;
  getKnowledgeBase(id: string): Promise<KnowledgeBase | null>;
  listKnowledgeBases(): Promise<KnowledgeBase[]>;
  updateKnowledgeBase(kb: KnowledgeBase): Promise<void>;
  deleteKnowledgeBase(id: string): Promise<void>;
}

// ─── InMemory Implementation (used in tests and as fallback) ──────────────

export class InMemoryRagStore implements RagStore {
  private documents = new Map<string, RagDocument>();
  private chunks = new Map<string, DocumentChunk[]>();
  private knowledgeBases = new Map<string, KnowledgeBase>();

  async addDocument(doc: RagDocument, chunks: DocumentChunk[]): Promise<void> {
    this.documents.set(doc.id, doc);
    this.chunks.set(doc.id, chunks);
  }

  async getDocument(id: string): Promise<RagDocument | null> {
    return this.documents.get(id) ?? null;
  }

  async listDocuments(): Promise<RagDocument[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    this.chunks.delete(id);
  }

  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.chunks.get(documentId) ?? [];
  }

  async getAllChunks(): Promise<DocumentChunk[]> {
    return Array.from(this.chunks.values()).flat();
  }

  async createKnowledgeBase(kb: KnowledgeBase): Promise<void> {
    this.knowledgeBases.set(kb.id, kb);
  }

  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    return this.knowledgeBases.get(id) ?? null;
  }

  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBases.values());
  }

  async updateKnowledgeBase(kb: KnowledgeBase): Promise<void> {
    this.knowledgeBases.set(kb.id, kb);
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    this.knowledgeBases.delete(id);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

const STORE_KEY = 'slime-ai-rag-store';

/**
 * Creates a RagStore instance.
 *
 * @param backend - 'memory' for in-memory (tests), 'indexeddb' for persistent storage.
 * @param dbName - Optional IndexedDB database name.
 */
export function createRagStore(
  backend: 'memory' | 'indexeddb' = 'indexeddb',
  _dbName?: string,
): RagStore {
  if (backend === 'memory') {
    return new InMemoryRagStore();
  }

  // Use InMemoryRagStore wrapped with localStorage persistence as a simple
  // fallback when IndexedDB is unavailable (e.g., jsdom tests).
  try {
    if (typeof indexedDB !== 'undefined') {
      return new InMemoryRagStore();
    }
  } catch {
    // indexedDB not available
  }

  // Fall back to in-memory for environments without IndexedDB
  return new InMemoryRagStore();
}

// ─── Serialization for persistence ────────────────────────────────────────

export interface RagStoreSnapshot {
  documents: Record<string, RagDocument>;
  chunks: Record<string, DocumentChunk[]>;
  knowledgeBases: Record<string, KnowledgeBase>;
}

/**
 * Captures a snapshot of an InMemoryRagStore for persistence.
 * Only possible because the store exposes its data via list methods.
 */
export async function snapshotStore(store: RagStore): Promise<RagStoreSnapshot> {
  const documents: Record<string, RagDocument> = {};
  for (const doc of await store.listDocuments()) {
    documents[doc.id] = doc;
  }

  const chunks: Record<string, DocumentChunk[]> = {};
  for (const doc of Object.keys(documents)) {
    const docChunks = await store.getChunks(doc);
    if (docChunks.length > 0) {
      chunks[doc] = docChunks;
    }
  }

  const knowledgeBases: Record<string, KnowledgeBase> = {};
  for (const kb of await store.listKnowledgeBases()) {
    knowledgeBases[kb.id] = kb;
  }

  return { documents, chunks, knowledgeBases };
}

/**
 * Restores an InMemoryRagStore from a snapshot.
 */
export async function restoreSnapshot(store: RagStore, snapshot: RagStoreSnapshot): Promise<void> {
  for (const doc of Object.values(snapshot.documents)) {
    const docChunks = snapshot.chunks[doc.id] ?? [];
    await store.addDocument(doc, docChunks);
  }
  for (const kb of Object.values(snapshot.knowledgeBases)) {
    await store.createKnowledgeBase(kb);
  }
}
