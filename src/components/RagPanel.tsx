import React, { useState, useRef, useCallback } from 'react';
import { useRag } from '../store/RagContext';
import { Upload, FileText, Trash2, Search, FolderPlus, X, Loader2, BookOpen } from 'lucide-react';

interface RagPanelProps {
  onClose?: () => void;
}

export function RagPanel({ onClose }: RagPanelProps) {
  const {
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
  } = useRag();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showNewKb, setShowNewKb] = useState(false);
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ content: string; score: number; source: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── File handling ──────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        await importDocument(file);
      }
    }
  }, [importDocument]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onFilePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  // ── Knowledge base ─────────────────────────────────────────────────

  const handleCreateKb = useCallback(async () => {
    if (!kbName.trim()) return;
    const docIds = documents.map((d) => d.id);
    await createKnowledgeBase(kbName.trim(), kbDesc.trim(), docIds);
    setKbName('');
    setKbDesc('');
    setShowNewKb(false);
  }, [kbName, kbDesc, documents, createKnowledgeBase]);

  // ── Search ─────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim() || documents.length === 0) return;
    setIsSearching(true);
    try {
      const results = await search(query.trim(), { topK: 5, minScore: 0 });
      const docMap = new Map(documents.map((d) => [d.id, d.filename]));
      setSearchResults(
        results.map((r) => ({
          content: r.chunk.content.substring(0, 300),
          score: r.score,
          source: docMap.get(r.chunk.documentId) ?? 'unknown',
        })),
      );
    } finally {
      setIsSearching(false);
    }
  }, [query, documents, search]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-dark-500 hover:text-dark-200 btn-press">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Status */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-dark-600 hover:border-dark-500 bg-dark-800/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml,.yaml,.yml"
          multiple
          className="hidden"
          onChange={onFilePick}
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-dark-500" />
        <p className="text-sm text-dark-300">
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            'Drop text files here or click to browse'
          )}
        </p>
        <p className="text-xs text-dark-600 mt-1">.txt .md .json .csv .js .ts .py .html .css</p>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search documents..."
            className="flex-1 px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-3 py-2 bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
            Search Results ({searchResults.length})
          </h3>
          {searchResults.map((r, i) => (
            <div key={i} className="p-3 bg-dark-800/40 border border-dark-700 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-cyan-400 font-medium">{r.source}</span>
                <span className="text-xs text-dark-500">{(r.score * 100).toFixed(0)}%</span>
              </div>
              <p className="text-sm text-dark-200 line-clamp-3">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Documents List */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
          Documents ({documents.length})
        </h3>
        {documents.length === 0 && (
          <p className="text-sm text-dark-600 italic">No documents imported yet.</p>
        )}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-dark-800/40 border border-dark-700 rounded-lg group"
          >
            <FileText className="w-4 h-4 text-dark-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-200 truncate">{doc.filename}</p>
              <p className="text-xs text-dark-600">
                {(doc.size / 1024).toFixed(1)} KB · {doc.chunkCount} chunks
              </p>
            </div>
            <button
              onClick={() => removeDocument(doc.id)}
              className="p-1.5 text-dark-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Remove document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Knowledge Bases */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
            Collections ({knowledgeBases.length})
          </h3>
          <button
            onClick={() => setShowNewKb(!showNewKb)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {showNewKb && (
          <div className="p-3 bg-dark-800/60 border border-dark-600 rounded-lg flex flex-col gap-2">
            <input
              value={kbName}
              onChange={(e) => setKbName(e.target.value)}
              placeholder="Collection name"
              className="px-2 py-1.5 bg-dark-900/50 border border-dark-600 rounded text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50"
            />
            <input
              value={kbDesc}
              onChange={(e) => setKbDesc(e.target.value)}
              placeholder="Description (optional)"
              className="px-2 py-1.5 bg-dark-900/50 border border-dark-600 rounded text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateKb}
                disabled={!kbName.trim() || documents.length === 0}
                className="flex-1 px-2 py-1.5 bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-40 text-xs text-white rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewKb(false)}
                className="px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-xs text-dark-300 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {knowledgeBases.length === 0 && !showNewKb && (
          <p className="text-sm text-dark-600 italic">No collections yet.</p>
        )}
        {knowledgeBases.map((kb) => (
          <div
            key={kb.id}
            className="flex items-center gap-3 p-3 bg-dark-800/40 border border-dark-700 rounded-lg"
          >
            <BookOpen className="w-4 h-4 text-dark-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-200 truncate">{kb.name}</p>
              <p className="text-xs text-dark-600">
                {kb.description || 'No description'} · {kb.documentIds.length} documents
              </p>
            </div>
            <button
              onClick={() => deleteKnowledgeBase(kb.id)}
              className="p-1.5 text-dark-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
              title="Delete collection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
