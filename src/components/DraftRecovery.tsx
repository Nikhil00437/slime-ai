import React, { useState } from 'react';
import { History, RotateCcw, Trash2, Clock } from 'lucide-react';
import { DraftEntry, getConversationDraftHistory, restoreFromHistory, clearDraft } from '../utils/draftStorage';

interface DraftRecoveryProps {
  conversationId: string;
  currentContent: string;
  onRestore: (content: string) => void;
}

export function DraftRecovery({ conversationId, currentContent, onRestore }: DraftRecoveryProps) {
  const [history, setHistory] = useState<DraftEntry[]>(() => getConversationDraftHistory(conversationId));
  const [showHistory, setShowHistory] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleRestore = (entry: DraftEntry) => {
    onRestore(entry.content);
    setShowHistory(false);
  };

  const handleClear = () => {
    clearDraft(conversationId);
    setHistory([]);
    setShowHistory(false);
  };

  if (history.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        title="View draft history"
      >
        <History size={14} />
        <span>{history.length} saved</span>
      </button>

      {showHistory && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock size={14} />
                Draft History
              </div>
              <button
                onClick={handleClear}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                title="Clear all drafts"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {history.map((entry, index) => (
                <div
                  key={entry.timestamp}
                  className="p-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
                    {index === 0 && (
                      <span className="text-xs text-blue-400">Latest</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                    {entry.content.slice(0, 100)}
                    {entry.content.length > 100 && '...'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(entry)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}