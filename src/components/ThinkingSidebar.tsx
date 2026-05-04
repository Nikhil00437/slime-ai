import React, { useState, useEffect } from 'react';
import { ThinkingBlock } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  Brain, 
  Copy, 
  Check, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Zap,
  MessageSquare
} from 'lucide-react';

interface ThinkingSidebarProps {
  content: ThinkingBlock;
  compact?: boolean;
}

interface ThoughtChunk {
  id: string;
  content: string;
  timestamp: number;
  isComplete: boolean;
}

export function ThinkingSidebar({ content, compact = false }: ThinkingSidebarProps) {
  const [chunks, setChunks] = useState<ThoughtChunk[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  // Process streaming content into chunks
  useEffect(() => {
    if (content.isStreaming) {
      // Split content into logical chunks based on punctuation
      const sentences = content.content.split(/(?<=[.!?])\s+/);
      const newChunks: ThoughtChunk[] = [];
      
      sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
          const chunkId = `chunk-${Date.now()}-${index}`;
          newChunks.push({
            id: chunkId,
            content: sentence.trim(),
            timestamp: Date.now() - (sentences.length - index - 1) * 1000,
            isComplete: index === sentences.length - 1,
          });
        }
      });
      
      setChunks(newChunks);
    } else {
      // For complete content, create single chunk
      setChunks([{
        id: 'complete',
        content: content.content,
        timestamp: content.timestamp,
        isComplete: true,
      }]);
    }
  }, [content, compact]);

  const handleCopy = async () => {
    const fullContent = chunks.map(c => c.content).join(' ');
    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const completedCount = chunks.filter(c => c.isComplete).length;
  const totalCount = chunks.length;

  if (compact) {
    return (
      <div className="thinking-sidebar-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/20">
              <Brain className="w-3.5 h-3.5 text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-400">Thinking</span>
            {content.isStreaming && (
              <Loader2 className="w-3 h-3 animate-spin text-green-400 ml-auto" />
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center gap-2 text-xs text-dark-500 mb-3">
          <span>{completedCount}/{totalCount} thoughts</span>
          <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {chunks.map((chunk, index) => (
            <div
              key={chunk.id}
              className="p-3 bg-gradient-to-br from-dark-800/60 to-dark-900/60 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                  chunk.isComplete 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-green-600/20 text-green-500 animate-pulse'
                }`}>
                  {chunk.isComplete ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-dark-400 mb-1 flex items-center gap-2">
                    <span className="font-medium">Thought {index + 1}</span>
                    {chunk.isComplete && (
                      <span className="text-green-500 text-[10px]">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-dark-300 leading-relaxed line-clamp-3 group-hover:line-clamp-none">
                    {chunk.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-700/80 hover:bg-dark-600/80 border border-dark-600/50 text-xs text-dark-200 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy All
              </>
            )}
          </button>
          <button
            onClick={toggleExpand}
            className="px-3 py-2 bg-dark-700/80 hover:bg-dark-600/80 border border-dark-600/50 text-xs text-dark-200 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="thinking-sidebar-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30">
            <Brain className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-green-400">Thinking</span>
            {content.isStreaming && (
              <span className="text-xs text-green-500/70 ml-2 animate-pulse">Processing...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-700/80 hover:bg-dark-600/80 border border-dark-600/50 text-dark-200 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={toggleExpand}
            className="p-1.5 text-dark-500 hover:text-dark-300 rounded-lg hover:bg-dark-800 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 text-xs text-dark-500 mb-4">
        <span className="font-medium">{completedCount}/{totalCount} thoughts</span>
        <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-dark-500 mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>AI reasoning process</span>
            {content.isStreaming && (
              <span className="text-green-400 ml-1">• Live</span>
            )}
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.id}
                className="p-4 bg-gradient-to-br from-dark-800/40 to-dark-900/40 rounded-xl border border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5 ${
                    chunk.isComplete 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-green-600/20 text-green-500 animate-pulse'
                  }`}>
                    {chunk.isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-dark-400 mb-2 flex items-center gap-2">
                      <span className="font-semibold">Thought {index + 1}</span>
                      {chunk.isComplete && (
                        <span className="text-green-500 text-[10px] px-1.5 py-0.5 bg-green-500/10 rounded-full">Complete</span>
                      )}
                    </div>
                    <div className="text-sm text-dark-300 leading-relaxed">
                      {chunk.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {chunks.length > 0 && (
            <div className="pt-4 border-t border-dark-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-dark-500">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Total thoughts: {chunks.length}</span>
              </div>
              <div className="text-xs text-green-500/70">
                {completedCount === totalCount && totalCount > 0 ? '✓ All complete' : 'In progress...'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}