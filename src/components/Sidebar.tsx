import React, { useState, useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { SettingsPanel } from './SettingsPanel';
import { Plus, MessageSquare, Trash2, ChevronDown, ChevronUp, Settings, Cpu, Bot, Globe, Search, Pin, Star, MoreVertical, Copy, GitBranch, Pencil, Download, } from 'lucide-react';
import logoUrl from '../assets/logo.jpg';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in SettingsPanel:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
          <p className="text-dark-500 text-sm mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-100 rounded-lg"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Sidebar: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeModel,
    setActiveConversation,
    deleteConversation,
    createConversation,
    setActiveModel,
    providers,
    isSidebarOpen,
    setIsSidebarOpen,
    showSettings,
    setShowSettings,
    detectModels,
    settings,
    togglePinConversation,
    duplicateConversation,
    renameConversation,
    branchConversation,
    exportConversation,
    importData,
    exportAllData,
  } = useAppContext();

  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    () => new Set(providers.map((p) => p.id))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showConvMenuId, setShowConvMenuId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipedConvId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleProvider = (id: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const providerIcons: Record<string, React.ReactNode> = {
    ollama: <Cpu size={16} />,
    lmstudio: <Bot size={16} />,
    openrouter: <Globe size={16} />,
  };

  const providerColors: Record<string, string> = {
    ollama: 'text-orange-400',
    lmstudio: 'text-purple-400',
    openrouter: 'text-cyan-400',
  };

  const statusColors: Record<string, string> = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    checking: 'bg-yellow-500 animate-pulse',
  };

  const allModels = providers.flatMap((p) => p.models);
  const filteredModels = searchQuery
    ? allModels.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allModels;

  // Sort models: favorites first, then recent, then rest
  const sortedModels = [...filteredModels].sort((a, b) => {
    const aFav = settings.favoriteModels.includes(a.id);
    const bFav = settings.favoriteModels.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    const aRecent = settings.recentModels.indexOf(a.id);
    const bRecent = settings.recentModels.indexOf(b.id);
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (aRecent === -1 && bRecent !== -1) return 1;
    return aRecent - bRecent;
  });

  const groupedModels: Record<string, typeof allModels> = {};
  sortedModels.forEach((m) => {
    if (!groupedModels[m.provider]) groupedModels[m.provider] = [];
    groupedModels[m.provider].push(m);
  });

  // Handle collapse toggle
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Sort conversations: pinned first, then by updatedAt
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-40 flex flex-col glass border-r border-slime-500/10 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 lg:w-16'
          } overflow-hidden`}
      >
        {!isSidebarOpen ? (
          /* Collapsed sidebar */
          <div className="w-16 flex flex-col items-center h-full min-w-[64px]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 mt-3 text-dark-500 hover:text-dark-100 hover:bg-dark-700/40 rounded-lg transition-colors"
              title="Open sidebar"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => createConversation()}
              className="p-3 mt-2 text-dark-500 hover:text-dark-100 hover:bg-dark-700/40 rounded-lg transition-colors"
              title="New chat"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 mt-2 text-dark-500 hover:text-dark-100 hover:bg-dark-700/40 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full min-w-[320px]">
            {/* Header */}
            <div className="p-4 border-b border-dark-700/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
                  <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-cover" /> Slime AI
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings
                        ? 'bg-dark-700/50 text-dark-100'
                        : 'text-dark-500 hover:text-dark-100 hover:bg-dark-700/40'
                      }`}
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-lg text-dark-500 hover:text-dark-100 hover:bg-dark-700/40 transition-colors"
                  >
                    <ChevronDown size={18} className="rotate-90" />
                  </button>
                </div>
              </div>

              {/* New Chat Button */}
              <button
                onClick={() => createConversation()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-dark-900 bg-gradient-to-r from-slime-500 to-teal-500 hover:from-slime-400 hover:to-teal-400 transition-all shadow-md shadow-slime-500/20 hover:shadow-slime-500/30 active:scale-[0.98]"
              >
                <Plus size={18} />
                New Chat
              </button>
            </div>

            {showSettings ? (
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary>
                  <SettingsPanel onBack={() => setShowSettings(false)} />
                </ErrorBoundary>
              </div>
            ) : (
              <>
                {/* Search Models */}
                <div className="px-4 py-2">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500"
                    />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-dark-900/70 border border-dark-700/40 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-slime-500/35"
                    />
                  </div>
                </div>

                {/* Model List */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {searchQuery ? (
                    /* Search results (flat) */
                    <div>
                      {Object.entries(groupedModels).map(([providerId, models]) => {
                        const provider = providers.find((p) => p.id === providerId);
                        if (!provider) return null;
                        return (
                          <div key={providerId} className="mb-2">
                            <div className="px-2 py-1.5 flex items-center gap-2">
                              <span className={providerColors[providerId]}>
                                {providerIcons[providerId]}
                              </span>
                              <span className="text-xs font-semibold text-dark-400">
                                {provider.name}
                              </span>
                            </div>
                            {models.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => setActiveModel(model)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate ${activeModel?.id === model.id
                                    ? 'bg-slime-500/12 text-slime-300 border border-slime-500/30'
                                    : 'text-dark-300 hover:bg-dark-700/40'
                                  }`}
                              >
                                {model.name}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      {Object.keys(groupedModels).length === 0 && (
                        <p className="text-sm text-dark-500 px-3 py-2">No models found</p>
                      )}
                    </div>
                  ) : (
                    /* Provider groups */
                    providers.map((provider) => (
                      <div key={provider.id} className="mb-1">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleProvider(provider.id)}
                            className="flex-1 flex items-center justify-between px-2 py-2 text-xs font-semibold text-dark-400 hover:text-dark-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className={providerColors[provider.id]}>
                                {providerIcons[provider.id]}
                              </span>
                              <span>{provider.name}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${statusColors[provider.status]}`}
                              />
                              <span className="text-dark-600">
                                ({provider.models.length})
                              </span>
                            </div>
                            {expandedProviders.has(provider.id) ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => detectModels(provider.id)}
                            className="p-1.5 text-dark-500 hover:text-dark-100 transition-colors"
                            title="Refresh"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                          </button>
                        </div>
                        {expandedProviders.has(provider.id) &&
                          provider.models.map((model) => {
                            const isFavorite = settings.favoriteModels.includes(model.id);
                            const isRecent = settings.recentModels.includes(model.id);
                            return (
                              <button
                                key={model.id}
                                onClick={() => setActiveModel(model)}
                                className={`w-full text-left px-3 py-2 ml-4 rounded-md text-sm transition-colors truncate flex items-center gap-2 ${activeModel?.id === model.id
                                    ? 'bg-slime-500/12 text-slime-300 border border-slime-500/30'
                                    : 'text-dark-300 hover:bg-dark-700/40'
                                  }`}
                              >
                                {model.name}
                                {isFavorite && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                                {isRecent && !isFavorite && <span className="text-xs text-dark-600">recent</span>}
                              </button>
                            );
                          })}
                      </div>
                    ))
                  )}
                </div>

                {/* Conversations List */}
                <div className="border-t border-dark-700/30">
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => toggleSection('conversations')}
                      className="flex items-center gap-2 text-xs font-semibold text-dark-500 uppercase tracking-wider hover:text-dark-300"
                    >
                      {collapsedSections.has('conversations') ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      Recent Chats
                    </button>
                    <div className="flex items-center gap-1">
                      {/* Import/Export buttons */}
                      <button
                        onClick={async () => {
                          const data = await exportAllData();
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Slime AI-backup-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="p-1 text-dark-500 hover:text-dark-100 transition-colors btn-press"
                        title="Export all data"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-dark-500 hover:text-dark-100 transition-colors btn-press"
                        title="Import data"
                      >
                        <Download size={12} className="rotate-180" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const text = await file.text();
                            await importData(text);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  {!collapsedSections.has('conversations') && (
                    <div className="flex-1 overflow-y-auto max-h-60 pb-2">
                      {sortedConversations.length === 0 ? (
                        <p className="text-sm text-dark-600 px-3 py-4 text-center">
                          No conversations yet
                        </p>
                      ) : (
                        sortedConversations.slice(0, 20).map((conv) => {
                          // Get last message preview
                          const lastMessage = conv.messages[conv.messages.length - 1];
                          const lastMessagePreview = lastMessage?.content
                            ? lastMessage.content.slice(0, 40).replace(/\n/g, ' ') + (lastMessage.content.length > 40 ? '...' : '')
                            : '';

                          // Relative time helper
                          const getRelativeTime = (timestamp: number) => {
                            const now = Date.now();
                            const diff = now - timestamp;
                            const minutes = Math.floor(diff / 60000);
                            const hours = Math.floor(diff / 3600000);
                            const days = Math.floor(diff / 86400000);

                            if (minutes < 1) return 'Just now';
                            if (minutes < 60) return `${minutes}m ago`;
                            if (hours < 24) return `${hours}h ago`;
                            if (days === 1) return 'Yesterday';
                            if (days < 7) return `${days}d ago`;
                            return new Date(timestamp).toLocaleDateString();
                          };

                          return (
                            <div
                              key={conv.id}
                              className={`group sidebar-item flex items-start gap-2 mx-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${activeConversationId === conv.id
                                  ? 'active text-dark-100'
                                  : 'text-dark-400 hover:text-dark-200'
                                } ${conv.isPinned ? 'bg-slime-500/5' : ''} ${swipedConvId === conv.id ? 'bg-red-900/30' : ''}`}
                              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                              onTouchEnd={(e) => {
                                if (touchStartX === null) return;
                                const deltaX = e.changedTouches[0].clientX - touchStartX;
                                if (deltaX < -50) {
                                  // Swipe left - delete
                                  deleteConversation(conv.id);
                                } else if (deltaX > 50) {
                                  // Swipe right - toggle pin
                                  togglePinConversation(conv.id);
                                }
                                setTouchStartX(null);
                              }}
                            >
                              <button
                                onClick={() => setActiveConversation(conv.id)}
                                className="flex-1 flex flex-col items-start gap-1 text-left min-w-0"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {conv.isPinned && <Pin size={10} className="text-amber-400 shrink-0" />}
                                  <MessageSquare size={14} className="shrink-0 mt-0.5" />
                                  <span className="truncate text-sm font-medium">{conv.title}</span>
                                </div>
                                {lastMessagePreview && (
                                  <span className="text-xs text-dark-500 truncate w-full pl-5">
                                    {lastMessagePreview}
                                  </span>
                                )}
                                <span className="text-[10px] text-dark-600 pl-5">
                                  {getRelativeTime(conv.updatedAt)} • {conv.messages.length} msgs
                                </span>
                              </button>
                              {/* Unread indicator (if new messages since last view) */}
                              {conv.messages.length > 0 && activeConversationId !== conv.id && (
                                <span className="w-2 h-2 bg-slime-500 rounded-full shrink-0 mt-2" />
                              )}

                              {/* Conversation menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowConvMenuId(showConvMenuId === conv.id ? null : conv.id);
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-dark-500 hover:text-dark-100 transition-all btn-press"
                                >
                                  <MoreVertical size={12} />
                                </button>

                                {showConvMenuId === conv.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowConvMenuId(null)} />
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-dark-800/95 backdrop-blur-xl border border-dark-700/40 rounded-lg shadow-xl min-w-32 dropdown-animate">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          duplicateConversation(conv.id);
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40 rounded-t-lg"
                                      >
                                        <Copy size={12} /> Duplicate
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingConvId(conv.id);
                                          setEditingTitle(conv.title);
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40"
                                      >
                                        <Pencil size={12} /> Rename
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePinConversation(conv.id);
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40"
                                      >
                                        <Pin size={12} /> {conv.isPinned ? 'Unpin' : 'Pin'}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          branchConversation(conv.messages[0]?.id || conv.id);
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40"
                                      >
                                        <GitBranch size={12} /> Branch
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportConversation(conv.id, 'markdown');
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700/40"
                                      >
                                        <Download size={12} /> Export
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteConversation(conv.id);
                                          setShowConvMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 rounded-b-lg"
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Inline editing for conversation title */}
        {editingConvId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-700/40 rounded-xl p-4 w-72">
              <h3 className="text-dark-100 text-sm font-medium mb-3">Rename Chat</h3>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700/50 rounded-lg px-3 py-2 text-dark-100 text-sm focus:outline-none focus:border-slime-500/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renameConversation(editingConvId, editingTitle);
                    setEditingConvId(null);
                  }
                  if (e.key === 'Escape') {
                    setEditingConvId(null);
                  }
                }}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    renameConversation(editingConvId, editingTitle);
                    setEditingConvId(null);
                  }}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-slime-500 to-teal-500 hover:from-slime-400 hover:to-teal-400 text-dark-900 text-xs rounded-lg font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingConvId(null)}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-100 text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
