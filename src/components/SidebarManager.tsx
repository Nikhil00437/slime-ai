import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AssistantSidebarContent,
  SidebarBlockType,
  ThinkingBlock,
  ProcessingBlock,
  CodingBlock,
} from '../types';
import {
  Brain,
  Cpu,
  Code2,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  Minimize2,
  Maximize2,
  Pin,
  PinOff,
  Keyboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ThinkingSidebar } from './ThinkingSidebar';
import { ProcessingSidebar } from './ProcessingSidebar';
import { CodingSidebar } from './CodingSidebar';

interface SidebarManagerProps {
  content: AssistantSidebarContent | undefined;
  onClose: () => void;
  onBlockChange?: (block: SidebarBlockType) => void;
  isStreaming?: boolean;
  compact?: boolean;
  position?: 'right' | 'bottom';
}

export function SidebarManager({
  content,
  onClose,
  onBlockChange,
  isStreaming = false,
  compact = false,
  position = 'right',
}: SidebarManagerProps) {
  const [activeTab, setActiveTab] = useState<SidebarBlockType | null>(
    content?.activeBlock || null
  );
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback((block: SidebarBlockType) => {
    setActiveTab(block);
    onBlockChange?.(block);
  }, [onBlockChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sidebarRef.current?.classList.contains('sidebar-container')) return;
      
      // Close with Escape
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (!isPinned) {
          onClose();
        }
      }
      
      // Tab navigation with number keys
      if (e.key === '1') handleTabChange('thinking');
      if (e.key === '2') handleTabChange('processing');
      if (e.key === '3') handleTabChange('coding');
      
      // Arrow keys for tab navigation
      const tabs: SidebarBlockType[] = ['thinking', 'processing', 'coding'];
      const currentIndex = tabs.indexOf(activeTab as SidebarBlockType);
      if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
        handleTabChange(tabs[currentIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handleTabChange(tabs[currentIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleTabChange, onClose, isPinned, showShortcuts]);

  const getTabIcon = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return <Brain className="w-4 h-4" />;
      case 'processing':
        return <Cpu className="w-4 h-4" />;
      case 'coding':
        return <Code2 className="w-4 h-4" />;
    }
  };

  const getTabLabel = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return 'Thinking';
      case 'processing':
        return 'Processing';
      case 'coding':
        return 'Code';
    }
  };

  const getTabColor = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return 'text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20';
      case 'processing':
        return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20';
      case 'coding':
        return 'text-purple-400 border-purple-400/30 bg-purple-400/10 hover:bg-purple-400/20';
    }
  };

  const getTabBgColor = (block: SidebarBlockType) => {
    switch (block) {
      case 'thinking':
        return 'bg-green-500/10';
      case 'processing':
        return 'bg-cyan-500/10';
      case 'coding':
        return 'bg-purple-500/10';
    }
  };

  // Get content stats for header
  const getContentStats = () => {
    const stats: string[] = [];
    if (content?.thinking) stats.push('🧠');
    if (content?.processing) stats.push('⚡');
    if (content?.coding) stats.push('💻');
    return stats.join(' ');
  };

  // Determine which tab to show based on content
  useEffect(() => {
    if (content?.activeBlock) {
      setActiveTab(content.activeBlock);
    } else if (content?.thinking) {
      setActiveTab('thinking');
    } else if (content?.processing) {
      setActiveTab('processing');
    } else if (content?.coding) {
      setActiveTab('coding');
    }
  }, [content]);

  if (!content || !activeTab) {
    return null;
  }

  const sidebarContent = (
    <div 
      ref={sidebarRef}
      className={`sidebar-container ${position} ${compact ? 'compact' : ''} ${isMinimized ? 'minimized' : ''} ${isPinned ? 'pinned' : ''}`}
    >
      {/* Header */}
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 rounded-xl bg-gradient-to-br from-slime-500/30 to-slime-600/20 border border-slime-500/30">
              <Sparkles className="w-4 h-4 text-slime-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-slime-400 rounded-full ${isStreaming ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-dark-100">Assistant</span>
            <span className="text-xs text-dark-500">
              {activeTab === 'thinking' && 'AI Reasoning'}
              {activeTab === 'processing' && 'Task Pipeline'}
              {activeTab === 'coding' && 'Code Output'}
            </span>
          </div>
          {isStreaming && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slime-400 ml-1" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Keyboard shortcuts help */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1.5 rounded-lg transition-colors ${showShortcuts ? 'text-slime-400 bg-slime-500/20' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800'}`}
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          {/* Pin button */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-yellow-400 bg-yellow-500/20' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800'}`}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-dark-500 hover:text-dark-300 rounded-lg hover:bg-dark-800 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-dark-500 hover:text-dark-300 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts popup */}
      {showShortcuts && (
        <div className="sidebar-shortcuts">
          <div className="text-xs font-medium text-dark-300 mb-2">Keyboard Shortcuts</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-dark-500">
              <span>Next tab</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">→</kbd>
            </div>
            <div className="flex justify-between text-dark-500">
              <span>Previous tab</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">←</kbd>
            </div>
            <div className="flex justify-between text-dark-500">
              <span>Thinking</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">1</kbd>
            </div>
            <div className="flex justify-between text-dark-500">
              <span>Processing</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">2</kbd>
            </div>
            <div className="flex justify-between text-dark-500">
              <span>Code</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">3</kbd>
            </div>
            <div className="flex justify-between text-dark-500">
              <span>Close</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">Esc</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sidebar-tabs">
        {(['thinking', 'processing', 'coding'] as SidebarBlockType[]).map(
          (block, index) => {
            const hasContent = content[block];
            const isActive = activeTab === block;
            
            return (
              <button
                key={block}
                onClick={() => handleTabChange(block)}
                disabled={!hasContent}
                className={`sidebar-tab ${
                  isActive ? getTabColor(block) : 'text-dark-400 hover:text-dark-200'
                } ${!hasContent ? 'opacity-40 cursor-not-allowed' : ''} ${
                  isActive ? getTabBgColor(block) : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-md ${isActive ? getTabBgColor(block) : 'bg-dark-800'}`}>
                    {getTabIcon(block)}
                  </span>
                  <span className="text-xs font-medium">{getTabLabel(block)}</span>
                  {content[block]?.isStreaming && (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  )}
                  {hasContent && !content[block]?.isStreaming && isActive && (
                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                  )}
                </div>
                {/* Tab index indicator */}
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-dark-600 opacity-0 group-hover:opacity-100">
                  {index + 1}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="sidebar-content">
          {activeTab === 'thinking' && content.thinking && (
            <ThinkingSidebar content={content.thinking} compact={compact} />
          )}
          {activeTab === 'processing' && content.processing && (
            <ProcessingSidebar content={content.processing} compact={compact} />
          )}
          {activeTab === 'coding' && content.coding && (
            <CodingSidebar content={content.coding} compact={compact} />
          )}
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className="sidebar-overlay" onClick={!isPinned ? onClose : undefined}>
      {sidebarContent}
    </div>;
  }

  return sidebarContent;
}

// Export individual sidebar components for direct use
export { ThinkingSidebar } from './ThinkingSidebar';
export { ProcessingSidebar } from './ProcessingSidebar';
export { CodingSidebar } from './CodingSidebar';