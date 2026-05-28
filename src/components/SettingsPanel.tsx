import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { RotateCw, Cpu, Bot, Globe, Eye, EyeOff, ArrowLeft, FolderOpen, RefreshCw, Link, Unlink, Brain, Shield, Clock, DollarSign, Hash, RotateCcw, Library, Wrench, CheckSquare, Square, Info, X, BarChart3, ChevronRight, Terminal, Play, Pause } from 'lucide-react';
import { TOOL_SETTINGS } from '../types';
import { VaultBrowserStatus } from './VaultBrowserStatus';
import { VaultMigrationTool } from './VaultMigrationTool';

// Helper components for tool settings
const WebToolItem = ({ toolName }: { toolName: string }) => {
  return <ToolSettingsItem toolName={toolName} />;
};

const UtilityToolItem = ({ toolName }: { toolName: string }) => {
  return <ToolSettingsItem toolName={toolName} />;
};

const FileSystemToolItem = ({ toolName }: { toolName: string }) => {
  return <ToolSettingsItem toolName={toolName} />;
};

const ToolSettingsItem = ({ toolName }: { toolName: string }) => {
  const { toolSettings, toggleTool } = useAppContext();
  const toolInfo = TOOL_SETTINGS[toolName];
  if (!toolInfo) return null;
  
  return (
    <div className="flex items-center justify-between bg-dark-700/30 p-2 rounded-lg border border-dark-600/20">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-dark-300 font-mono">{toolName}</div>
        <div className="text-xs text-dark-500 truncate">{toolInfo.description}</div>
      </div>
      <button
        onClick={() => toggleTool(toolName)}
        className={`p-1.5 rounded transition-colors btn-press ${
          toolSettings.enabledTools[toolName] 
            ? 'text-slime-400 hover:bg-slime-500/10' 
            : 'text-dark-600 hover:bg-dark-700/40'
        }`}
        title={toolSettings.enabledTools[toolName] ? 'Disable' : 'Enable'}
      >
        {toolSettings.enabledTools[toolName] ? (
          <CheckSquare size={18} />
        ) : (
          <Square size={18} />
        )}
      </button>
    </div>
  );
};

export const SettingsPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const {
    providers,
    setProviders,
    settings,
    setSettings,
    detectModels,
    clearAllConversations,
    vault,
    connectVault,
    disconnectVault,
    syncConversations,
    hasFileSystemAccess: checkFileSystemAccess,
    userMemory,
    updateUserMemory,
    saveApiKeyToVault,
    toolSettings,
    toggleTool,
    resetToolSettings,
  } = useAppContext();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [localKeys, setLocalKeys] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    providers.forEach((p) => {
      init[p.id] = p.apiKey || '';
    });
    return init;
  });

  const [memoryText, setMemoryText] = useState<string>(
    userMemory?.facts?.join('\n') || ''
  );

  React.useEffect(() => {
    if (userMemory?.facts) {
      setMemoryText(userMemory.facts.join('\n'));
    }
  }, [userMemory]);

  const [keySaved, setKeySaved] = useState(false);

  const statusColors: Record<string, string> = {
    connected: 'bg-slime-500',
    disconnected: 'bg-red-500',
    checking: 'bg-yellow-500 animate-pulse',
  };

  const statusText: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    checking: 'Checking...',
  };

  const providerIcons: Record<string, React.ReactNode> = {
    ollama: <Cpu size={20} />,
    lmstudio: <Bot size={20} />,
    openrouter: <Globe size={20} />,
    openai: <Brain size={20} />,
    anthropic: <Brain size={20} />,
    gemini: <Brain size={20} />,
    grok: <Brain size={20} />,
  };

  const providerDescriptions: Record<string, string> = {
    ollama: 'Auto-detects models running locally via Ollama',
    lmstudio: 'Auto-detects models running locally via LM Studio',
    openrouter: 'Access 100+ models via OpenRouter API (requires API key)',
    openai: 'GPT-4, GPT-4o, o1, o3 models from OpenAI (requires API key)',
    anthropic: 'Claude 3.5/3.7 Sonnet, Opus, Haiku models (requires API key)',
    gemini: 'Gemini 2.0, 1.5 Pro/Flash from Google (requires API key)',
    grok: 'Grok 2, Grok 2 Vision from xAI (requires API key)',
  };

  const handleSaveApiKey = async (providerId: string) => {
    const key = localKeys[providerId] || '';
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, apiKey: key } : p))
    );
    if (vault.vaultConnected) {
      await saveApiKeyToVault(providerId, key);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    }
    setTimeout(() => detectModels(providerId as any), 100);
  };

  const handleSaveMemory = async () => {
    const facts = memoryText.split('\n').filter((f) => f.trim());
    await updateUserMemory({
      facts,
      preferences: userMemory?.preferences || {},
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to models
        </button>

        <h3 className="text-lg font-bold text-white">Settings</h3>

        {/* Obsidian Vault Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen size={16} />
            Obsidian Vault
          </h4>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${vault.vaultConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">
                  {vault.vaultConnected ? `Connected: ${vault.vaultName}` : 'Not connected'}
                </span>
              </div>
              {vault.lastSyncTime && (
                <span className="text-xs text-gray-500">
                  Last sync: {new Date(vault.lastSyncTime).toLocaleTimeString()}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Connect an Obsidian vault to save chats and memories as markdown files.
              Your vault will have <code className="bg-gray-800 px-1 rounded">chats/</code> and{' '}
              <code className="bg-gray-800 px-1 rounded">memory/</code> folders.
            </p>

            <VaultBrowserStatus />
            <VaultMigrationTool />

            {!checkFileSystemAccess() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                  File System Access API not supported. Using fallback storage (IndexedDB).
                  For full features, use Chrome, Brave, Edge, or Opera.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {vault.vaultConnected ? (
                <>
                  <button
                    onClick={syncConversations}
                    disabled={vault.isSyncing}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw size={12} className={vault.isSyncing ? 'animate-spin' : ''} />
                    {vault.isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={disconnectVault}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg font-medium transition-colors"
                  >
                    <Unlink size={12} />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connectVault}
                  disabled={!checkFileSystemAccess()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg font-medium transition-colors"
                >
                  <Link size={12} />
                  Connect Vault
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Memory Section */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-400" />
            <h5 className="text-sm font-semibold text-white">Long-term Memory</h5>
            {vault.vaultConnected && (
              <span className="text-xs text-green-400 ml-auto">Auto-save enabled</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Store facts about yourself that AI models will remember across conversations.
          </p>
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            placeholder="I am a software developer&#10;I prefer concise answers&#10;My favorite programming language is Python"
            rows={5}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
          <button
            onClick={handleSaveMemory}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg font-medium transition-colors"
          >
            Save Memory
          </button>
        </div>


        {/* Providers */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Providers
          </h4>
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-800 text-gray-300">
                    {providerIcons[provider.id]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{provider.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${statusColors[provider.status]}`}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{providerDescriptions[provider.id]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {statusText[provider.status]}
                  </span>
                  <button
                    onClick={() => detectModels(provider.id)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    title="Refresh"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>

              {(provider.id === 'openrouter' || provider.id === 'openai' || provider.id === 'anthropic' || provider.id === 'gemini' || provider.id === 'grok') && (
                <div className="space-y-2">
                  {vault.vaultConnected ? (
                    <>
                      <div className="relative">
                        <input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          placeholder={`Enter your ${provider.name} API key`}
                          value={localKeys[provider.id]}
                          onChange={(e) =>
                            setLocalKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                          }
                          className="w-full px-3 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          onClick={() =>
                            setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showKeys[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveApiKey(provider.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        Save & Detect Models
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-yellow-500">Connect vault to enable API key storage</p>
                  )}
                </div>
              )}

              {(provider.id === 'ollama' || provider.id === 'lmstudio') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">URL:</span>
                    <input
                      type="text"
                      value={provider.baseUrl}
                      onChange={(e) => {
                        setProviders((prev) =>
                          prev.map((p) =>
                            p.id === provider.id ? { ...p, baseUrl: e.target.value } : p
                          )
                        );
                      }}
                      className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => detectModels(provider.id)}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                  >
                    Refresh Models
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Chat Settings
          </h4>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-300">Temperature</label>
                <span className="text-sm text-blue-400 font-mono">
                  {settings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Custom System Prompt</label>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                placeholder="Add custom instructions to append to the AI's core instructions (e.g. 'Prefer TypeScript', 'Write concise code')..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1 leading-normal">
                These instructions are appended after the core Slime-AI guidelines to customize behavior.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Stream Responses</span>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    streamResponses: !prev.streamResponses,
                  }))
                }
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.streamResponses ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.streamResponses ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show Timestamps</span>
              <button
                onClick={() =>
                  setSettings((prev) => ({ ...prev, showTimestamps: !prev.showTimestamps }))
                }
                className={`w-10 h-5 rounded-full transition-colors ${
                  settings.showTimestamps ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.showTimestamps ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={16} />
            Tools
          </h4>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            <div className="space-y-2">
              <WebToolItem toolName="web_search" />
              <WebToolItem toolName="web_fetch" />
              <WebToolItem toolName="browser_navigate" />
              <WebToolItem toolName="browser_scrape" />
              <UtilityToolItem toolName="bash" />
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={() => {
                  const tools = Object.keys(TOOL_SETTINGS);
                  for (const t of tools) {
                    if (!toolSettings.enabledTools[t]) {
                      toggleTool(t);
                    }
                  }
                }}
                className="flex-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
              >
                Enable All
              </button>
              <button
                onClick={() => {
                  const tools = Object.keys(TOOL_SETTINGS);
                  for (const t of tools) {
                    if (toolSettings.enabledTools[t]) {
                      toggleTool(t);
                    }
                  }
                }}
                className="flex-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
              >
                Disable All
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
            Danger Zone
          </h4>
          <button
            onClick={() => {
              if (confirm('Clear all conversations? This cannot be undone.')) {
                clearAllConversations();
              }
            }}
            className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
          >
            Clear All Conversations
          </button>
        </div>
      </div>
    </div>
  );
};