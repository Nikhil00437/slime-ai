import React, { useState } from 'react';
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
} from 'lucide-react';

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
  } = useAppContext();

  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(providers.map((p) => p.id))
  );
  const [searchQuery, setSearchQuery] = useState('');

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

  const groupedModels: Record<string, typeof allModels> = {};
  filteredModels.forEach((m) => {
    if (!groupedModels[m.provider]) groupedModels[m.provider] = [];
    groupedModels[m.provider].push(m);
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
                  <span className="text-2xl">⚡</span> MultiModel
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
              <SettingsPanel onBack={() => setShowSettings(false)} />
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
                          provider.models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => setActiveModel(model)}
                              className={`w-full text-left px-3 py-2 ml-4 rounded-md text-sm transition-colors truncate ${
                                activeModel?.id === model.id
                                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                  : 'text-gray-300 hover:bg-gray-800'
                              }`}
                            >
                              {model.name}
                            </button>
                          ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Conversations List */}
                <div className="border-t border-gray-800">
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recent Chats
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-60">
                    {conversations.length === 0 ? (
                      <p className="text-sm text-gray-600 px-3 py-4 text-center">
                        No conversations yet
                      </p>
                    ) : (
                      conversations.slice(0, 20).map((conv) => (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 mx-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            activeConversationId === conv.id
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                          }`}
                        >
                          <button
                            onClick={() => setActiveConversation(conv.id)}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <MessageSquare size={14} className="shrink-0" />
                            <span className="truncate text-sm">{conv.title}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
