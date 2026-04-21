import React, { useState, useEffect } from 'react';
import {
  getWorkingMemory,
  addToWorkingMemory,
  markImportant,
  removeFromWorkingMemory,
  clearWorkingMemory,
  getContextWindow,
  searchWorkingMemory,
  setWorkingMemorySettings,
  WorkingMemoryItem,
} from '../api/memory';
import {
  Brain,
  Trash2,
  Star,
  Search,
  X,
  Clock,
  BarChart3,
  Settings,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface MemoryPanelProps {
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ onClose }) => {
  const [memory, setMemory] = useState(getWorkingMemory());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkingMemoryItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newItem, setNewItem] = useState('');

  // Refresh memory state
  useEffect(() => {
    const interval = setInterval(() => {
      setMemory(getWorkingMemory());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchResults(searchWorkingMemory(searchQuery));
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    addToWorkingMemory(newItem, false);
    setNewItem('');
    setMemory(getWorkingMemory());
  };

  const handleMarkImportant = (id: string) => {
    markImportant(id);
    setMemory(getWorkingMemory());
  };

  const handleRemove = (id: string) => {
    removeFromWorkingMemory(id);
    setMemory(getWorkingMemory());
  };

  const handleClear = () => {
    if (confirm('Clear all working memory?')) {
      clearWorkingMemory();
      setMemory(getWorkingMemory());
    }
  };

  const handleSaveSettings = (newSettings: Partial<typeof memory>) => {
    setWorkingMemorySettings(newSettings);
    setMemory(getWorkingMemory());
  };

  const ctx = getContextWindow();
  const usagePercent = Math.round((ctx.tokenCount / memory.maxTokens) * 100);

  const displayItems = searchQuery.trim() ? searchResults : memory.items;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-white font-semibold">Working Memory</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-800 text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Memory Usage Bar */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <BarChart3 size={12} />
            Token Usage
          </span>
          <span className="text-xs text-gray-400">
            {ctx.tokenCount} / {memory.maxTokens} ({usagePercent}%)
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              usagePercent > 80 ? 'bg-red-500' :
              usagePercent > 60 ? 'bg-yellow-500' :
              'bg-purple-500'
            }`}
            style={{ width: `${Math.min(100, usagePercent)}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-800">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search memory..."
            className="w-full pl-7 pr-8 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Add New Item */}
      <div className="px-4 py-2 border-b border-gray-800">
        <textarea
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleAddItem();
            }
          }}
          placeholder="Add to memory... (Ctrl+Enter)"
          className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          rows={2}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">Ctrl+Enter to add</span>
          <button
            onClick={handleAddItem}
            disabled={!newItem.trim()}
            className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No memory items</p>
            <p className="text-xs mt-1">Add important info to remember</p>
          </div>
        ) : (
          displayItems.map(item => (
            <div
              key={item.id}
              className={`p-2 rounded-lg border ${
                item.important
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-300 flex-1">{item.content}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMarkImportant(item.id)}
                    className={`p-1 rounded ${
                      item.important
                        ? 'text-yellow-400'
                        : 'text-gray-500 hover:text-yellow-400'
                    }`}
                    title={item.important ? 'Important' : 'Mark important'}
                  >
                    <Star size={12} fill={item.important ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1 rounded text-gray-500 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {item.turnsAgo === 0 ? 'Just now' : `${item.turnsAgo} turns ago`}
                </span>
                <span>·</span>
                <span>{Math.ceil(item.content.length / 4)} tokens</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-800 flex items-center gap-2">
        <button
          onClick={handleClear}
          className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm flex items-center justify-center gap-1"
        >
          <Trash2 size={14} />
          Clear
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm flex items-center justify-center gap-1"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-t border-gray-800 bg-gray-800/50 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Memory Settings</h3>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
            <input
              type="number"
              value={memory.maxTokens}
              onChange={e => handleSaveSettings({ maxTokens: parseInt(e.target.value) || 4000 })}
              min={1000}
              max={128000}
              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Summarize After (turns)</label>
            <input
              type="number"
              value={memory.summarizeAfter}
              onChange={e => handleSaveSettings({ summarizeAfter: parseInt(e.target.value) || 10 })}
              min={3}
              max={50}
              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-gray-300"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoSummarize"
              checked={memory.autoSummarize}
              onChange={e => handleSaveSettings({ autoSummarize: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900"
            />
            <label htmlFor="autoSummarize" className="text-xs text-gray-400">
              Auto-summarize
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryPanel;