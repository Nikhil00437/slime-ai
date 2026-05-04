import React, { useEffect, useRef, useState } from 'react';
import { ModelInfo, DEFAULT_SKILLS, Skill, SidebarBlockType, AssistantSidebarContent, CodeBlock } from '../types';
import { useAppContext } from '../store/AppContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AttachmentInput, Attachment, getCapabilityFilters, filterModelsByCapabilities } from './AttachmentInput';
import { calculateMessageCost, formatCost, formatTokenCount } from '../api/pricing';
import { SkillQuickAccessBar, getPinnedSkillIds } from './SkillQuickAccessBar';
import { SkillSuggestionBanner, getSuggestionReason } from './SkillSuggestionBanner';
import { PersonalitySelector } from './PersonalitySelector';
import { detectSkillFromQuery, getAttachmentTypeFromList, CONFIDENCE_THRESHOLD } from '../utils/skillDetection';
import { AssistantSidebar } from './AssistantSidebar';
import { SidebarManager } from './SidebarManager';
import {
  Send,
  Square,
  Menu,
  ChevronDown,
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
  const [agentStepsCollapsed, setAgentStepsCollapsed] = useState(() => {
    const stored = localStorage.getItem('mm_agent_steps_collapsed');
    return stored ? JSON.parse(stored) : true;
  });
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
    const activeBlock = blockType || finalContent.coding ? 'coding' : finalContent.processing ? 'processing' : finalContent.thinking ? 'thinking' : undefined;

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

  // Skill Quick Access state
  const [pinnedSkillIds] = useState<string[]>(() => getPinnedSkillIds());
  const [activeSkillForBar, setActiveSkillForBar] = useState<string | null>(null);
  const [suggestedSkill, setSuggestedSkill] = useState<Skill | null>(null);
  const [suggestionConfidence, setSuggestionConfidence] = useState(0);
  const [suggestionReason, setSuggestionReason] = useState('');

  // Personality state
  const [activePersonalityId, setActivePersonalityId] = useState<string | null>(null);

  // Input history navigation state within component (synced with context)
  const [inputHistoryLocalIndex, setInputHistoryLocalIndex] = useState<number>(-1);

  // Persist agent steps collapse state
  useEffect(() => {
    localStorage.setItem('mm_agent_steps_collapsed', JSON.stringify(agentStepsCollapsed));
  }, [agentStepsCollapsed]);

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
    const container = messagesContainerRef.current;
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

  // Skill auto-detection and suggestion when input changes
  useEffect(() => {
    if (!input.trim() || input.length < 3) {
      if (suggestedSkill) {
        setSuggestedSkill(null);
      }
      return;
    }

    const attachmentType = getAttachmentTypeFromList(attachments as unknown as Array<{ type: string }>);
    const result = detectSkillFromQuery(input, DEFAULT_SKILLS as Skill[], attachmentType);

    // If confidence is below auto-threshold but above suggestion threshold, show banner
    if (result.confidence >= 0.5 && result.confidence < CONFIDENCE_THRESHOLD && result.skill) {
      if (!suggestedSkill || suggestedSkill.id !== result.skill.id) {
        setSuggestedSkill(result.skill);
        setSuggestionConfidence(result.confidence);
        setSuggestionReason(getSuggestionReason(result.matchedKeywords, result.matchedTriggers, attachmentType));
      }
    } else if (result.confidence >= CONFIDENCE_THRESHOLD) {
      // Auto-activate - update the bar
      setActiveSkillForBar(result.skill?.id || null);
      setSuggestedSkill(null);
    }
  }, [input, attachments]);

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
    await sendMessage(trimmed, currentAttachments, activePersonalityId || undefined, convId);
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
            title="View system prompt"
          >
            <Sparkles size={14} />
          </button>
          {showSystemPrompt && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSystemPrompt(false)} />
              <div className="absolute top-full right-0 mt-1 p-3 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl z-50 max-w-64">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <span className="text-xs font-semibold text-dark-300">System Prompt</span>
                </div>
                <p className="text-xs text-dark-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {settings.systemPrompt}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toolbar with search and conversation actions */}
      {activeConversation && activeConversation.messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-dark-800/30 border-b border-dark-700/30">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors"
                title="Search in conversation"
              >
                <Search size={14} />
              </button>
              {showSearch && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <div className="flex items-center gap-1 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg px-2 py-1">
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
                  className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors"
                  title="Quick prompts"
                >
                  <Library size={14} />
                </button>
                {showQuickPrompts && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl min-w-48">
                    <div className="p-2">
                      <div className="text-xs text-dark-500 px-2 py-1">Quick Prompts</div>
                      {settings.quickPrompts.map(prompt => (
                        <button
                          key={prompt.id}
                          onClick={() => {
                            setInput(prompt.content);
                            setShowQuickPrompts(false);
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm text-dark-300 hover:bg-dark-700/40 rounded"
                        >
                          {prompt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Regenerate last response */}
            {activeConversation.messages.length > 0 && (
              <button
                onClick={regenerateLastResponse}
                disabled={isLoading}
                className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors disabled:opacity-50"
                title="Regenerate last response"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timestamp toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, showTimestamps: !s.showTimestamps }))}
              className={`p-1.5 rounded transition-colors ${settings.showTimestamps ? 'text-cyan-400 bg-cyan-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
              title={settings.showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            >
              <Clock size={14} />
            </button>
            
            {/* Token count toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, showCostEstimate: !s.showCostEstimate }))}
              className={`p-1.5 rounded transition-colors ${settings.showCostEstimate ? 'text-slime-400 bg-slime-400/10' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/40'}`}
              title={settings.showCostEstimate ? 'Hide cost/token info' : 'Show cost and token count'}
            >
              <span className="text-xs font-mono">$</span>
            </button>
            
            {/* Memory toggle */}
            <button
              onClick={() => {
                // Memory is per-conversation, toggled via conversation update
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
            
            {/* Conversation menu */}
            <div className="relative">
              <button
                onClick={() => setShowConvMenu(!showConvMenu)}
                className="p-1.5 text-dark-500 hover:text-dark-200 hover:bg-dark-700/40 rounded transition-colors"
              >
                <MoreVertical size={14} />
              </button>
              {showConvMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowConvMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-dark-800/95 backdrop-blur-xl border border-dark-700/30 rounded-lg shadow-xl min-w-40">
                    <button
                      onClick={() => {
                        duplicateConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700/40 rounded-t-lg"
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-900/20"
                    >
                      <Trash2 size={14} /> Clear Messages
                    </button>
                    <button
                      onClick={() => {
                        deleteConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-b-lg"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative scroll-smooth">
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
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slime-500/10 to-cyan-500/10 border border-dark-700/30">
              <Sparkles size={48} className="text-slime-400" />
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2">Slime AI</h1>
            <p className="text-dark-400 max-w-md mb-8">
              Chat with AI models from Ollama, LM Studio, and OpenRouter. Select a model from the
              sidebar to get started.
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

            {activeConversation.messages.map((message, index) => {
              const isHighlighted = searchInput && message.content.toLowerCase().includes(searchInput.toLowerCase());
              const isLastUserMessage = message.role === 'user' && 
                index === activeConversation.messages.slice().reverse().findIndex(m => m.role === 'user');
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 px-4 py-4 group relative animate-msg-appear rounded-2xl ${
                    message.role === 'user' ? 'msg-user' : message.role === 'tool' ? 'bg-dark-800/40 border border-dark-700/40' : 'msg-assistant'
                  } ${
                    index > 0 && activeConversation.messages[index - 1].role === message.role
                      ? 'py-1'
                      : ''
                  } ${isHighlighted ? 'bg-yellow-900/20' : ''}`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 mt-0.5">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slime-500 to-teal-500 flex items-center justify-center">
                        <User size={16} className="text-dark-900" />
                      </div>
                    ) : message.role === 'tool' ? (
                      <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700/50 flex items-center justify-center">
                        <Bot size={16} className="text-dark-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slime-400 to-teal-500 flex items-center justify-center">
                        <Sparkles size={16} className="text-dark-900" />
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {message.role === 'tool' ? (
                      <details className="w-full bg-dark-900/40 border border-dark-700/50 rounded-lg overflow-hidden backdrop-blur-sm cursor-pointer group">
                        <summary className="px-4 py-2 text-xs text-dark-400 select-none group-hover:text-dark-300 focus:outline-none">
                          Observed Tool Output (ID: {message.toolCallId?.slice(0, 8) || 'N/A'})
                        </summary>
                        <div className="px-4 py-3 border-t border-dark-700/40 text-xs text-dark-500 font-mono whitespace-pre-wrap mt-0 bg-dark-900/60 max-h-96 overflow-y-auto">
                          {message.content}
                        </div>
                      </details>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          {message.role === 'assistant' && (
                            <span className="text-xs text-dark-500 font-mono">
                              {message.model.length > 30
                                ? message.model.slice(0, 30) + '...'
                                : message.model}
                            </span>
                          )}
                          {settings.showTimestamps && (
                            <span className="text-xs text-dark-600">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                          {message.responseTime && message.role === 'assistant' && (
                            <span className="text-xs text-dark-600">
                              ({Math.round(message.responseTime / 1000)}s)
                            </span>
                          )}
                          {/* Token count and cost */}
                          {message.usage && message.role === 'assistant' && settings.showCostEstimate && (
                            <span className="text-xs text-dark-600">
                              {formatTokenCount(message.usage.totalTokens)} tokens • {formatCost(calculateMessageCost(message.provider, message.model, message.usage))}
                            </span>
                          )}
                          {message.isStreaming && (
                            <span className="flex items-center gap-1 text-xs text-slime-400">
                              <span className="w-1.5 h-1.5 bg-slime-400 rounded-full animate-pulse streaming-glow" />
                              typing...
                            </span>
                          )}
                          {/* Thinking indicator - shown when assistant has thinking content */}
                          {message.assistantSidebar?.thinking && !message.isStreaming && (
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
                          {/* Processing indicator - shown when assistant is running tools */}
                          {message.assistantSidebar?.processing && (
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
                          {/* Coding indicator - shown when assistant has code blocks */}
                          {(message.assistantSidebar?.coding || message.content.includes('```')) && (
                            <button
                              onClick={() => {
                                if (openSidebarMessageId !== message.id) {
                                  // Create sidebar content if it doesn't exist
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
                          {message.error && (
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
 
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            {/* Assistant Sidebar Toggle */}
                            {message.role === 'assistant' && message.assistantSidebar && message.assistantSidebar.activeBlock && (
                              <button
                                onClick={() => openSidebarMessageId === message.id ? closeRightSidebar() : openRightSidebar(message.id, message.assistantSidebar!, message.assistantSidebar.activeBlock)}
                                className={`p-1 transition-colors focus-ring-a11y ${
                                  openSidebarMessageId === message.id
                                    ? 'text-slime-400'
                                    : 'text-dark-500 hover:text-dark-100'
                                }`}
                                title="Toggle assistant details"
                              >
                                <Sparkles size={12} />
                              </button>
                            )}
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => copyMessageToClipboard(message.content)}
                                className="p-1 text-dark-500 hover:text-dark-100 transition-colors copy-button focus-ring-a11y"
                                title="Copy response"
                              >
                                {_copiedMessageId === message.id ? (
                                  <Check size={12} className="copy-check copy-pulse" />
                                ) : (
                                  <Copy size={12} className="copy-icon" />
                                )}
                              </button>
                            )}
                            {message.role === 'user' && isLastUserMessage && (
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
                            {message.role === 'user' && (
                              <button
                                onClick={() => branchConversation(message.id)}
                                className="p-1 text-dark-500 hover:text-dark-100 transition-colors"
                                title="Continue from here as new chat"
                              >
                                <GitBranch size={12} />
                              </button>
                            )}
                          </div>
                        </div>
 
                        {editingMessageId === message.id ? (
                          <div className="mt-2">
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
                            {message.role === 'user' ? (
                              <div className="space-y-2">
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
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
                                  {message.role === 'assistant' && message.assistantSidebar
                                    ? getFilteredContent(message.content, message.assistantSidebar)
                                    : message.content}
                                </div>
                              </div>
                            ) : (
                              <MarkdownRenderer content={
                                message.role === 'assistant' && message.assistantSidebar
                                  ? getFilteredContent(message.content, message.assistantSidebar)
                                  : message.content
                              } />
                            )}
                            
                            {/* Clickable Code Block Trigger - replaces code blocks in chat */}
                            {message.role === 'assistant' && message.assistantSidebar?.coding?.blocks && message.assistantSidebar.coding.blocks.length > 0 && (
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
                      </>
                    )}
                  </div>

                  {/* Enhanced Sidebar - shown for assistant messages with sidebar content (only when not using external sidebar) */}
                  {!isUsingExternalSidebar && message.role === 'assistant' && message.assistantSidebar && openSidebarMessageId === message.id && (
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
          </div>
        )}
        
        {/* Collapsible Agent Steps Section */}
        {activeConversation?.agentSteps && activeConversation.agentSteps.length > 0 && (
          <div className="px-4 py-2 border-t border-dark-700/30">
            <button
              onClick={() => setAgentStepsCollapsed(!agentStepsCollapsed)}
              className="flex items-center gap-2 text-xs text-dark-400 hover:text-dark-300"
            >
              {agentStepsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>Agent Steps ({activeConversation.agentSteps.length})</span>
            </button>
            {!agentStepsCollapsed && (
              <div className="mt-2 space-y-2">
                {activeConversation.agentSteps.map((step, idx) => (
                  <div key={idx} className="bg-dark-900/40 border border-dark-700/40 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slime-400 mb-2">
                      Step {step.stepNumber}
                    </div>
                    <div className="text-xs text-dark-400 mb-1">
                      Tools: {step.toolCalls.map(tc => tc.function.name).join(', ')}
                    </div>
                    {step.toolResults.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-dark-500 cursor-pointer hover:text-dark-400">
                          Results ({step.toolResults.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {step.toolResults.map((result, rIdx) => (
                            <div key={rIdx} className="text-xs text-dark-600 font-mono bg-dark-900/60 p-2 rounded max-h-24 overflow-y-auto">
                              {result.content.slice(0, 200)}
                              {result.content.length > 200 && '...'}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
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

          {/* Skill Quick Access Bar - removed, using Personality Selector instead */}
          {/*}
          <SkillQuickAccessBar
            skills={DEFAULT_SKILLS as Skill[]}
            activeSkillId={activeSkillForBar}
            onSkillToggle={(skillId) => {
              setActiveSkillForBar(skillId);
              setSuggestedSkill(null);
            }}
            pinnedSkillIds={pinnedSkillIds}
          />
          */}

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