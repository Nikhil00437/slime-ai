/**
 * Slime-AI RAG (Retrieval-Augmented Generation) System
 *
 * Types for document ingestion, chunking, embedding, and retrieval.
 */

export interface RagDocument {
  id: string;
  filename: string;
  content: string;
  mimeType: string;
  size: number;
  importedAt: number;
  chunkCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata?: Record<string, string>;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChunkResult {
  chunk: DocumentChunk;
  score: number;
}

export interface EmbeddingVector {
  chunkId: string;
  vector: number[];
}

export interface RagSearchOptions {
  topK: number;
  minScore: number;
}

export const RAG_SEARCH_DEFAULTS: RagSearchOptions = {
  topK: 5,
  minScore: 0.5,
};
