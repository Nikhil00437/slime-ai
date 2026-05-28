import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ModelInfo, SidebarBlockType, AssistantSidebarContent, CodeBlock, ChatMessage, ToolCall } from '../types';
import { useAppContext } from '../store/AppContext';

import { MarkdownRenderer } from './MarkdownRenderer';
import { AttachmentInput, Attachment, getCapabilityFilters, filterModelsByCapabilities } from './AttachmentInput';
import { calculateMessageCost, formatCost, formatTokenCount } from '../api/pricing';
import { PersonalitySelector } from './PersonalitySelector';
import { AssistantSidebar } from './AssistantSidebar';
import { SidebarManager } from './SidebarManager';
import {
  Send,
  Square,
  Menu,
  ChevronDown,
  ChevronRight,
  Cpu,
  Bot,
  Globe,
  Sparkles,
  User,
  Image,
  FileText,
  Brain,
  AlertTriangle,
  Copy,
  Check,
  Search,
  RotateCcw,
  Edit3,
  Clock,
  MoreVertical,
  Bug,
  X,
  ArrowRight,
  Download,
  Copy as CopyIcon,
  GitBranch,
  Pin,
  Library,
  ChevronUp,
  Trash2,
  Pencil,
  Terminal,
  Loader2,
  Plus,
} from 'lucide-react';
import { LoopControlPanel } from './LoopControlPanel';

// Clickable Code Block Trigger - replaces code blocks in chat with a clickable card
function CodeBlockTrigger({ 
  blocks, 
  onClick 
}: { 
  blocks: CodeBlock[]; 
  onClick: () => void;
}) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  const getLanguageColor = (language: string) => {
    const lang = language.toLowerCase();
    switch (lang) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5';
      case 'python':
      case 'py':
        return 'text-blue-400 border-blue-400/30 bg-blue-400/5';
      case 'html':
      case 'htm':
        return 'text-orange-500 border-orange-500/30 bg-orange-500/5';
      case 'css':
      case 'scss':
        return 'text-pink-400 border-pink-400/30 bg-pink-400/5';
      case 'json':
        return 'text-green-400 border-green-400/30 bg-green-400/5';
      case 'bash':
      case 'sh':
      case 'shell':
        return 'text-green-500 border-green-500/30 bg-green-500/5';
      default:
        return 'text-purple-400 border-purple-400/30 bg-purple-400/5';
    }
  };

  const getLanguageIcon = (language: string) => {
    const lang = language.toLowerCase();
    switch (lang) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return '🟨';
      case 'python':
      case 'py':
        return '🐍';
      case 'html':
      case 'htm':
        return '🌐';
      case 'css':
      case 'scss':
        return '🎨';
      case 'json':
        return '📋';
      case 'markdown':
      case 'md':
        return '📝';
      case 'sql':
        return '🗄️';
      case 'bash':
      case 'sh':
      case 'shell':
        return '⚡';
      default:
        return '💻';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <button
        onClick={onClick}
        className="w-full p-4 bg-gradient-to-br from-dark-800/80 to-dark-900/80 rounded-xl border border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all text-left group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Terminal size={18} className="text-purple-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-purple-400">
                {blocks.length} Code Block{blocks.length > 1 ? 's' : ''}
              </span>
              <div className="text-xs text-dark-500 mt-0.5">
                Click to view in sidebar
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-500 group-hover:text-dark-300 transition-colors">
            <span className="hidden sm:inline">Open</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {blocks.slice(0, 4).map((block, idx) => (
            <div 
              key={block.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedIndex(expandedIndex === idx ? null : idx);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${getLanguageColor(block.language)}`}
            >
              <span className="text-sm">{getLanguageIcon(block.language)}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">
                  {block.filename || block.language}
                </span>
                {block.startLine && (
                  <span className="text-[10px] opacity-60">L{block.startLine}-{block.endLine}</span>
                )}
              </div>
            </div>
          ))}
          {blocks.length > 4 && (
            <div className="flex items-center px-3 py-2 rounded-lg border border-dark-600 bg-dark-800/50 text-dark-400">
              <span className="text-xs font-medium">+{blocks.length - 4} more</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded code preview on click */}
      {expandedIndex !== null && blocks[expandedIndex] && (
        <div className="p-3 bg-dark-900/80 rounded-lg border border-purple-500/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-400">
              {blocks[expandedIndex].filename || blocks[expandedIndex].language}
            </span>
            <button
              onClick={() => setExpandedIndex(null)}
              className="text-dark-500 hover:text-dark-300"
            >
              <X size={14} />
            </button>
          </div>
          <pre className="text-xs text-dark-300 font-mono overflow-x-auto max-h-32 p-2 bg-dark-950/50 rounded">
            {blocks[expandedIndex].code.slice(0, 500)}
            {blocks[expandedIndex].code.length > 500 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File, readerRef?: React.MutableRefObject<FileReader | null>): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (readerRef) {
      readerRef.current = reader;
    }
    reader.onload = () => {
      const result = reader.result as string;
      if (readerRef) {
        readerRef.current = null;
      }
      resolve(result.split(',')[1]);
    };
    reader.onerror = (e) => {
      if (readerRef) {
        readerRef.current = null;
      }
      reject(e);
    };
    reader.onabort = () => {
      if (readerRef) {
        readerRef.current = null;
      }
      reject(new Error('File read aborted'));
    };
    reader.readAsDataURL(file);
  });
}

interface ToolDisplay {
  action: string;
  category: string;
  icon: string;
}

function findToolCall(toolCallId: string, allMessages: ChatMessage[]) {
  for (const msg of allMessages) {
    if (msg.toolCalls) {
      const found = msg.toolCalls.find(tc => tc.id === toolCallId);
      if (found) return found;
    }
  }
  return null;
}

function getToolCallDisplay(tc: ToolCall): ToolDisplay {
  const name = tc.function.name;
  let args: any = {};
  try {
    args = JSON.parse(tc.function.arguments || '{}');
  } catch {
    // Ignore parse error
  }

  if (name === 'bash' || name === 'pw_run') {
    const cmd = args.CommandLine || '';
    return {
      action: cmd ? `Run command '${cmd.slice(0, 45)}${cmd.length > 45 ? '...' : ''}'` : 'Run command',
      category: 'Script',
      icon: 'terminal'
    };
  }

  if (name === 'read_file' || name === 'view_file') {
    const path = args.AbsolutePath || args.TargetFile || '';
    const file = path.split(/[/\\]/).pop() || 'file';
    return {
      action: `Read the rest of ${file}`,
      category: 'File System',
      icon: 'file'
    };
  }

  if (name === 'write_file' || name === 'edit_file') {
    const path = args.AbsolutePath || args.TargetFile || '';
    const file = path.split(/[/\\]/).pop() || 'file';
    return {
      action: `Write the full enhanced ${file}`,
      category: 'File System',
      icon: 'write'
    };
  }

  if (name === 'web_search') {
    const query = args.query || '';
    return {
      action: query ? `Search for '${query.slice(0, 45)}${query.length > 45 ? '...' : ''}'` : 'Web search',
      category: 'Web',
      icon: 'search'
    };
  }

  if (name === 'web_fetch') {
    const url = args.Url || '';
    return {
      action: url ? `Fetch ${url.slice(0, 45)}${url.length > 45 ? '...' : ''}` : 'Fetch web page',
      category: 'Web',
      icon: 'globe'
    };
  }

  return {
    action: `Execute ${name}`,
    category: 'Tool',
    icon: 'tool'
  };
}

function summarizeToolMessages(toolMessages: ChatMessage[], allMessages: ChatMessage[]): string {
  if (toolMessages.length === 1) {
    const tc = findToolCall(toolMessages[0].toolCallId || '', allMessages);
    if (tc) {
      return getToolCallDisplay(tc).action;
    }
    return 'Executed tool';
  }

  let commandCount = 0;
  let viewCount = 0;
  let writeCount = 0;
  let searchCount = 0;
  let otherCount = 0;

  for (const msg of toolMessages) {
    const tc = findToolCall(msg.toolCallId || '', allMessages);
    if (tc) {
      const name = tc.function.name;
      if (name === 'bash' || name === 'pw_run') {
        commandCount++;
      } else if (name === 'read_file' || name === 'view_file') {
        viewCount++;
      } else if (name === 'write_file' || name === 'edit_file') {
        writeCount++;
      } else if (name === 'web_search' || name === 'web_fetch') {
        searchCount++;
      } else {
        otherCount++;
      }
    } else {
      otherCount++;
    }
  }

  const parts: string[] = [];
  if (commandCount > 0) {
    parts.push(`Ran ${commandCount} ${commandCount === 1 ? 'command' : 'commands'}`);
  }
  if (viewCount > 0) {
    parts.push(`viewed ${viewCount === 1 ? 'a file' : `${viewCount} files`}`);
  }
  if (writeCount > 0) {
    parts.push(`wrote ${writeCount === 1 ? 'a file' : `${writeCount} files`}`);
  }
  if (searchCount > 0) {
    parts.push(`searched the web ${searchCount} ${searchCount === 1 ? 'time' : 'times'}`);
  }
  if (otherCount > 0) {
    parts.push(`ran ${otherCount} other ${otherCount === 1 ? 'tool' : 'tools'}`);
  }

  if (parts.length === 0) return 'Executed tools';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

type ListItem = 
  | { type: 'message'; message: ChatMessage }
  | { type: 'grouped-tools'; id: string; toolMessages: ChatMessage[]; timestamp: number };

function groupMessages(rawMessages: ChatMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let currentGroup: ChatMessage[] = [];

  for (const msg of rawMessages) {
    if (msg.role === 'tool') {
      currentGroup.push(msg);
    } else {
      if (currentGroup.length > 0) {
        items.push({
          type: 'grouped-tools',
          id: `grouped-tools-${currentGroup[0].id}`,
          toolMessages: [...currentGroup],
          timestamp: currentGroup[0].timestamp,
        });
        currentGroup = [];
      }
      items.push({ type: 'message', message: msg });
    }
  }

  if (currentGroup.length > 0) {
    items.push({
      type: 'grouped-tools',
      id: `grouped-tools-${currentGroup[0].id}`,
      toolMessages: [...currentGroup],
      timestamp: currentGroup[0].timestamp,
    });
  }

  return items;
}

const SingleToolRun: React.FC<{ toolMessage: ChatMessage; allMessages: ChatMessage[] }> = ({ toolMessage, allMessages }) => {
  const [showOutput, setShowOutput] = useState(false);
  const tc = React.useMemo(() => findToolCall(toolMessage.toolCallId || '', allMessages), [toolMessage.toolCallId, allMessages]);
  
  const display = React.useMemo(() => {
    if (tc) return getToolCallDisplay(tc);
    return {
      action: `Execute tool ${toolMessage.toolCallId?.slice(0, 8) || ''}`,
      category: 'Tool',
      icon: 'tool'
    };
  }, [tc, toolMessage.toolCallId]);

  const isSuccess = !toolMessage.error;

  return (
    <div className="flex flex-col pl-4 pr-2 py-3 border-l-2 border-dark-700/60 my-2 ml-3 animate-fade-in text-left">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-dark-400 font-mono text-sm select-none">&gt;_</span>
        <span className="text-dark-100 font-medium text-sm">{display.action}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-2 pl-6">
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-dark-800 text-dark-400 border border-dark-700/50 uppercase tracking-wider">
          {display.category}
        </span>
      </div>
      
      <div className="flex items-center gap-2 pl-6">
        {isSuccess ? (
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Error</span>
          </div>
        )}

        <button
          onClick={() => setShowOutput(!showOutput)}
          className="text-[10px] text-dark-500 hover:text-dark-300 underline ml-2 cursor-pointer focus:outline-none"
        >
          {showOutput ? 'Hide Output' : 'View Output'}
        </button>
      </div>

      {showOutput && (
        <div className="mt-3 pl-6 w-full max-w-full">
          <div className="text-[10px] text-dark-500 font-medium mb-1 uppercase tracking-wider">Output:</div>
          <pre className="text-xs bg-dark-950/80 rounded-lg p-3 overflow-x-auto text-dark-300 font-mono border border-dark-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
            {toolMessage.content}
          </pre>
        </div>
      )}
    </div>
  );
};

const AgenticWorkflowBlock: React.FC<{ toolMessages: ChatMessage[]; allMessages: ChatMessage[] }> = ({ toolMessages, allMessages }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = React.useMemo(() => summarizeToolMessages(toolMessages, allMessages), [toolMessages, allMessages]);

  return (
    <div className="w-full my-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 px-0 text-xs font-semibold text-dark-400 hover:text-dark-200 bg-transparent transition-all duration-200 text-left focus:outline-none cursor-pointer"
      >
        <span className="flex-1 truncate">{summary}</span>
        <svg
          className={`w-3.5 h-3.5 ml-2 transition-transform duration-200 shrink-0 text-dark-500 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-1 bg-transparent border-none py-1">
          {toolMessages.map((msg) => (
            <SingleToolRun key={msg.id} toolMessage={msg} allMessages={allMessages} />
          ))}
        </div>
      )}
    </div>
  );
};

const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();
  if (name.includes('search')) return <Search size={12} className="text-cyan-400" />;
  if (name.includes('scraper')) return <Bug size={12} className="text-violet-400" />;
  if (name.includes('code') || name.includes('terminal')) return <Terminal size={12} className="text-purple-400" />;
  return <Cpu size={12} className="text-slime-400" />;
};

const CopyLogButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 bg-dark-900/80 hover:bg-dark-800 text-dark-400 hover:text-white rounded border border-dark-750/60 transition-colors shadow-sm z-20 focus:outline-none cursor-pointer flex items-center justify-center"
      title="Copy log"
    >
      {copied ? <Check size={11} className="text-slime-400" /> : <Copy size={11} />}
    </button>
  );
};

interface ChatPanelProps {
  onOpenScraper?: () => void;
  rightSidebarOpen?: boolean;
  onRightSidebarOpen?: (open: boolean) => void;
  onRightSidebarContentChange?: (content: AssistantSidebarContent | undefined) => void;
  onRightSidebarStreamingChange?: (streaming: boolean) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onOpenScraper,
  rightSidebarOpen: externalRightSidebarOpen,
  onRightSidebarOpen: setExternalRightSidebarOpen,
  onRightSidebarContentChange: setExternalRightSidebarContent,
  onRightSidebarStreamingChange: setExternalRightSidebarStreaming,
}) => {
  const {
    activeConversation,
    activeModel,
    isLoading,
    sendMessage,
    stopStreaming,
    setIsSidebarOpen,
    providers,
    setActiveModel,
    setSettings,
    isExecutingTool,
    activeTools,
    createConversation,
    settings,
    regenerateLastResponse,
    regenerateResponse,
    editLastMessage,
    retryLastMessage,
    copyMessageToClipboard,
    inputHistory,
    inputHistoryIndex,
    addToInputHistory,
    activeConversationId,
    deleteConversation,
    clearConversationMessages,
    togglePinConversation,
    toggleMemoryEnabled,
    duplicateConversation,
    renameConversation,
    branchConversation,
    exportConversation,
    loopState,
    loopPaused,
    startLoop,
    pauseLoop,
    resumeLoop,
    cancelLoop,
    pendingWebSearch,
    setPendingWebSearch,
    setMessageSidebarActiveBlock,
  } = useAppContext();

  // Use active conversation messages directly
  const messages = activeConversation?.messages || [];
  const isStreaming = isLoading;

  // Group consecutive tool messages together
  const listItems = useMemo(() => {
    return groupMessages(messages);
  }, [messages]);

  // Scroll container ref for messages
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [_isAtBottom, _setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [_showMessageMenu, _setShowMessageMenu] = useState<string | null>(null);
  const [_copiedMessageId, _setCopiedMessageId] = useState<string | null>(null);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [showTemperature, setShowTemperature] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showLoopPanel, setShowLoopPanel] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Assistant sidebar state - track which messages have open sidebars
  const [openSidebarMessageId, setOpenSidebarMessageId] = useState<string | null>(null);

  // Helper to extract code blocks from message content
  const extractCodeBlocksFromContent = (content: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];

      // Skip mermaid blocks - they go to sidebar differently
      if (language.toLowerCase() === 'mermaid') {
        continue;
      }

      blocks.push({
        id: `code-${index}`,
        language,
        code,
      });
      index++;
    }

    return blocks;
  };

  // Helper to open right sidebar with content
  const openRightSidebar = (messageId: string, content: AssistantSidebarContent, blockType?: SidebarBlockType, messageContent?: string) => {
    // If no coding blocks but we have message content, extract them
    let finalContent = content;
    if ((!content.coding?.blocks?.length) && messageContent) {
      const extractedBlocks = extractCodeBlocksFromContent(messageContent);
      if (extractedBlocks.length > 0) {
        finalContent = {
          ...content,
          activeBlock: 'coding',
          coding: {
            blocks: extractedBlocks,
            isStreaming: false,
            currentBlockId: '',
            timestamp: Date.now(),
          },
        };
      }
    }

    // Set active block to the specified type, or default to coding > processing > thinking
    const activeBlock = blockType || (finalContent.coding ? 'coding' : finalContent.processing ? 'processing' : finalContent.thinking ? 'thinking' : null);

    const contentWithActiveBlock = {
      ...finalContent,
      activeBlock,
    };

    if (setExternalRightSidebarOpen && setExternalRightSidebarContent) {
      setExternalRightSidebarOpen(true);
      setExternalRightSidebarContent(contentWithActiveBlock);
      setExternalRightSidebarStreaming?.(finalContent.thinking?.isStreaming || finalContent.processing?.isStreaming || finalContent.coding?.isStreaming || false);
    }
    setOpenSidebarMessageId(messageId);
  };

  // Helper to close right sidebar
  const closeRightSidebar = () => {
    if (setExternalRightSidebarOpen) {
      setExternalRightSidebarOpen(false);
      setExternalRightSidebarContent?.(undefined);
    }
    setOpenSidebarMessageId(null);
  };

  // Filter out code blocks from message content when they exist in sidebar
  const getFilteredContent = (content: string, assistantSidebar?: AssistantSidebarContent): string => {
    let filtered = content;

    // Check for mermaid blocks in content and remove them (replace with a notice)
    const mermaidBlockRegex = /```mermaid\n[\s\S]*?```/gi;
    const hasMermaid = mermaidBlockRegex.test(filtered);
    if (hasMermaid) {
      filtered = filtered.replace(mermaidBlockRegex, '\n\n📊 Mermaid diagram available in sidebar\n');
    }

    // Code blocks are now shown as clickable blocks in the chat, so we don't need to add a notice here
    // The CodeBlockTrigger component handles displaying code blocks as clickable cards

    return filtered;
  };

  // Check if using external sidebar
  const isUsingExternalSidebar = !!setExternalRightSidebarOpen;



  // Personality state
  const [activePersonalityId, setActivePersonalityId] = useState<string | null>(null);

  // Input history navigation state within component (synced with context)
  const [inputHistoryLocalIndex, setInputHistoryLocalIndex] = useState<number>(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileReaderRef = useRef<FileReader | null>(null);

  // Streaming cleanup on unmount (Day 5)
  useEffect(() => {
    return () => {
      // Cancel any in-flight file reader
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
        fileReaderRef.current = null;
      }
      // Stop any active streaming
      stopStreaming();
    };
  }, [stopStreaming]);

  // Load draft on mount and conversation change
  useEffect(() => {
    if (!activeConversationId) return;
    const savedDraft = localStorage.getItem(`mm_draft_${activeConversationId}`);
    if (savedDraft) {
      setInput(savedDraft);
    }
  }, [activeConversationId]);

  // Save draft on input change (debounced)
  useEffect(() => {
    if (!activeConversationId || !input) return;
    
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    
    draftTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`mm_draft_${activeConversationId}`, input);
    }, 500);
    
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [input, activeConversationId]);

  // Auto-scroll detection - track if user is at bottom
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const threshold = 100;
      const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;
      _setIsAtBottom(atBottom);
      // Only show new messages button if not at bottom and there are new messages
      if (!atBottom && !isLoading) {
        setShowNewMessages(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoading]);

  // Auto-scroll to bottom on new messages when already at bottom
  useEffect(() => {
    if (_isAtBottom && activeConversation?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [activeConversation?.messages.length, _isAtBottom]);

  // Reset history navigation on new message send



  const handleSubmit = async () => {
    const trimmed = input.trim();
    // Clear guard with proper operator precedence
    if ((!trimmed && attachments.length === 0) || isLoading || !activeModel) return;

    // Clear draft on send
    if (activeConversationId) {
      localStorage.removeItem(`mm_draft_${activeConversationId}`);
    }

    // Auto-create conversation if none exists and capture the ID
    let convId = activeConversationId;
    if (!activeConversation) {
      convId = createConversation(activeModel.id, activeModel.provider);
    }

    // Add to input history
    addToInputHistory(trimmed);
    
    // Reset input field and history navigation
    setInput('');
    setInputHistoryLocalIndex(-1);
    setShowAttachmentMenu(false);
    const currentAttachments = [...attachments];
    setAttachments([]);
    await sendMessage(trimmed, currentAttachments, activePersonalityId || undefined, convId || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow up - cycle through input history
    if (e.key === 'ArrowUp' && inputHistory.length > 0 && !showModelDropdown) {
      e.preventDefault();
      const newIndex = inputHistoryLocalIndex < inputHistory.length - 1 ? inputHistoryLocalIndex + 1 : inputHistoryLocalIndex;
      setInputHistoryLocalIndex(newIndex);
      setInput(inputHistory[newIndex] || '');
      return;
    }
    
    // Arrow down - cycle through input history (or clear if at start of history)
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (inputHistoryLocalIndex > 0) {
        // Go back one in history
        const newIndex = inputHistoryLocalIndex - 1;
        setInputHistoryLocalIndex(newIndex);
        setInput(inputHistory[newIndex] || '');
      } else if (inputHistoryLocalIndex === 0) {
        // At start of history - clear input
        setInputHistoryLocalIndex(-1);
        setInput('');
      }
      return;
    }
    
    // Reset history index when user starts typing (not arrow keys)
    if (inputHistoryLocalIndex !== -1) {
      setInputHistoryLocalIndex(-1);
    }
    
    // Ctrl+Enter - send (multiline)
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    
    // Escape - close dropdowns and reset history navigation
    if (e.key === 'Escape') {
      setShowModelDropdown(false);
      setShowSearch(false);
      setShowQuickPrompts(false);
      setShowAttachmentMenu(false);
      setEditingMessageId(null);
      _setShowMessageMenu(null);
      setInputHistoryLocalIndex(-1);
      return;
    }
    
    // Regular Enter - newline in textarea, submit if no shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  const currentProvider = providers.find((p) => p.id === activeModel?.provider);

  const providerIcons: Record<string, React.ReactNode> = {
    ollama: <Cpu size={16} />,
    lmstudio: <Bot size={16} />,
    openrouter: <Globe size={16} />,
    openai: <Brain size={16} />,
    anthropic: <Brain size={16} />,
    gemini: <Brain size={16} />,
    grok: <Brain size={16} />,
  };

  const providerColors: Record<string, string> = {
    ollama: 'text-orange-400',
    lmstudio: 'text-purple-400',
    openrouter: 'text-cyan-400',
    openai: 'text-slime-400',
    anthropic: 'text-orange-400',
    gemini: 'text-rose-400',
    grok: 'text-dark-100',
  };

  const allModels = providers.flatMap((p) => p.models);
  
  // Arena-style: filter models by capability when attachments are present
  const capFilters = getCapabilityFilters(attachments);
  const hasCapFilter = Object.keys(capFilters).length > 0;
  const capableModels = hasCapFilter ? filterModelsByCapabilities(allModels, capFilters) : allModels;
  const capableModelIds = new Set(capableModels.map(m => m.id));

return (
    <div className="flex-1 flex flex-col bg-dark-900 min-w-0">
      {/* Chat Header - Sticky at top */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-dark-800/65 backdrop-blur-xl border-b border-dark-700/30">
        <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded-lg transition-colors focus-ring-a11y"
            title="Toggle sidebar"
          >
          <Menu size={20} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800/50 hover:bg-dark-700/50 rounded-lg transition-colors w-full min-w-0 hover-lift focus-ring-a11y border border-dark-700/30 hover:border-slime-500/20"
          >
            {currentProvider && (
              <span className={providerColors[currentProvider.id]}>
                {providerIcons[currentProvider.id]}
              </span>
            )}
            <span className="text-sm text-dark-100 font-medium truncate">
              {activeModel?.name || 'Select a model...'}
            </span>
            {/* Show capability badges for active model */}
            {activeModel && (
              <div className="flex items-center gap-1 shrink-0">
                {activeModel.capabilities?.image && (
                  <span className="text-[10px] bg-slime-500/20 text-slime-300 px-1 py-0.5 rounded" title="Supports images">🖼️</span>
                )}
                {activeModel.capabilities?.audio && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded" title="Supports audio">🔊</span>
                )}
                {activeModel.capabilities?.video && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded" title="Supports video">🎬</span>
                )}
                {activeModel.capabilities?.fileUpload && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded" title="Supports files">📁</span>
                )}
              </div>
            )}
            {(activeModel?.provider === 'ollama' || activeModel?.provider === 'lmstudio') && (
              <span className="text-yellow-500 shrink-0" aria-label="Local models may not support tools">
                <AlertTriangle size={14} />
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-dark-500 shrink-0 transition-transform ${
                showModelDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown */}
          {showModelDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowModelDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-xl shadow-2xl z-50 dropdown-animate">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-dark-700/30">
                  <input
                    type="text"
                    placeholder="Filter models..."
                    className="w-full px-3 py-1.5 bg-dark-700/50 border border-dark-600/30 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-slime-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Favorites Section */}
                {settings.favoriteModels.length > 0 && (
                  <div className="border-b border-dark-700/30">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <span className="text-yellow-400">★</span>
                      <span className="text-xs font-semibold text-yellow-400">Favorites</span>
                    </div>
                    {settings.favoriteModels.slice(0, 3).map(favModelId => {
                      const model = allModels.find(m => m.id === favModelId);
                      if (!model) return null;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            setActiveModel(model);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors truncate flex items-center gap-2 ${
                            activeModel?.id === model.id
                              ? 'bg-slime-500/15 text-slime-400 border border-slime-500/20'
                              : 'text-dark-300 hover:bg-dark-700/40'
                          }`}
                        >
                          <span className="text-yellow-400 text-xs">★</span>
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {/* Recent Models Section */}
                {settings.recentModels.length > 0 && (
                  <div className="border-b border-dark-700/30">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Clock size={12} className="text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-400">Recent</span>
                    </div>
                    {settings.recentModels.slice(0, 5).map(recentModelId => {
                      const model = allModels.find(m => m.id === recentModelId);
                      if (!model) return null;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            setActiveModel(model);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors truncate flex items-center gap-2 ${
                            activeModel?.id === model.id
                              ? 'bg-slime-500/15 text-slime-400 border border-slime-500/20'
                              : 'text-dark-300 hover:bg-dark-700/40'
                          }`}
                        >
                          <Clock size={10} className="text-dark-500" />
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {hasCapFilter && (
                  <div className="px-3 py-2 border-b border-dark-700/30 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-cyan-400 font-medium">
                      Filtering by:
                    </span>
                    {capFilters.image && <span className="text-xs bg-slime-500/20 text-slime-300 px-1.5 py-0.5 rounded">🖼️ Image</span>}
                    {capFilters.audio && <span className="text-xs bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">🔊 Audio</span>}
                    {capFilters.video && <span className="text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">🎬 Video</span>}
                    {capFilters.fileUpload && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">📁 Files</span>}
                  </div>
                )}
                {providers.map((provider) => {
                  let providerModels = hasCapFilter
                    ? provider.models.filter(m => capableModelIds.has(m.id))
                    : provider.models;
                  if (providerModels.length === 0) return null;
                  return (
                    <div key={provider.id} className="py-1">
                      <div className="px-3 py-2 flex items-center gap-2">
                        <span className={providerColors[provider.id]}>
                          {providerIcons[provider.id]}
                        </span>
                        <span className="text-xs font-semibold text-dark-400">
                          {provider.name}
                        </span>
                        <span className="text-xs text-dark-600">({providerModels.length})</span>
                      </div>
                      {providerModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setActiveModel(model);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors truncate flex items-center gap-2 ${
                            activeModel?.id === model.id
                              ? 'bg-slime-500/15 text-slime-400 border border-slime-500/20'
                              : 'text-dark-300 hover:bg-dark-700/40'
                          }`}
                        >
                          {model.name}
                          {/* Show capability badges */}
                          <div className="flex items-center gap-0.5 ml-auto shrink-0">
                            {model.capabilities?.image && <span className="text-[8px]" title="Vision">🖼️</span>}
                            {model.capabilities?.audio && <span className="text-[8px]" title="Audio">🔊</span>}
                            {model.capabilities?.fileUpload && <span className="text-[8px]" title="Files">📁</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {(hasCapFilter ? capableModels : allModels).length === 0 && (
                  <div className="p-4 text-center text-sm text-dark-500">
                    {hasCapFilter
                      ? 'No models support the attached input type.'
                      : 'No models detected. Check settings.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Status indicator */}
        {currentProvider && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                currentProvider.status === 'connected'
                  ? 'bg-slime-500'
                  : currentProvider.status === 'checking'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-dark-500 capitalize hidden sm:inline">
              {currentProvider.status}
            </span>
          </div>
        )}

        {/* Temperature Slider */}
        <div className="relative">
          <button
            onClick={() => setShowTemperature(!showTemperature)}
            className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors"
            title={`Temperature: ${settings.temperature}`}
          >
            <span className="text-xs font-mono">{settings.temperature.toFixed(1)}</span>
          </button>
          {showTemperature && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemperature(false)} />
              <div className="absolute top-full right-0 mt-1 p-3 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl z-50 min-w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400">Temperature</span>
                  <span className="text-xs text-dark-100 font-mono">{settings.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-slime-500"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-dark-600">Precise</span>
                  <span className="text-[10px] text-dark-600">Balanced</span>
                  <span className="text-[10px] text-dark-600">Creative</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* System Prompt Preview */}
        <div className="relative">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors"
            title="View custom system prompt"
          >
            <Sparkles size={14} />
          </button>
          {showSystemPrompt && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSystemPrompt(false)} />
              <div className="absolute top-full right-0 mt-1.5 p-4 bg-dark-800/98 backdrop-blur-xl border border-dark-700/40 rounded-xl shadow-2xl z-50 w-80 dropdown-animate">
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-dark-700/30">
                  <Sparkles size={13} className="text-purple-400 fill-purple-400/20" />
                  <span className="text-xs font-bold text-dark-200 uppercase tracking-wider">Custom System Prompt</span>
                </div>
                <div className="text-xs text-dark-400 whitespace-pre-wrap max-h-48 overflow-y-auto sidebar-scroll pr-1 leading-relaxed">
                  {settings.systemPrompt || (
                    <span className="text-dark-600 italic">No custom instructions set.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Unified Chat Controls */}
        {activeConversation && activeConversation.messages.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto border-l border-dark-700/30 pl-3">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1.5 rounded transition-colors ${showSearch ? 'text-slime-400 bg-slime-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
                title="Search in conversation"
              >
                <Search size={14} />
              </button>
              {showSearch && (
                <div className="absolute top-full right-0 mt-1 z-50">
                  <div className="flex items-center gap-1 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg px-2 py-1 shadow-lg">
                    <Search size={12} className="text-dark-500" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search messages..."
                      className="bg-transparent text-dark-100 text-xs placeholder-dark-600 focus:outline-none w-40"
                      autoFocus
                    />
                    {searchInput && (
                      <button onClick={() => setSearchInput('')} className="text-dark-500 hover:text-dark-200">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            {settings.quickPrompts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                  className={`p-1.5 rounded transition-colors ${showQuickPrompts ? 'text-slime-400 bg-slime-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
                  title="Quick prompts"
                >
                  <Library size={14} />
                </button>
                {showQuickPrompts && (
                  <div className="absolute top-full right-0 mt-1 z-50 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl min-w-48">
                    <div className="p-2">
                      <div className="text-xs text-dark-500 px-2 py-1 border-b border-dark-700/30 mb-1">Quick Prompts</div>
                      {settings.quickPrompts.map(prompt => (
                        <button
                          key={prompt.id}
                          onClick={() => {
                            setInput(prompt.content);
                            setShowQuickPrompts(false);
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40 rounded transition-colors"
                        >
                          {prompt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timestamp toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, showTimestamps: !s.showTimestamps }))}
              className={`p-1.5 rounded transition-colors ${settings.showTimestamps ? 'text-cyan-400 bg-cyan-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
              title={settings.showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            >
              <Clock size={14} />
            </button>

            {/* Token cost toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, showCostEstimate: !s.showCostEstimate }))}
              className={`p-1.5 rounded transition-colors ${settings.showCostEstimate ? 'text-slime-400 bg-slime-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
              title={settings.showCostEstimate ? 'Hide cost/token info' : 'Show cost and token count'}
            >
              <span className="text-xs font-mono font-bold">$</span>
            </button>

            <button
              onClick={() => {
                if (activeConversation) {
                  toggleMemoryEnabled(activeConversation.id);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                activeConversation?.memoryEnabled 
                  ? 'text-purple-400 bg-purple-400/10' 
                  : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'
              }`}
              title={activeConversation?.memoryEnabled ? 'Memory enabled for this conversation' : 'Enable memory for this conversation'}
            >
              <Brain size={14} />
            </button>

            {/* Conversation menu dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowConvMenu(!showConvMenu)}
                className={`p-1.5 rounded transition-colors ${showConvMenu ? 'text-dark-100 bg-dark-700/40' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
              >
                <MoreVertical size={14} />
              </button>
              {showConvMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowConvMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl min-w-40 py-1">
                    <button
                      onClick={() => {
                        duplicateConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40"
                    >
                      <CopyIcon size={14} /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setEditingTitle(true);
                        setTitleInput(activeConversation.title);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40"
                    >
                      <Pencil size={14} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        togglePinConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40"
                    >
                      <Pin size={14} /> {activeConversation.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => {
                        exportConversation(activeConversation.id, 'markdown');
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40"
                    >
                      <Download size={14} /> Export Markdown
                    </button>
                    <button
                      onClick={() => {
                        exportConversation(activeConversation.id, 'pdf');
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40"
                    >
                      <Download size={14} /> Export PDF
                    </button>
                    <button
                      onClick={() => {
                        clearConversationMessages(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 border-t border-dark-700/30"
                    >
                      <Trash2 size={14} /> Clear Messages
                    </button>
                    <button
                      onClick={() => {
                        deleteConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-b-lg border-t border-dark-700/30"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 relative scroll-smooth">
        {/* Active Top Status */}
        {isExecutingTool && activeTools.length > 0 && (
          <div className="sticky top-4 z-10 p-2 inset-x-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-900/60 border border-slime-500/20 backdrop-blur-md rounded-full text-xs text-cyan-300 shadow-xl pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-slime-400 animate-pulse" />
              <span>Agent Step {activeConversation?.agentSteps?.length || 1}: {activeTools.join(', ')}...</span>
            </div>
          </div>
        )}
        {!activeConversation || activeConversation.messages.length === 0 ? (
          /* Empty State - Qwen-inspired centered greeting */
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="mb-6 p-3 rounded-2xl">
              <Sparkles size={36} className="text-slime-400/80" />
            </div>
            <h1 className="text-3xl font-semibold text-dark-100 mb-2 tracking-tight">
              How can I help you today?
            </h1>
            <p className="text-dark-400 max-w-md mb-10 text-sm">
              Select a model below or start typing to chat
            </p>

            {allModels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {(() => {
                  const recentModelIds = settings.recentModels.slice(0, 4);
                  const recentModels = recentModelIds
                    .map(id => allModels.find(m => m.id === id))
                    .filter((m): m is ModelInfo => m !== undefined);
                  
                  const usedIds = new Set(recentModels.map(m => m.id));
                  const otherModels = allModels.filter(m => !usedIds.has(m.id));
                  const suggestedModels = [...recentModels, ...otherModels].slice(0, 4);
                  
                  return suggestedModels.map((model) => {
                    const prov = providers.find((p) => p.id === model.provider);
                    const isRecent = settings.recentModels.includes(model.id);
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setActiveModel(model);
                        }}
                        className="flex items-center gap-3 p-3 bg-dark-800/30 hover:bg-dark-700/40 border border-dark-700/30 hover:border-slime-500/25 rounded-xl text-left transition-all glass-hover"
                      >
                        <span className={providerColors[model.provider]}>
                          {providerIcons[model.provider]}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm text-dark-100 truncate">
                            {model.name.length > 28
                              ? model.name.slice(0, 28) + '...'
                              : model.name}
                          </div>
                          <div className="text-xs text-dark-500 flex items-center gap-1">
                            {prov?.name}
                            {isRecent && (
                              <span className="text-cyan-400">• Recent</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {allModels.length === 0 && (
              <div className="text-sm text-dark-500">
                <p>Make sure Ollama or LM Studio is running locally, or configure OpenRouter in settings.</p>
              </div>
            )}
          </div>
        ) : (
          /* Messages */
          <div className="max-w-3xl mx-auto py-4" ref={messagesContainerRef}>
            {/* Web Search Prompt - shows when pending web search is detected */}
            {pendingWebSearch && (
              <div className="px-4 py-3 mb-2 animate-slide-in-down">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-2 border-violet-500/50 shadow-lg shadow-violet-900/20">
                  <div className="p-2.5 rounded-lg bg-violet-600/40">
                    <Bug size={24} className="text-violet-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="text-violet-300">🔍 Web Search:</span> 
                      <span className="text-white">"{pendingWebSearch}"</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Open Scraper" to select pages and save to vault
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onOpenScraper?.();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                               bg-violet-600 hover:bg-violet-500 text-white transition-all hover:scale-105 shadow-lg shrink-0"
                  >
                    <Bug size={16} />
                    Open Scraper
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setPendingWebSearch(null)}
                    className="p-2.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                    title="Dismiss"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {listItems.map((listItem, index) => {
                    if (listItem.type === 'grouped-tools') {
                      return (
                        <div
                          key={listItem.id}
                          className="flex gap-4 px-4 py-1.5 group relative animate-msg-appear rounded-2xl"
                        >
                          <div className="shrink-0 w-8" />
                          <div className="flex-1 min-w-0">
                            <AgenticWorkflowBlock
                              toolMessages={listItem.toolMessages}
                              allMessages={messages}
                            />
                          </div>
                        </div>
                      );
                    }

                    const message = listItem.message;
                    const isHighlighted = searchInput && message.content.toLowerCase().includes(searchInput.toLowerCase());
                    const prevItem = index > 0 ? listItems[index - 1] : null;
                    const prevMessage = prevItem?.type === 'message' ? prevItem.message : null;
                    const isConsecutive = prevMessage && prevMessage.role === message.role;
                    
                    let isSameTurn = false;
                    if (message.role === 'assistant') {
                      for (let i = index - 1; i >= 0; i--) {
                        const prevItem = listItems[i];
                        if (prevItem.type === 'message') {
                          if (prevItem.message.role === 'user') {
                            break;
                          }
                          if (prevItem.message.role === 'assistant') {
                            isSameTurn = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    const lastUserMsgId = [...messages].reverse().find(m => m.role === 'user')?.id;
                    const isLastUserMessage = message.role === 'user' && message.id === lastUserMsgId;
                    const isUser = message.role === 'user';
                    const isTool = message.role === 'tool';
                    
                    const displayContent = !isUser && message.assistantSidebar
                      ? getFilteredContent(message.content, message.assistantSidebar)
                      : message.content;
                      
                    const hasContent = displayContent.trim() !== '';
                    const hasAttachments = isUser && message.attachments && message.attachments.length > 0;
                    const hasCodeBlocks = !isUser && message.assistantSidebar?.coding?.blocks && message.assistantSidebar.coding.blocks.length > 0;
                    const isEditing = editingMessageId === message.id;

                    const shouldRenderBubble = hasContent || hasAttachments || hasCodeBlocks || isEditing;

                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${
                          isUser ? 'justify-end' : 'justify-start'
                        } px-4 py-2 group relative animate-msg-appear ${
                          isConsecutive ? 'py-0.5' : 'py-3'
                        }`}
                      >
                        {/* Wrapper for side alignment and avatar spacing */}
                        <div className={`flex gap-3 items-start max-w-[85%] sm:max-w-[80%] ${
                          isUser ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          
                          {/* Avatar - Only shown for assistant and tool, and only if not consecutive/same-turn */}
                          {!isUser && (
                            <div className="shrink-0 mt-0.5">
                              {(isConsecutive || isSameTurn) ? (
                                <div className="w-8" />
                              ) : isTool ? (
                                <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700/50 flex items-center justify-center">
                                  <Bot size={16} className="text-dark-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slime-400 to-teal-500 flex items-center justify-center">
                                  <Sparkles size={16} className="text-dark-900" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Content Container */}
                          <div className={`flex-1 min-w-0 flex flex-col ${
                            isUser ? 'items-end' : 'items-start'
                          }`}>
                            
                            {/* Metadata / Header Row (No "You" or "Assistant" text) */}
                            {!isTool && !isSameTurn && (
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap px-1">
                                {!isUser && (
                                  <span className="text-sm font-semibold text-white">
                                    {message.model ? (message.model.length > 30 ? message.model.slice(0, 30) + '...' : message.model) : 'Assistant'}
                                  </span>
                                )}
                                
                                {settings.showTimestamps && (
                                  <span className="text-xs text-dark-500">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                                
                                {!isUser && message.responseTime && (
                                  <span className="text-xs text-dark-600">
                                    ({Math.round(message.responseTime / 1000)}s)
                                  </span>
                                )}
                                
                                {!isUser && message.usage && settings.showCostEstimate && (
                                  <span className="text-xs text-dark-600">
                                    {formatTokenCount(message.usage.totalTokens)} tokens • {formatCost(calculateMessageCost(message.provider, message.model, message.usage))}
                                  </span>
                                )}
                                
                                {!isUser && message.isStreaming && (
                                  <span className="flex items-center gap-1 text-xs text-slime-400">
                                    <span className="w-1.5 h-1.5 bg-slime-400 rounded-full animate-pulse streaming-glow" />
                                    typing...
                                  </span>
                                )}
                                
                                {/* Indicators (Thinking, Processing, Coding, Error) */}
                                {!isUser && message.assistantSidebar?.thinking && !message.isStreaming && (
                                  <button
                                    onClick={() => {
                                      if (openSidebarMessageId !== message.id) {
                                        openRightSidebar(message.id, message.assistantSidebar!, 'thinking');
                                      }
                                    }}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      openSidebarMessageId === message.id && message.assistantSidebar.activeBlock === 'thinking'
                                        ? 'text-green-400'
                                        : 'text-green-500 hover:text-green-400'
                                    }`}
                                  >
                                    <Brain size={12} />
                                    <span>Thinking</span>
                                    {message.assistantSidebar.thinking.isStreaming && (
                                      <Loader2 size={10} className="animate-spin" />
                                    )}
                                  </button>
                                )}

                                {!isUser && message.assistantSidebar?.processing && (
                                  <button
                                    onClick={() => {
                                      if (openSidebarMessageId !== message.id) {
                                        openRightSidebar(message.id, message.assistantSidebar!, 'processing');
                                      }
                                    }}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      openSidebarMessageId === message.id && message.assistantSidebar.activeBlock === 'processing'
                                        ? 'text-cyan-400'
                                        : 'text-cyan-500 hover:text-cyan-400'
                                    }`}
                                  >
                                    <Cpu size={12} />
                                    <span>Processing</span>
                                    {message.assistantSidebar.processing.isStreaming && (
                                      <Loader2 size={10} className="animate-spin" />
                                    )}
                                  </button>
                                )}

                                {!isUser && (message.assistantSidebar?.coding || message.content.includes('```')) && (
                                  <button
                                    onClick={() => {
                                      if (openSidebarMessageId !== message.id) {
                                        const sidebarContent = message.assistantSidebar || {
                                          activeBlock: 'coding' as SidebarBlockType,
                                          coding: {
                                            blocks: [],
                                            isStreaming: false,
                                            currentBlockId: '',
                                            timestamp: Date.now(),
                                          },
                                        };
                                        openRightSidebar(message.id, sidebarContent, 'coding', message.content);
                                      }
                                    }}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      openSidebarMessageId === message.id && message.assistantSidebar?.activeBlock === 'coding'
                                        ? 'text-purple-400'
                                        : 'text-purple-500 hover:text-purple-400'
                                    }`}
                                  >
                                    <Terminal size={12} />
                                    <span>Code</span>
                                    {message.assistantSidebar?.coding?.isStreaming && (
                                      <Loader2 size={10} className="animate-spin" />
                                    )}
                                  </button>
                                )}

                                {!isUser && message.error && (
                                  <span className="flex items-center gap-1 text-xs text-red-400">
                                    <AlertTriangle size={12} />
                                    Error
                                    <button
                                      onClick={retryLastMessage}
                                      className="ml-1 text-slime-400 hover:text-slime-300"
                                      title="Retry"
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                  </span>
                                )}

                                {/* Message actions (hover) */}
                                {isUser && (
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                    {isLastUserMessage && (
                                      <button
                                        onClick={() => {
                                          setEditingMessageId(message.id);
                                          setEditContent(message.content);
                                        }}
                                        className="p-1 text-dark-500 hover:text-dark-100 transition-colors"
                                        title="Edit and resend"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => branchConversation(message.id)}
                                      className="p-1 text-dark-500 hover:text-dark-100 transition-colors"
                                      title="Continue from here as new chat"
                                    >
                                      <GitBranch size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Actual Message Bubble */}
                            {isTool ? (
                              <details className="w-full bg-dark-900/40 border border-dark-700/50 rounded-lg overflow-hidden backdrop-blur-sm cursor-pointer group">
                                <summary className="px-4 py-2 text-xs text-dark-400 select-none group-hover:text-dark-300 focus:outline-none">
                                  Observed Tool Output (ID: {message.toolCallId?.slice(0, 8) || 'N/A'})
                                </summary>
                                <div className="px-4 py-3 border-t border-dark-700/40 text-xs text-dark-500 font-mono whitespace-pre-wrap mt-0 bg-dark-900/60 max-h-96 overflow-y-auto">
                                  {message.content}
                                </div>
                              </details>
                            ) : shouldRenderBubble ? (
                              <div className={isUser
                                ? `w-fit text-left px-5 py-3.5 rounded-2xl shadow-md msg-user rounded-tr-none border border-slime-500/20 ${isHighlighted ? 'bg-yellow-900/20' : ''}`
                                : `w-full text-left text-dark-100 py-1 ${isHighlighted ? 'bg-yellow-900/20' : ''}`
                              }>
                                
                                {editingMessageId === message.id ? (
                                  <div className="mt-1 min-w-[280px] sm:min-w-[400px]">
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="w-full bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-dark-100 text-sm resize-none focus:outline-none focus:border-slime-500/40"
                                      rows={3}
                                      autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={async () => {
                                          await editLastMessage(editContent);
                                          setEditingMessageId(null);
                                        }}
                                        className="px-3 py-1 btn-send text-dark-900 text-xs rounded-lg font-medium"
                                      >
                                        Resend
                                      </button>
                                      <button
                                        onClick={() => setEditingMessageId(null)}
                                        className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-dark-100 text-xs rounded-lg"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-dark-200">
                                    {isUser ? (
                                      <div className="space-y-2">
                                        {message.attachments && message.attachments.length > 0 && (
                                          <div className="flex flex-wrap gap-2 mb-2">
                                            {message.attachments.map((att, idx) => (
                                              att.type === 'image' ? (
                                                <img
                                                  key={idx}
                                                  src={att.url}
                                                  alt={att.name}
                                                  className="max-w-xs max-h-48 rounded-lg border border-dark-700/50"
                                                />
                                              ) : (
                                                <div key={idx} className="flex items-center gap-2 bg-dark-800/70 px-3 py-2 rounded-lg border border-dark-700/40">
                                                  <FileText size={16} className="text-dark-400" />
                                                  <span className="text-sm text-dark-300">{att.name}</span>
                                                </div>
                                              )
                                            ))}
                                          </div>
                                        )}
                                        <div className="whitespace-pre-wrap text-dark-100">
                                          {message.content}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <MarkdownRenderer content={
                                          message.assistantSidebar
                                            ? getFilteredContent(message.content, message.assistantSidebar)
                                            : message.content
                                        } />
                                        
                                        {/* Assistant Response Actions Row */}
                                        {!isUser && !message.isStreaming && (
                                          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dark-700/20 text-xs text-dark-500">
                                            {/* Copy Button */}
                                            <button
                                              onClick={() => copyMessageToClipboard(message.content)}
                                              className="flex items-center gap-1 hover:text-dark-200 transition-colors btn-press animate-msg-appear"
                                              title="Copy response"
                                            >
                                              {_copiedMessageId === message.id ? (
                                                <>
                                                  <Check size={12} className="copy-pulse text-slime-400" />
                                                  <span className="text-slime-400">Copied</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Copy size={12} />
                                                  <span>Copy</span>
                                                </>
                                              )}
                                            </button>
                                            
                                            {/* Regenerate Button */}
                                            <button
                                              onClick={() => regenerateResponse(message.id)}
                                              disabled={isLoading}
                                              className="flex items-center gap-1 hover:text-dark-200 transition-colors btn-press disabled:opacity-50 animate-msg-appear"
                                              title="Regenerate this response"
                                            >
                                              <RotateCcw size={12} />
                                              <span>Regenerate</span>
                                            </button>

                                            {/* Branch Button */}
                                            <button
                                              onClick={() => branchConversation(message.id)}
                                              className="flex items-center gap-1 hover:text-dark-200 transition-colors btn-press animate-msg-appear"
                                              title="Continue from here as new chat"
                                            >
                                              <GitBranch size={12} />
                                              <span>Branch</span>
                                            </button>

                                            {/* Sidebar Details Toggle (if has activeBlock) */}
                                            {message.assistantSidebar && message.assistantSidebar.activeBlock && (
                                              <button
                                                onClick={() => openSidebarMessageId === message.id ? closeRightSidebar() : openRightSidebar(message.id, message.assistantSidebar!, message.assistantSidebar.activeBlock || undefined)}
                                                className={`flex items-center gap-1 transition-colors btn-press animate-msg-appear ${
                                                  openSidebarMessageId === message.id ? 'text-slime-400' : 'hover:text-dark-200'
                                                }`}
                                                title="Toggle assistant details"
                                              >
                                                <Sparkles size={12} />
                                                <span>Details</span>
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Clickable Code Block Trigger */}
                                    {!isUser && message.assistantSidebar?.coding?.blocks && message.assistantSidebar.coding.blocks.length > 0 && (
                                      <CodeBlockTrigger
                                        blocks={message.assistantSidebar.coding.blocks}
                                        onClick={() => {
                                          if (openSidebarMessageId !== message.id) {
                                            openRightSidebar(message.id, message.assistantSidebar!, 'coding', message.content);
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : null}

                          </div>
                        </div>

                        {/* Enhanced Sidebar - shown for assistant messages with sidebar content (only when not using external sidebar) */}
                        {!isUsingExternalSidebar && !isUser && message.assistantSidebar && openSidebarMessageId === message.id && (
                          <SidebarManager
                            content={message.assistantSidebar}
                            onClose={() => closeRightSidebar()}
                            isStreaming={message.isStreaming}
                            compact={false}
                            onBlockChange={(block) => {
                              // Use context method to update active block
                              setMessageSidebarActiveBlock?.(message.id, block);
                            }}
                          />
                        )}
                      </div>
                    );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="sticky bottom-0 z-10 border-t border-dark-700/30 p-4 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {/* Personality Selector - Rotating lineup */}
          <PersonalitySelector
            activePersonalityId={activePersonalityId}
            onPersonalitySelect={(id) => {
              setActivePersonalityId(id);
            }}
          />


          {attachments.length > 0 && (
            <div className="mb-2 animate-fade-in-down">
              <AttachmentInput
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>
          )}
          {/* Enhanced Input Container with Glow Effect */}
          <div 
            className={`chat-input-wrap flex items-end gap-2 ${

              attachments.length > 0 
                ? 'border-slime-500/50 shadow-lg shadow-slime-500/20' 
                : 'focus-within:border-slime-500/35 focus-within:shadow-slime-500/10'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-slime-500', 'shadow-lg', 'shadow-slime-500/20');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-slime-500', 'shadow-lg', 'shadow-slime-500/20');
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-slime-500', 'shadow-lg', 'shadow-slime-500/20');
              
              const files = e.dataTransfer.files;
              if (!files || files.length === 0) return;
              
              const newAtts: Attachment[] = [];
              
              for (let i = 0; i < files.length; i++) {
                const f = files[i];
                if (f.type.startsWith('image/')) {
                  const base64 = await fileToBase64(f);
                  const dataUrl = `data:${f.type};base64,${base64}`;
                  newAtts.push({
                    id: `img-${Date.now()}-${i}`,
                    type: 'image',
                    name: f.name,
                    mimeType: f.type,
                    size: f.size,
                    url: dataUrl,
                  });
                } else {
                  newAtts.push({
                    id: `file-${Date.now()}-${i}`,
                    type: 'file',
                    name: f.name,
                    mimeType: f.type,
                    size: f.size,
                    url: URL.createObjectURL(f),
                  });
                }
              }
              
              setAttachments([...attachments, ...newAtts]);
            }}
          >
            <div className="flex items-center gap-1 pb-1">
              {/* Add Attachment Button with Dropdown */}
              <div className="relative">
                <button
                  className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors btn-press"
                  title="Add attachment"
                  aria-label="Add attachment"
                  aria-expanded={showAttachmentMenu}
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                >
                  <Plus size={16} />
                </button>
                {showAttachmentMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAttachmentMenu(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-1 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl py-1 z-50 min-w-32">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40 transition-colors"
                        onClick={() => {
                          document.getElementById('image-input')?.click();
                          setShowAttachmentMenu(false);
                        }}
                      >
                        <Image size={14} />
                        Add image
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40 transition-colors"
                        onClick={() => {
                          document.getElementById('file-input')?.click();
                          setShowAttachmentMenu(false);
                        }}
                      >
                        <FileText size={14} />
                        Add file
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  
                  const newAtts: Attachment[] = [];
                  for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    const base64 = await fileToBase64(f);
                    const dataUrl = `data:${f.type};base64,${base64}`;
                    newAtts.push({
                      id: `img-${Date.now()}-${i}`,
                      type: 'image',
                      name: f.name,
                      mimeType: f.type,
                      size: f.size,
                      url: dataUrl,
                    });
                  }
                  setAttachments([...attachments, ...newAtts]);
                  e.target.value = '';
                }}
              />
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newAtts: Attachment[] = Array.from(files).map((f, i) => ({
                    id: `file-${Date.now()}-${i}`,
                    type: 'file',
                    name: f.name,
                    mimeType: f.type,
                    size: f.size,
                    url: URL.createObjectURL(f),
                  }));
                  setAttachments([...attachments, ...newAtts]);
                  e.target.value = '';
                }}
              />
            </div>
            {input.length > 200 && (
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className={`p-1.5 rounded transition-colors btn-press ${showMarkdownPreview ? 'text-cyan-400 bg-cyan-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
                title={showMarkdownPreview ? 'Edit' : 'Preview'}
              >
                <span className="text-xs">{showMarkdownPreview ? '✏️' : '👁️'}</span>
              </button>
            )}
            {/* Character count for long inputs */}
            {input.length > 500 && (
              <span className={`text-xs font-mono ${input.length > 4000 ? 'text-red-400' : 'text-dark-500'}`}>
                {input.length.toLocaleString()}
              </span>
            )}
            {/* Loop execution toggle */}
            {settings.loopEnabled && (
              <button
                onClick={() => setShowLoopPanel(!showLoopPanel)}
                className={`p-1.5 rounded transition-colors btn-press ${
                  showLoopPanel || loopState
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700/40'
                }`}
                title={showLoopPanel ? 'Hide loop controls' : 'Loop controls'}
              >
                <Terminal size={14} />
              </button>
            )}
            {/* Loop status indicator */}
            {loopState && loopState.status === 'running' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded text-xs text-green-400 streaming-indicator">
                <span className="streaming-dot" />
                <span className="streaming-dot" />
                <span className="streaming-dot" />
                {loopState.currentIteration}/{loopState.maxIterations}
              </div>
            )}
            {loopState && loopState.status === 'paused' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded text-xs text-yellow-400">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                Paused
              </div>
            )}
            {showMarkdownPreview ? (
              <div className="flex-1 min-h-[60px] max-h-[200px] overflow-y-auto bg-dark-900 rounded-lg px-3 py-2 text-dark-200 text-sm whitespace-pre-wrap">
                {input}
              </div>
            ) : (
              <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTextareaResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                activeModel
                  ? `Message ${activeModel.name}...`
                  : 'Select a model first...'
              }
              rows={1}
              className="flex-1 bg-transparent text-dark-100 placeholder-dark-500 text-sm resize-none focus:outline-none min-h-[24px] max-h-[200px]"
              disabled={!activeModel}
            />
            )}
            {isLoading ? (
              <button
                onClick={stopStreaming}
                className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors shrink-0 btn-press"
                title="Stop generating"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!activeModel || (!input.trim() && attachments.length === 0)}
                className="p-2 btn-send disabled:bg-dark-700 disabled:text-dark-500 text-dark-900 rounded-lg transition-colors shrink-0 btn-press disabled:btn-press:scale-100 focus-ring-a11y"
                title="Send message (Ctrl+Enter)"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          {/* Enhanced Keyboard shortcuts hint */}
          <div className="flex items-center justify-between mt-2 text-xs text-dark-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd>
                <span className="text-dark-500 ml-1">History</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">↵</kbd>
                <span className="text-dark-500 ml-1">Send</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">Esc</kbd>
                <span className="text-dark-500 ml-1">Close</span>
              </span>
            </div>
            {inputHistory.length > 0 && (
              <span className="text-dark-500">{inputHistory.length} saved</span>
            )}
          </div>

          {/* Loop Control Panel */}
          {showLoopPanel && settings.loopEnabled && (
            <div className="mt-3 pt-3 border-t border-dark-700/40">
              <LoopControlPanel
                isCompact={false}
                onStartLoop={(prompt, config) => {
                  startLoop(prompt, config);
                  setShowLoopPanel(false);
                }}
                onPauseLoop={pauseLoop}
                onResumeLoop={resumeLoop}
                onCancelLoop={cancelLoop}
              />
            </div>
          )}
        </div>
      </div>

      {/* Auto-scroll floating button */}
      {showNewMessages && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowNewMessages(false);
          }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slime-500 to-teal-500 hover:from-slime-400 hover:to-teal-400 text-dark-900 text-sm rounded-full shadow-lg shadow-slime-500/30 transition-all animate-bounce"
        >
          <ChevronDown size={14} />
          New messages
        </button>
      )}

      {/* Editing title inline */}
      {editingTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-700/40 rounded-xl p-4 w-80">
            <h3 className="text-dark-100 font-medium mb-3">Rename Conversation</h3>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700/50 rounded-lg px-3 py-2 text-dark-100 text-sm focus:outline-none focus:border-slime-500/40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameConversation(activeConversation!.id, titleInput);
                  setEditingTitle(false);
                }
                if (e.key === 'Escape') {
                  setEditingTitle(false);
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  renameConversation(activeConversation!.id, titleInput);
                  setEditingTitle(false);
                }}
                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-slime-500 to-teal-500 hover:from-slime-400 hover:to-teal-400 text-dark-900 text-sm rounded-lg font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};