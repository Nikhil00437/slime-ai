import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { SettingsPanel } from './SettingsPanel';
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  Cpu,
  Bot,
  Globe,
  Search,
  Pin,
  Star,
  MoreVertical,
  Copy,
  GitBranch,
  Pencil,
  Download,
  X,
  Sliders,
  Library,
} from 'lucide-react';

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
          <p className="text-gray-500 text-sm mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
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
    setSettings,
    togglePinConversation,
    duplicateConversation,
    renameConversation,
    branchConversation,
    exportConversation,
    addQuickPrompt,
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
  const [swipedConvId, setSwipedConvId] = useState<string | null>(null);
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
    openrouter: 'text-blue-400',
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
        className={`fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-gray-950 border-r border-gray-800 transition-all duration-300 ${
          isSidebarOpen ? 'w-80' : 'w-0 lg:w-16'
        } overflow-hidden`}
      >
        {!isSidebarOpen ? (
          /* Collapsed sidebar */
          <div className="w-16 flex flex-col items-center h-full min-w-[64px]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 mt-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Open sidebar"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => createConversation()}
              className="p-3 mt-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="New chat"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 mt-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full min-w-[320px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-cover" /> Slime AI
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSettings
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <ChevronDown size={18} className="rotate-90" />
                  </button>
                </div>
              </div>

              {/* New Chat Button */}
              <button
                onClick={() => createConversation()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                New Chat
              </button>
            </div>

            {showSettings ? (
              <div className="flex-1 overflow-hidden">
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                              <span className="text-xs font-semibold text-gray-400">
                                {provider.name}
                              </span>
                            </div>
                            {models.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => setActiveModel(model)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate ${
                                  activeModel?.id === model.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-300 hover:bg-gray-800'
                                }`}
                              >
                                {model.name}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      {Object.keys(groupedModels).length === 0 && (
                        <p className="text-sm text-gray-500 px-3 py-2">No models found</p>
                      )}
                    </div>
                  ) : (
                    /* Provider groups */
                    providers.map((provider) => (
                      <div key={provider.id} className="mb-1">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleProvider(provider.id)}
                            className="flex-1 flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className={providerColors[provider.id]}>
                                {providerIcons[provider.id]}
                              </span>
                              <span>{provider.name}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${statusColors[provider.status]}`}
                              />
                              <span className="text-gray-600">
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
                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
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
                                className={`w-full text-left px-3 py-2 ml-4 rounded-md text-sm transition-colors truncate flex items-center gap-2 ${
                                  activeModel?.id === model.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-300 hover:bg-gray-800'
                                }`}
                              >
                                {model.name}
                                {isFavorite && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                                {isRecent && !isFavorite && <span className="text-xs text-gray-600">recent</span>}
                              </button>
                            );
                          })}
                      </div>
                    ))
                  )}
                </div>

                {/* Conversations List */}
                <div className="border-t border-gray-800">
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => toggleSection('conversations')}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400"
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
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title="Export all data"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
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
                        <p className="text-sm text-gray-600 px-3 py-4 text-center">
                          No conversations yet
                        </p>
                      ) : (
                        sortedConversations.slice(0, 20).map((conv) => (
                          <div
                            key={conv.id}
                            className={`group flex items-center gap-2 mx-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              activeConversationId === conv.id
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                            } ${conv.isPinned ? 'bg-gray-800/30' : ''} ${swipedConvId === conv.id ? 'bg-red-900/30' : ''}`}
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
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
                              {conv.isPinned && <Pin size={10} className="text-blue-400 shrink-0" />}
                              <MessageSquare size={14} className="shrink-0" />
                              <span className="truncate text-sm">{conv.title}</span>
                            </button>
                            
                            {/* Conversation menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowConvMenuId(showConvMenuId === conv.id ? null : conv.id);
                                }}
                                className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all"
                              >
                                <MoreVertical size={12} />
                              </button>
                              
                              {showConvMenuId === conv.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowConvMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-32">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        duplicateConversation(conv.id);
                                        setShowConvMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded-t-lg"
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
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                    >
                                      <Pencil size={12} /> Rename
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePinConversation(conv.id);
                                        setShowConvMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                    >
                                      <Pin size={12} /> {conv.isPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        branchConversation(conv.messages[0]?.id || conv.id);
                                        setShowConvMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                                    >
                                      <GitBranch size={12} /> Branch
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        exportConversation(conv.id, 'markdown');
                                        setShowConvMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
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
                        ))
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
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 w-72">
              <h3 className="text-white text-sm font-medium mb-3">Rename Chat</h3>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
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
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingConvId(null)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
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
