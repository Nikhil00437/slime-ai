import React, { useEffect, useRef, useState } from 'react';
import { ModelInfo, DEFAULT_SKILLS, Skill } from '../types';
import { useAppContext } from '../store/AppContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AttachmentInput, Attachment, getCapabilityFilters, filterModelsByCapabilities } from './AttachmentInput';
import { calculateMessageCost, formatCost, formatTokenCount } from '../api/pricing';
import { SkillQuickAccessBar, getPinnedSkillIds } from './SkillQuickAccessBar';
import { SkillSuggestionBanner, getSuggestionReason } from './SkillSuggestionBanner';
import { detectSkillFromQuery, getAttachmentTypeFromList, CONFIDENCE_THRESHOLD } from '../utils/skillDetection';
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
  Download,
  Copy as CopyIcon,
  GitBranch,
  Pin,
  X,
  Library,
  ChevronUp,
  Trash2,
  Pencil,
  Terminal,
} from 'lucide-react';
import { LoopControlPanel } from './LoopControlPanel';

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

  // Skill Quick Access state
  const [pinnedSkillIds] = useState<string[]>(() => getPinnedSkillIds());
  const [activeSkillForBar, setActiveSkillForBar] = useState<string | null>(null);
  const [suggestedSkill, setSuggestedSkill] = useState<Skill | null>(null);
  const [suggestionConfidence, setSuggestionConfidence] = useState(0);
  const [suggestionReason, setSuggestionReason] = useState('');

  // Persist agent steps collapse state
  useEffect(() => {
    localStorage.setItem('mm_agent_steps_collapsed', JSON.stringify(agentStepsCollapsed));
  }, [agentStepsCollapsed]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Skill auto-detection and suggestion when input changes
  useEffect(() => {
    if (!input.trim() || input.length < 5) {
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
    if (!trimmed && attachments.length === 0 || isLoading || !activeModel) return;
    
    // Clear draft on send
    if (activeConversationId) {
      localStorage.removeItem(`mm_draft_${activeConversationId}`);
    }
    
    // Add to input history
    if (!trimmed && attachments.length === 0 || isLoading || !activeModel) return;
    
    // Auto-create conversation if none exists
    if (!activeConversation) {
      createConversation(activeModel.id, activeModel.provider);
    }
    
    // Add to input history
    addToInputHistory(trimmed);
    
    setInput('');
    // Reset history navigation on new message
    const currentAttachments = [...attachments];
    setAttachments([]);
    await sendMessage(trimmed, currentAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow up - cycle through input history
    if (e.key === 'ArrowUp' && inputHistory.length > 0 && !showModelDropdown) {
      e.preventDefault();
      const newIndex = inputHistoryIndex < inputHistory.length - 1 ? inputHistoryIndex + 1 : inputHistoryIndex;
      setInput(inputHistory[newIndex] || '');
      return;
    }
    
    // Arrow down - cycle through input history
    if (e.key === 'ArrowDown' && inputHistoryIndex > 0) {
      e.preventDefault();
      const newIndex = inputHistoryIndex - 1;
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
      _setShowMessageMenu(null);
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

  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
      {/* Chat Header - Sticky at top */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
<button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors focus-ring-a11y"
            title="Toggle sidebar"
          >
          <Menu size={20} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors w-full min-w-0 hover-lift focus-ring-a11y"
          >
            {currentProvider && (
              <span className={providerColors[currentProvider.id]}>
                {providerIcons[currentProvider.id]}
              </span>
            )}
            <span className="text-sm text-white font-medium truncate">
              {activeModel?.name || 'Select a model...'}
            </span>
            {/* Show capability badges for active model */}
            {activeModel && (
              <div className="flex items-center gap-1 shrink-0">
                {activeModel.capabilities?.image && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded" title="Supports images">🖼️</span>
                )}
                {activeModel.capabilities?.audio && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded" title="Supports audio">🔊</span>
                )}
                {activeModel.capabilities?.video && (
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1 py-0.5 rounded" title="Supports video">🎬</span>
                )}
                {activeModel.capabilities?.fileUpload && (
                  <span className="text-[10px] bg-green-500/20 text-green-300 px-1 py-0.5 rounded" title="Supports files">📁</span>
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
              <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 dropdown-animate">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-gray-800">
                  <input
                    type="text"
                    placeholder="Filter models..."
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Favorites Section */}
                {settings.favoriteModels.length > 0 && (
                  <div className="border-b border-gray-800">
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
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-300 hover:bg-gray-800'
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
                  <div className="border-b border-gray-800">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Clock size={12} className="text-blue-400" />
                      <span className="text-xs font-semibold text-blue-400">Recent</span>
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
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          <Clock size={10} className="text-gray-500" />
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {hasCapFilter && (
                  <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-blue-400 font-medium">
                      Filtering by:
                    </span>
                    {capFilters.image && <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">🖼️ Image</span>}
                    {capFilters.audio && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">🔊 Audio</span>}
                    {capFilters.video && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">🎬 Video</span>}
                    {capFilters.fileUpload && <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">📁 Files</span>}
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
                        <span className="text-xs font-semibold text-gray-400">
                          {provider.name}
                        </span>
                        <span className="text-xs text-gray-600">({providerModels.length})</span>
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
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-300 hover:bg-gray-800'
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

        {/* Temperature Slider */}
        <div className="relative">
          <button
            onClick={() => setShowTemperature(!showTemperature)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={`Temperature: ${settings.temperature}`}
          >
            <span className="text-xs font-mono">{settings.temperature.toFixed(1)}</span>
          </button>
          {showTemperature && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemperature(false)} />
              <div className="absolute top-full right-0 mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Temperature</span>
                  <span className="text-xs text-white font-mono">{settings.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-600">Precise</span>
                  <span className="text-[10px] text-gray-600">Balanced</span>
                  <span className="text-[10px] text-gray-600">Creative</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* System Prompt Preview */}
        <div className="relative">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="View system prompt"
          >
            <Sparkles size={14} />
          </button>
          {showSystemPrompt && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSystemPrompt(false)} />
              <div className="absolute top-full right-0 mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-w-64">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <span className="text-xs font-semibold text-gray-300">System Prompt</span>
                </div>
                <p className="text-xs text-gray-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {settings.systemPrompt}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

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
            
            {/* Token count toggle */}
            <button
              onClick={() => setSettings(s => ({ ...s, showCostEstimate: !s.showCostEstimate }))}
              className={`p-1.5 rounded transition-colors ${settings.showCostEstimate ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
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
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={activeConversation?.memoryEnabled ? 'Memory enabled for this conversation' : 'Enable memory for this conversation'}
            >
              <Brain size={14} />
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
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 backdrop-blur-md rounded-full text-xs text-blue-300 shadow-xl pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Agent Step {activeConversation?.agentSteps?.length || 1}: {activeTools.join(', ')}...</span>
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
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {prov?.name}
                            {isRecent && (
                              <span className="text-blue-400">• Recent</span>
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
                  className={`flex gap-4 px-4 py-4 group relative animate-message-bubble ${
                    message.role === 'user' ? 'chat-bubble-user' : message.role === 'tool' ? 'chat-bubble-tool' : 'chat-bubble-assistant'
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
                          {settings.showTimestamps && (
                            <span className="text-xs text-gray-600">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                          {message.responseTime && message.role === 'assistant' && (
                            <span className="text-xs text-gray-600">
                              ({Math.round(message.responseTime / 1000)}s)
                            </span>
                          )}
                          {/* Token count and cost */}
                          {message.usage && message.role === 'assistant' && settings.showCostEstimate && (
                            <span className="text-xs text-gray-600">
                              {formatTokenCount(message.usage.totalTokens)} tokens • {formatCost(calculateMessageCost(message.provider, message.model, message.usage))}
                            </span>
                          )}
                          {message.isStreaming && (
                            <span className="flex items-center gap-1 text-xs text-blue-400">
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse streaming-glow" />
                              typing...
                            </span>
                          )}
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
 
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => copyMessageToClipboard(message.content)}
                                className="p-1 text-gray-500 hover:text-white transition-colors copy-button focus-ring-a11y"
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
                                className="p-1 text-gray-500 hover:text-white transition-colors"
                                title="Edit and resend"
                              >
                                <Edit3 size={12} />
                              </button>
                            )}
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
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Collapsible Agent Steps Section */}
        {activeConversation?.agentSteps && activeConversation.agentSteps.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-800">
            <button
              onClick={() => setAgentStepsCollapsed(!agentStepsCollapsed)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300"
            >
              {agentStepsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>Agent Steps ({activeConversation.agentSteps.length})</span>
            </button>
            {!agentStepsCollapsed && (
              <div className="mt-2 space-y-2">
                {activeConversation.agentSteps.map((step, idx) => (
                  <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-400 mb-2">
                      Step {step.stepNumber}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">
                      Tools: {step.toolCalls.map(tc => tc.function.name).join(', ')}
                    </div>
                    {step.toolResults.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                          Results ({step.toolResults.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {step.toolResults.map((result, rIdx) => (
                            <div key={rIdx} className="text-xs text-gray-600 font-mono bg-black/40 p-2 rounded max-h-24 overflow-y-auto">
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
      <div className="sticky bottom-0 z-10 border-t border-gray-800 p-4 bg-gray-900">
        <div className="max-w-3xl mx-auto">
          {/* Skill Suggestion Banner - shown when skill detected but below auto-threshold */}
          {suggestedSkill && (
            <SkillSuggestionBanner
              skill={suggestedSkill}
              confidence={suggestionConfidence}
              reason={suggestionReason}
              onAccept={() => {
                setActiveSkillForBar(suggestedSkill.id);
                setSuggestedSkill(null);
              }}
              onDismiss={() => {
                setSuggestedSkill(null);
              }}
            />
          )}

          {/* Skill Quick Access Bar */}
          <SkillQuickAccessBar
            skills={DEFAULT_SKILLS as Skill[]}
            activeSkillId={activeSkillForBar}
            onSkillToggle={(skillId) => {
              setActiveSkillForBar(skillId);
              setSuggestedSkill(null);
            }}
            pinnedSkillIds={pinnedSkillIds}
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
            className={`flex items-end gap-2 bg-gray-800 border rounded-xl px-3 py-2 transition-all duration-300 ${
              attachments.length > 0 
                ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
                : 'border-gray-700 focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/20'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-blue-500', 'shadow-lg', 'shadow-blue-500/20');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-500', 'shadow-lg', 'shadow-blue-500/20');
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-blue-500', 'shadow-lg', 'shadow-blue-500/20');
              
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
              <button
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors btn-press"
                title="Add image"
                onClick={() => document.getElementById('image-input')?.click()}
              >
                <Image size={16} />
              </button>
              <button
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors btn-press"
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
            {input.length > 200 && (
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className={`p-1.5 rounded transition-colors btn-press ${showMarkdownPreview ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                title={showMarkdownPreview ? 'Edit' : 'Preview'}
              >
                <span className="text-xs">{showMarkdownPreview ? '✏️' : '👁️'}</span>
              </button>
            )}
            {/* Character count for long inputs */}
            {input.length > 500 && (
              <span className={`text-xs font-mono ${input.length > 4000 ? 'text-red-400' : 'text-gray-500'}`}>
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
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
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
              <div className="flex-1 min-h-[60px] max-h-[200px] overflow-y-auto bg-gray-900 rounded-lg px-3 py-2 text-gray-200 text-sm whitespace-pre-wrap">
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
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none min-h-[24px] max-h-[200px]"
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
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors shrink-0 btn-press ripple ripple-blue disabled:btn-press:scale-100 focus-ring-a11y"
                title="Send message (Ctrl+Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          {/* Enhanced Keyboard shortcuts hint */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd>
                <span className="text-gray-500 ml-1">History</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">↵</kbd>
                <span className="text-gray-500 ml-1">Send</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">Esc</kbd>
                <span className="text-gray-500 ml-1">Close</span>
              </span>
            </div>
            {inputHistory.length > 0 && (
              <span className="text-gray-500">{inputHistory.length} saved</span>
            )}
          </div>

          {/* Loop Control Panel */}
          {showLoopPanel && settings.loopEnabled && (
            <div className="mt-3 pt-3 border-t border-gray-700">
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