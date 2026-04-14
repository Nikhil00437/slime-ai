import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AttachmentInput, Attachment, getCapabilityFilters, filterModelsByCapabilities } from './AttachmentInput';
import { isModelCompatibleWithSkill, filterModelsBySkill, getIncompatibleModels } from '../api/modelSkillCompatibility';
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
  ArrowDown,
  RotateCcw,
  Edit3,
  Clock,
  MoreVertical,
  Download,
  Copy as CopyIcon,
  GitBranch,
  Pin,
  Star,
  X,
  Library,
  ChevronUp,
  MessageSquare,
  Trash2,
  Pencil,
} from 'lucide-react';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ChatPanel: React.FC = () => {
  const {
    activeConversation,
    activeModel,
    isLoading,
    sendMessage,
    stopStreaming,
    setIsSidebarOpen,
    providers,
    setActiveModel,
    skills,
    setSettings,
    activeSkill,
    isExecutingTool,
    activeTools,
    createConversation,
    settings,
    regenerateLastResponse,
    editLastMessage,
    retryLastMessage,
    copyMessageToClipboard,
    searchConversation,
    inputHistory,
    addToInputHistory,
    activeConversationId,
    conversations,
    setActiveConversation,
    deleteConversation,
    togglePinConversation,
    duplicateConversation,
    renameConversation,
    branchConversation,
    exportConversation,
  } = useAppContext();

  const [input, setInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    prevMessagesLength.current = activeConversation?.messages.length || 0;
  }, [activeConversation?.messages.length, activeConversation?.messages]);

  // Auto-scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      setIsAtBottom(atBottom);
      setShowNewMessages(!atBottom && !isLoading);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoading]);

  // Scroll to bottom on new messages when at bottom
  useEffect(() => {
    if (isAtBottom && activeConversation?.messages.length !== prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeConversation?.messages.length, isAtBottom]);

  // Search functionality
  useEffect(() => {
    if (searchInput.trim()) {
      searchConversation(searchInput);
    }
  }, [searchInput]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0 || isLoading || !activeModel) return;
    
    // Auto-create conversation if none exists
    if (!activeConversation) {
      createConversation(activeModel.id, activeModel.provider);
    }
    
    // Add to input history
    addToInputHistory(trimmed);
    
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    await sendMessage(trimmed, currentAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow up - cycle through input history
    if (e.key === 'ArrowUp' && inputHistory.length > 0 && !showModelDropdown) {
      e.preventDefault();
      const currentIndex = inputHistoryIndex;
      const newIndex = currentIndex < inputHistory.length - 1 ? currentIndex + 1 : currentIndex;
      setInputHistoryIndex(newIndex);
      setInput(inputHistory[newIndex] || '');
      return;
    }
    
    // Arrow down - cycle through input history
    if (e.key === 'ArrowDown' && inputHistoryIndex > 0) {
      e.preventDefault();
      const newIndex = inputHistoryIndex - 1;
      setInputHistoryIndex(newIndex);
      setInput(inputHistory[newIndex] || '');
      return;
    }
    
    // Ctrl+Enter - send (multiline)
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    
    // Escape - close dropdowns
    if (e.key === 'Escape') {
      setShowModelDropdown(false);
      setShowSearch(false);
      setShowQuickPrompts(false);
      setEditingMessageId(null);
      setShowMessageMenu(null);
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
    openrouter: 'text-blue-400',
    openai: 'text-green-400',
    anthropic: 'text-orange-400',
    gemini: 'text-red-400',
    grok: 'text-white',
  };

  const allModels = providers.flatMap((p) => p.models);
  
  // Arena-style: filter models by capability when attachments are present
  const capFilters = getCapabilityFilters(attachments);
  const hasCapFilter = Object.keys(capFilters).length > 0;
  const capableModels = hasCapFilter ? filterModelsByCapabilities(allModels, capFilters) : allModels;
  const capableModelIds = new Set(capableModels.map(m => m.id));

  // Filter by skill compatibility
  const skillCompatibleModels = activeSkill 
    ? filterModelsBySkill(capableModels, activeSkill)
    : capableModels;
  const skillCompatibleModelIds = new Set(skillCompatibleModels.map(m => m.id));

  // Check if currently selected model is incompatible
  const currentCompatibility = activeModel && activeSkill
    ? isModelCompatibleWithSkill(activeModel, activeSkill)
    : { compatible: true, reason: '' };
  const showIncompatibleWarning = activeModel && !currentCompatibility.compatible;

  // Get incompatible models for dropdown info (kept for future use)
  void getIncompatibleModels;

  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
      {/* Chat Header - Sticky at top */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors w-full min-w-0"
          >
            {currentProvider && (
              <span className={providerColors[currentProvider.id]}>
                {providerIcons[currentProvider.id]}
              </span>
            )}
            <span className="text-sm text-white font-medium truncate">
              {activeModel?.name || 'Select a model...'}
            </span>
            <ChevronDown
              size={14}
              className={`text-gray-400 shrink-0 transition-transform ${
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
              <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50">
                {hasCapFilter && (
                  <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                    <span className="text-xs text-blue-400 font-medium">
                      Showing models that support:
                    </span>
                    {capFilters.image && <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Image</span>}
                    {capFilters.audio && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Audio</span>}
                    {capFilters.video && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Video</span>}
                    {capFilters.fileUpload && <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Files</span>}
                  </div>
                )}
                {activeSkill && (
                  <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                    <Sparkles size={12} className="text-purple-400" />
                    <span className="text-xs text-purple-400 font-medium">
                      Skill: {activeSkill.name}
                    </span>
                  </div>
                )}
                {providers.map((provider) => {
                  let providerModels = hasCapFilter
                    ? provider.models.filter(m => capableModelIds.has(m.id))
                    : provider.models;
                  // Also filter by skill compatibility
                  if (activeSkill) {
                    providerModels = providerModels.filter(m => skillCompatibleModelIds.has(m.id));
                  }
                  if (providerModels.length === 0) return null;
                  return (
                    <div key={provider.id} className="py-1">
                      <div className="px-3 py-2 flex items-center gap-2">
                        <span className={providerColors[provider.id]}>
                          {providerIcons[provider.id]}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">
                          {provider.name}
                        </span>
                      </div>
                      {providerModels.map((model) => {
                        const compat = activeSkill ? isModelCompatibleWithSkill(model, activeSkill) : { compatible: true, reason: '' };
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModel(model);
                              setShowModelDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors truncate flex items-center gap-2 ${
                              activeModel?.id === model.id
                                ? 'bg-blue-600/20 text-blue-400'
                                : compat.compatible
                                  ? 'text-gray-300 hover:bg-gray-800'
                                  : 'text-red-400/70 hover:bg-red-900/20'
                            }`}
                          >
                            {model.name}
                            {!compat.compatible && <AlertTriangle size={12} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {(hasCapFilter ? capableModels : allModels).length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">
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
                  ? 'bg-green-500'
                  : currentProvider.status === 'checking'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-gray-500 capitalize hidden sm:inline">
              {currentProvider.status}
            </span>
          </div>
        )}
      </div>

      {/* Incompatible Model Warning */}
      {showIncompatibleWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border-b border-red-800/50">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <span className="text-xs text-red-300">
            {currentCompatibility.reason}. Consider switching to a compatible model.
          </span>
        </div>
      )}

      {/* Toolbar with search and conversation actions */}
      {activeConversation && activeConversation.messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Search in conversation"
              >
                <Search size={14} />
              </button>
              {showSearch && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                    <Search size={12} className="text-gray-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search messages..."
                      className="bg-transparent text-white text-xs placeholder-gray-500 focus:outline-none w-40"
                      autoFocus
                    />
                    {searchInput && (
                      <button onClick={() => setSearchInput('')} className="text-gray-400 hover:text-white">
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
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Quick prompts"
                >
                  <Library size={14} />
                </button>
                {showQuickPrompts && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-48">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 px-2 py-1">Quick Prompts</div>
                      {settings.quickPrompts.map(prompt => (
                        <button
                          key={prompt.id}
                          onClick={() => {
                            setInput(prompt.content);
                            setShowQuickPrompts(false);
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded"
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
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
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
              className={`p-1.5 rounded transition-colors ${settings.showTimestamps ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title={settings.showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
            >
              <Clock size={14} />
            </button>
            
            {/* Conversation menu */}
            <div className="relative">
              <button
                onClick={() => setShowConvMenu(!showConvMenu)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <MoreVertical size={14} />
              </button>
              {showConvMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowConvMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-40">
                    <button
                      onClick={() => {
                        duplicateConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg"
                    >
                      <CopyIcon size={14} /> Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setEditingTitle(true);
                        setTitleInput(activeConversation.title);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Pencil size={14} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        togglePinConversation(activeConversation.id);
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Pin size={14} /> {activeConversation.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => {
                        exportConversation(activeConversation.id, 'markdown');
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Download size={14} /> Export Markdown
                    </button>
                    <button
                      onClick={() => {
                        exportConversation(activeConversation.id, 'pdf');
                        setShowConvMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <Download size={14} /> Export PDF
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
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {/* Active Top Status */}
        {isExecutingTool && activeTools.length > 0 && (
          <div className="sticky top-4 z-10 p-2 inset-x-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 backdrop-blur-md rounded-full text-xs text-blue-300 shadow-xl pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Agent executing: {activeTools.join(', ')}...</span>
            </div>
          </div>
        )}
        {!activeConversation || activeConversation.messages.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-gray-800">
              <Sparkles size={48} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Slime AI</h1>
            <p className="text-gray-400 max-w-md mb-8">
              Chat with AI models from Ollama, LM Studio, and OpenRouter. Select a model from the
              sidebar to get started.
            </p>

            {allModels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {allModels.slice(0, 4).map((model) => {
                  const prov = providers.find((p) => p.id === model.provider);
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setActiveModel(model);
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl text-left transition-colors"
                    >
                      <span className={providerColors[model.provider]}>
                        {providerIcons[model.provider]}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                          {model.name.length > 28
                            ? model.name.slice(0, 28) + '...'
                            : model.name}
                        </div>
                        <div className="text-xs text-gray-500">{prov?.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {allModels.length === 0 && (
              <div className="text-sm text-gray-500">
                <p>Make sure Ollama or LM Studio is running locally, or configure OpenRouter in settings.</p>
              </div>
            )}
          </div>
        ) : (
          /* Messages */
          <div className="max-w-3xl mx-auto py-4" ref={messagesContainerRef}>
            {activeConversation.messages.map((message, index) => {
              const isHighlighted = searchInput && message.content.toLowerCase().includes(searchInput.toLowerCase());
              const isLastUserMessage = message.role === 'user' && 
                index === activeConversation.messages.slice().reverse().findIndex(m => m.role === 'user');
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 px-4 py-4 group relative ${
                    message.role === 'user' ? '' : 'bg-gray-900'
                  } ${
                    index > 0 && activeConversation.messages[index - 1].role === message.role
                      ? 'py-1'
                      : ''
                  } ${isHighlighted ? 'bg-yellow-900/20' : ''}`}
                >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                  ) : message.role === 'tool' ? (
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <Bot size={16} className="text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Sparkles size={16} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {message.role === 'tool' ? (
                    <details className="w-full bg-black/20 border border-white/5 rounded-lg overflow-hidden backdrop-blur-sm cursor-pointer group">
                      <summary className="px-4 py-2 text-xs text-gray-400 select-none group-hover:text-gray-300 focus:outline-none">
                        Observed Tool Output (ID: {message.toolCallId?.slice(0, 8) || 'N/A'})
                      </summary>
                      <div className="px-4 py-3 border-t border-white/5 text-xs text-gray-500 font-mono whitespace-pre-wrap mt-0 bg-black/40 max-h-96 overflow-y-auto">
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
                          <span className="text-xs text-gray-500 font-mono">
                            {message.model.length > 30
                              ? message.model.slice(0, 30) + '...'
                              : message.model}
                          </span>
                        )}
                        {/* Timestamp */}
                        {settings.showTimestamps && (
                          <span className="text-xs text-gray-600">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                        {/* Response time */}
                        {message.responseTime && message.role === 'assistant' && (
                          <span className="text-xs text-gray-600">
                            ({Math.round(message.responseTime / 1000)}s)
                          </span>
                        )}
                        {message.isStreaming && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            typing...
                          </span>
                        )}
                        {/* Error indicator with retry */}
                        {message.error && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertTriangle size={12} />
                            Error
                            <button
                              onClick={retryLastMessage}
                              className="ml-1 text-blue-400 hover:text-blue-300"
                              title="Retry"
                            >
                              <RotateCcw size={12} />
                            </button>
                          </span>
                        )}
                        
                        {/* Message action buttons - show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          {/* Copy button for assistant messages */}
                          {message.role === 'assistant' && (
                            <button
                              onClick={() => copyMessageToClipboard(message.content)}
                              className="p-1 text-gray-500 hover:text-white transition-colors"
                              title="Copy response"
                            >
                              {copiedMessageId === message.id ? (
                                <Check size={12} className="text-green-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          )}
                          {/* Edit button for user messages */}
                          {message.role === 'user' && isLastUserMessage && (
                            <button
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditContent(message.content);
                              }}
                              className="p-1 text-gray-500 hover:text-white transition-colors"
                              title="Edit and resend"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          {/* Branch button */}
                          {message.role === 'user' && (
                            <button
                              onClick={() => branchConversation(message.id)}
                              className="p-1 text-gray-500 hover:text-white transition-colors"
                              title="Continue from here as new chat"
                            >
                              <GitBranch size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit mode for user messages */}
                      {editingMessageId === message.id ? (
                        <div className="mt-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={async () => {
                                await editLastMessage(editContent);
                                setEditingMessageId(null);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-200">
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
                                        className="max-w-xs max-h-48 rounded-lg border border-gray-700"
                                      />
                                    ) : (
                                      <div key={idx} className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
                                        <FileText size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-300">{att.name}</span>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                              <div className="whitespace-pre-wrap text-gray-100">
                                {message.content}
                              </div>
                            </div>
                          ) : (
                            <MarkdownRenderer content={message.content} />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="sticky bottom-0 z-10 border-t border-gray-800 p-4 bg-gray-900">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="mb-2">
              <AttachmentInput
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>
          )}
          {/* Skill Picker */}
          {skills.filter(s => s.enabled ?? true).length > 0 && (
            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-600 mr-1">Skills:</span>
              <button
                onClick={() => setSettings(s => ({ ...s, activeSkillId: null }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  !activeSkill
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                None
              </button>
              {skills.filter(s => s.enabled ?? true).map(skill => (
                <button
                  key={skill.id}
                  title={skill.description}
                  onClick={() =>
                    setSettings(s => ({
                      ...s,
                      activeSkillId: s.activeSkillId === skill.id ? null : skill.id,
                    }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    activeSkill?.id === skill.id
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <span>{skill.icon}</span>
                  <span>{skill.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
            <div className="flex items-center gap-1 pb-1">
              <button
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Add image"
                onClick={() => document.getElementById('image-input')?.click()}
              >
                <Image size={16} />
              </button>
              <button
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Add file"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <FileText size={16} />
              </button>
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
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none min-h-[24px] max-h-[200px]"
              disabled={!activeModel}
            />
            {isLoading ? (
              <button
                onClick={stopStreaming}
                className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors shrink-0"
                title="Stop generating"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!activeModel || (!input.trim() && attachments.length === 0)}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors shrink-0"
                title="Send message (Ctrl+Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          {/* Keyboard shortcuts hint */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <span>?????? History ??? Ctrl+Enter Send ??? Esc Close</span>
            {inputHistory.length > 0 && (
              <span>{inputHistory.length} saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Auto-scroll floating button */}
      {showNewMessages && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowNewMessages(false);
          }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-full shadow-lg transition-all animate-bounce"
        >
          <ChevronDown size={14} />
          New messages
        </button>
      )}

      {/* Editing title inline */}
      {editingTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 w-80">
            <h3 className="text-white font-medium mb-3">Rename Conversation</h3>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
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
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
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

