import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, Trash2, Copy, Download, X } from 'lucide-react';

interface BulkSelectContextValue {
  selectedIds: Set<string>;
  isSelecting: boolean;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setIsSelecting: (value: boolean) => void;
  isSelected: (id: string) => boolean;
}

const BulkSelectContext = createContext<BulkSelectContextValue | null>(null);

export function useBulkSelect() {
  const ctx = useContext(BulkSelectContext);
  if (!ctx) throw new Error('useBulkSelect must be used within BulkSelectProvider');
  return ctx;
}

interface BulkSelectProviderProps {
  children: React.ReactNode;
  onBulkDelete?: (ids: string[]) => void;
  onBulkExport?: (ids: string[]) => void;
  onBulkCopy?: (ids: string[]) => void;
}

export function BulkSelectProvider({
  children,
  onBulkDelete,
  onBulkExport,
  onBulkCopy,
}: BulkSelectProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const handleDelete = useCallback(() => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  }, [onBulkDelete, selectedIds, clearSelection]);

  const handleExport = useCallback(() => {
    if (onBulkExport && selectedIds.size > 0) {
      onBulkExport(Array.from(selectedIds));
    }
  }, [onBulkExport, selectedIds]);

  const handleCopy = useCallback(() => {
    if (onBulkCopy && selectedIds.size > 0) {
      onBulkCopy(Array.from(selectedIds));
    }
  }, [onBulkCopy, selectedIds]);

  return (
    <BulkSelectContext.Provider
      value={{
        selectedIds,
        isSelecting,
        toggleSelection,
        selectAll,
        clearSelection,
        setIsSelecting,
        isSelected,
      }}
    >
      {isSelecting && selectedIds.size > 0 && (
        <BulkSelectActionsBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          onDelete={handleDelete}
          onExport={onBulkExport ? handleExport : undefined}
          onCopy={onBulkCopy ? handleCopy : undefined}
        />
      )}
      {children}
    </BulkSelectContext.Provider>
  );
}

interface BulkSelectActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport?: () => void;
  onCopy?: () => void;
}

function BulkSelectActionsBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
  onCopy,
}: BulkSelectActionsBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-gray-800/95 backdrop-blur border-b border-gray-700 px-4 py-2 animate-fade-in-down">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors btn-press"
            title="Cancel selection"
          >
            <X size={16} />
          </button>
          <span className="text-sm text-gray-300">
            <span className="font-semibold text-white">{selectedCount}</span> selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCopy && (
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors btn-press"
            >
              <Copy size={14} />
              Copy
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors btn-press"
            >
              <Download size={14} />
              Export
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors btn-press"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface SelectableMessageProps {
  id: string;
  children: React.ReactNode;
}

export function SelectableMessage({ id, children }: SelectableMessageProps) {
  const { toggleSelection, isSelected, isSelecting, setIsSelecting } = useBulkSelect();
  const selected = isSelected(id);

  const handleClick = () => {
    if (!isSelecting) {
      setIsSelecting(true);
    }
    toggleSelection(id);
  };

  return (
    <div
      className={`group relative transition-colors cursor-pointer ${
        selected ? 'bg-blue-900/20 border-l-2 border-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      {/* Selection indicator */}
      <div
        className={`absolute -left-3 top-4 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
          selected
            ? 'bg-blue-500 border-blue-500'
            : isSelecting
            ? 'border-gray-500 group-hover:border-gray-400'
            : 'border-gray-600 opacity-0 group-hover:opacity-100'
        }`}
      >
        {selected && <Check size={10} className="text-white" />}
      </div>

      {children}
    </div>
  );
}