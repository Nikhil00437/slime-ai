/**
 * RAG Context Provider
 *
 * Manages document ingestion, chunking, storage, and semantic search
 * for Retrieval-Augmented Generation within Slime-AI.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { RagDocument, KnowledgeBase, ChunkResult, RagSearchOptions } from '../types/rag';
import { createRagStore, RagStore } from '../api/rag/store';
import { chunkText } from '../api/rag/chunker';
import { Embedder, MockEmbedder, findClosestChunks } from '../api/rag/embedding';

// ─── Context Type ─────────────────────────────────────────────────────────

interface RagContextType {
  documents: RagDocument[];
  knowledgeBases: KnowledgeBase[];
  isProcessing: boolean;
  error: string | null;

  importDocument: (file: File) => Promise<void>;
  importText: (filename: string, content: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;

  createKnowledgeBase: (name: string, description: string, documentIds: string[]) => Promise<void>;
  deleteKnowledgeBase: (id: string) => Promise<void>;

  search: (query: string, options?: Partial<RagSearchOptions>) => Promise<ChunkResult[]>;
}

const RagContext = createContext<RagContextType | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────

let _idCounter = 0;
function generateId(): string {
  _idCounter++;
  return `rag-${Date.now()}-${_idCounter}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────

interface RagProviderProps {
  children: React.ReactNode;
  /** For testing: inject a store and embedder */
  _store?: RagStore;
  _embedder?: Embedder;
}

export function RagProvider({ children, _store, _embedder }: RagProviderProps) {
  const storeRef = useRef<RagStore>(_store ?? createRagStore('memory'));
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embedderRef = useRef<Embedder>(_embedder ?? new MockEmbedder(128));

  // ── Refresh state from store ─────────────────────────────────────────

  const refreshDocuments = useCallback(async () => {
    const docs = await storeRef.current.listDocuments();
    setDocuments(docs);
  }, []);

  const refreshKnowledgeBases = useCallback(async () => {
    const kbs = await storeRef.current.listKnowledgeBases();
    setKnowledgeBases(kbs);
  }, []);

  // ── Import text ──────────────────────────────────────────────────────

  const importText = useCallback(async (filename: string, content: string): Promise<void> => {
    setIsProcessing(true);
    setError(null);

    try {
      const rawChunks = chunkText(content);
      const docId = generateId();

      const doc: RagDocument = {
        id: docId,
        filename,
        content,
        mimeType: 'text/plain',
        size: content.length,
        importedAt: Date.now(),
        chunkCount: rawChunks.length,
      };

      const chunks = rawChunks.map((text, index) => ({
        id: `${docId}-chunk-${index}`,
        documentId: docId,
        content: text,
        index,
      }));

      await storeRef.current.addDocument(doc, chunks);
      await refreshDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [refreshDocuments]);

  // ── Import file ──────────────────────────────────────────────────────

  const importDocument = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    await importText(file.name, text);
  }, [importText]);

  // ── Remove document ──────────────────────────────────────────────────

  const removeDocument = useCallback(async (id: string): Promise<void> => {
    await storeRef.current.deleteDocument(id);
    await refreshDocuments();
  }, [refreshDocuments]);

  // ── Knowledge bases ──────────────────────────────────────────────────

  const createKnowledgeBase = useCallback(async (
    name: string,
    description: string,
    documentIds: string[],
  ): Promise<void> => {
    const kb: KnowledgeBase = {
      id: generateId(),
      name,
      description,
      documentIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storeRef.current.createKnowledgeBase(kb);
    await refreshKnowledgeBases();
  }, [refreshKnowledgeBases]);

  const deleteKnowledgeBase = useCallback(async (id: string): Promise<void> => {
    await storeRef.current.deleteKnowledgeBase(id);
    await refreshKnowledgeBases();
  }, [refreshKnowledgeBases]);

  // ── Search ───────────────────────────────────────────────────────────

  const search = useCallback(async (
    query: string,
    options?: Partial<RagSearchOptions>,
  ): Promise<ChunkResult[]> => {
    const allChunks = await storeRef.current.getAllChunks();
    if (allChunks.length === 0) {
      return [];
    }

    return findClosestChunks(query, allChunks, embedderRef.current, options);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <RagContext.Provider value={{
      documents,
      knowledgeBases,
      isProcessing,
      error,
      importDocument,
      importText,
      removeDocument,
      createKnowledgeBase,
      deleteKnowledgeBase,
      search,
    }}>
      {children}
    </RagContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useRag(): RagContextType {
  const context = useContext(RagContext);
  if (!context) {
    throw new Error('useRag must be used within RagProvider');
  }
  return context;
}
