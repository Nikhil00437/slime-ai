import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { RotateCw, Cpu, Bot, Globe, Eye, EyeOff, ArrowLeft, FolderOpen, RefreshCw, Link, Unlink, Brain, Shield, Clock, DollarSign, Hash, RotateCcw, Library, Wrench, CheckSquare, Square, Info, X, BarChart3, ChevronRight, Terminal, Play, Pause, AlertTriangle } from 'lucide-react';
import { TOOL_SETTINGS } from '../types';
import { AnalyticsDashboard } from './AnalyticsDashboard';

// Helper components for tool settings
const WebToolItem = ({ toolName }: { toolName: string }) => {
  return (
    <ToolSettingsItem toolName={toolName} />
  );
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
    <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-300 font-mono">{toolName}</div>
        <div className="text-xs text-gray-500 truncate">{toolInfo.description}</div>
      </div>
      <button
        onClick={() => toggleTool(toolName)}
        className={`p-1.5 rounded transition-colors btn-press ${
          toolSettings.enabledTools[toolName] 
            ? 'text-green-400 hover:bg-green-900/30' 
            : 'text-gray-600 hover:bg-gray-700'
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

  // Update memory text when userMemory changes
  React.useEffect(() => {
    if (userMemory?.facts) {
      setMemoryText(userMemory.facts.join('\n'));
    }
  }, [userMemory]);

  const [keySaved, setKeySaved] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const statusColors: Record<string, string> = {
    connected: 'bg-green-500',
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

            {!checkFileSystemAccess() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                  File System Access API not supported in this browser. Please use Chrome or Edge for vault features.
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

          {/* Vault .env Section */}
          {vault.vaultConnected && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-green-400" />
                <h5 className="text-sm font-semibold text-white">API Keys (Stored in Vault)</h5>
                {keySaved && (
                  <span className="text-xs text-green-400 animate-pulse">Saved!</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                API keys are saved to <code className="bg-gray-800 px-1 rounded">.env</code> in your vault root.
                This keeps your secrets private and synced across devices.
              </p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Keys are encrypted and stored securely in your vault
                </div>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" />
                <h5 className="text-sm font-semibold text-white">Skill Analytics</h5>
              </div>
              <ChevronRight
                size={16}
                className={`text-gray-500 transition-transform ${showAnalytics ? 'rotate-90' : ''}`}
              />
            </button>
            {showAnalytics && (
              <div className="mt-3">
                <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
              </div>
            )}
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
              {!vault.vaultConnected && ' Connect a vault to enable auto-saving.'}
            </p>
            {userMemory?.facts && userMemory.facts.length > 0 && (
              <div className="text-xs text-gray-400">
                <span className="text-purple-400">{userMemory.facts.length}</span> facts stored
              </div>
            )}
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
                  {!vault.vaultConnected && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 flex items-center gap-2">
                        <Shield size={14} />
                        {provider.name} requires vault connection for secure key storage
                      </p>
                      <button
                        onClick={connectVault}
                        disabled={!checkFileSystemAccess()}
                        className="mt-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        Connect Vault First
                      </button>
                    </div>
                  )}
                  {vault.vaultConnected && (
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveApiKey(provider.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition-colors"
                        >
                          Save to Vault & Detect Models
                        </button>
                        {provider.id === 'openai' && (
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Get API Key →
                          </a>
                        )}
                        {provider.id === 'anthropic' && (
                          <a
                            href="https://console.anthropic.com/settings/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Get API Key →
                          </a>
                        )}
                        {provider.id === 'gemini' && (
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Get API Key →
                          </a>
                        )}
                        {provider.id === 'grok' && (
                          <a
                            href="https://console.x.ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Get API Key →
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Key will be stored in <code className="bg-gray-800 px-1 rounded">.env</code> in your vault (not in browser)
                      </p>
                    </>
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
                  {provider.id === 'lmstudio' && provider.status === 'disconnected' && (
                    <p className="text-xs text-yellow-500">
                      Make sure LM Studio has "Enable Local Server" checked
                    </p>
                  )}
                  {provider.id === 'ollama' && provider.status === 'disconnected' && (
                    <p className="text-xs text-yellow-500">
                      Make sure Ollama is running: <code className="bg-gray-800 px-1 rounded">ollama serve</code>
                    </p>
                  )}
                </div>
              )}

              {provider.models.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">
                    {provider.models.length} model{provider.models.length > 1 ? 's' : ''} detected
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {provider.models.slice(0, 5).map((m) => (
                      <span
                        key={m.id}
                        className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full"
                      >
                        {m.name.length > 25 ? m.name.slice(0, 25) + '...' : m.name}
                      </span>
                    ))}
                    {provider.models.length > 5 && (
                      <span className="text-xs text-gray-500">+{provider.models.length - 5} more</span>
                    )}
                  </div>
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
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Precise (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-300">Max Tokens</label>
                <span className="text-sm text-blue-400 font-mono">{settings.maxTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="131072"
                step="256"
                value={settings.maxTokens}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value),
                  }))
                }
                className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">System Prompt</label>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
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

            {/* New Settings: Toggles */}
            <div className="space-y-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Show Timestamps</span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      showTimestamps: !prev.showTimestamps,
                    }))
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    settings.showTimestamps ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showTimestamps ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Show Token Count</span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      showTokenCount: !prev.showTokenCount,
                    }))
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    settings.showTokenCount ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showTokenCount ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Show Cost Estimate</span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      showCostEstimate: !prev.showCostEstimate,
                    }))
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    settings.showCostEstimate ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showCostEstimate ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Auto-retry Failed Requests</span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      autoRetry: !prev.autoRetry,
                    }))
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    settings.autoRetry ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.autoRetry ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Quick Prompts Section */}
            <div className="space-y-2 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Library size={14} className="text-gray-400" />
                  Quick Prompts
                </h5>
                <button
                  onClick={() => {
                    const name = prompt('Prompt name:');
                    if (name) {
                      const content = prompt('Prompt content:');
                      if (content) {
                        // Access addQuickPrompt from context
                        (window as any).__addQuickPrompt?.(name, content);
                      }
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Add
                </button>
              </div>
              {settings.quickPrompts.length === 0 ? (
                <p className="text-xs text-gray-500">No quick prompts saved</p>
              ) : (
                <div className="space-y-1">
                  {settings.quickPrompts.map(prompt => (
                    <div key={prompt.id} className="flex items-center justify-between text-xs bg-gray-800 px-2 py-1.5 rounded">
                      <span className="text-gray-300">{prompt.name}</span>
                      <button
                        onClick={() => (window as any).__removeQuickPrompt?.(prompt.id)}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loop Execution Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal size={16} />
            Loop Execution
          </h4>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            {/* Enable Loop */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-300">Enable Loop Mode</div>
                <div className="text-xs text-gray-500">Run iterative tasks with configurable stop conditions</div>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, loopEnabled: !prev.loopEnabled }))}
                className={`p-2 rounded-lg transition-colors ${
                  settings.loopEnabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {settings.loopEnabled ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>

            {settings.loopEnabled && (
              <>
                {/* Loop Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Iterations</label>
                    <input
                      type="number"
                      value={settings.loopConfig.maxIterations}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        loopConfig: { ...prev.loopConfig, maxIterations: Math.max(1, parseInt(e.target.value) || 1) }
                      }))}
                      min={1}
                      max={100}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={settings.loopConfig.iterationTimeout / 1000}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        loopConfig: { ...prev.loopConfig, iterationTimeout: Math.max(1000, (parseInt(e.target.value) || 30) * 1000) }
                      }))}
                      min={1}
                      max={300}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                    />
                  </div>
                </div>

                {/* Stop Condition */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stop Condition</label>
                  <select
                    value={settings.loopConfig.stopCondition}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      loopConfig: { ...prev.loopConfig, stopCondition: e.target.value as LoopConfig['stopCondition'] }
                    }))}
                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                  >
                    <option value="manual">Manual (click stop)</option>
                    <option value="maxIterations">Max Iterations</option>
                    <option value="keyword">Keyword Detection</option>
                    <option value="threshold">Threshold (tool results)</option>
                  </select>
                </div>

                {/* Conditional fields */}
                {settings.loopConfig.stopCondition === 'keyword' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stop Keyword</label>
                    <input
                      type="text"
                      value={settings.loopConfig.stopKeyword || ''}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        loopConfig: { ...prev.loopConfig, stopKeyword: e.target.value }
                      }))}
                      placeholder="e.g., DONE, COMPLETE"
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                    />
                  </div>
                )}

                {settings.loopConfig.stopCondition === 'threshold' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stop Threshold</label>
                    <input
                      type="number"
                      value={settings.loopConfig.stopThreshold || 0}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        loopConfig: { ...prev.loopConfig, stopThreshold: Math.max(0, parseInt(e.target.value) || 0) }
                      }))}
                      min={0}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                    />
                  </div>
                )}

                {/* Auto-continue */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoContinue"
                      checked={settings.loopConfig.autoContinueOnToolResult}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        loopConfig: { ...prev.loopConfig, autoContinueOnToolResult: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800"
                    />
                    <label htmlFor="autoContinue" className="text-xs text-gray-400">
                      Auto-continue on tool result
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tool Execution Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={16} />
            Tool Execution
          </h4>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
            {/* Timeout and retries */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  value={Math.round(((settings.toolSettings && settings.toolSettings.timeout) ? settings.toolSettings.timeout : 60000) / 1000)}
                  onChange={e => {
                    const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                    newSettings.timeout = Math.max(1000, parseInt(e.target.value) * 1000);
                    setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                  }}
                  min={1}
                  max={120}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
                <input
                  type="number"
value={(settings.toolSettings && settings.toolSettings.maxRetries) !== undefined ? settings.toolSettings.maxRetries : 3}
                  onChange={e => {
                    const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                    newSettings.maxRetries = Math.max(0, parseInt(e.target.value) || 0);
                    setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                  }}
                  min={0}
                  max={10}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
            </div>
            
            {/* Retry backoff and max concurrent */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Retry Backoff (ms)</label>
                <input
                  type="number"
value={(settings.toolSettings && settings.toolSettings.retryBackoff) !== undefined ? settings.toolSettings.retryBackoff : 1000}
                  onChange={e => {
                    const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                    newSettings.retryBackoff = Math.max(100, parseInt(e.target.value) || 1000);
                    setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                  }}
                  min={100}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Parallel</label>
                <input
                  type="number"
value={(settings.toolSettings && settings.toolSettings.maxConcurrent) !== undefined ? settings.toolSettings.maxConcurrent : 3}
                  onChange={e => {
                    const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                    newSettings.maxConcurrent = Math.max(1, parseInt(e.target.value) || 3);
                    setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                  }}
                  min={1}
                  max={10}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
            </div>
            
            {/* Stream results */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="streamResults"
checked={(settings.toolSettings && settings.toolSettings.streamResults) !== undefined ? settings.toolSettings.streamResults : true}
                onChange={e => {
                  const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                  newSettings.streamResults = e.target.checked;
                  setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800"
              />
              <label htmlFor="streamResults" className="text-xs text-gray-400">
                Stream tool results
              </label>
            </div>
            
            {/* Prompt permission */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              <input
                type="checkbox"
                id="promptPermission"
checked={(settings.toolSettings && settings.toolSettings.promptPermission) !== undefined ? settings.toolSettings.promptPermission : true}
                onChange={e => {
                  const newSettings = { ...(prev.toolSettings || { timeout: 60000, maxRetries: 3, retryBackoff: 1000, maxConcurrent: 3, streamResults: true, promptPermission: true }) };
                  newSettings.promptPermission = e.target.checked;
                  setSettings(prev => ({ ...prev, toolSettings: newSettings }));
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800"
              />
              <label htmlFor="promptPermission" className="text-xs text-gray-400">
                Prompt for approval on sensitive tools (bash, write, delete)
              </label>
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Enable or disable tools that AI models can use during conversations.
                Disabled tools won't be available to the model.
              </p>
              <button
                onClick={() => {
                  if (confirm('Reset all tools to enabled?')) {
                    resetToolSettings();
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-300"
                title="Reset to defaults"
              >
                <RotateCcw size={12} />
              </button>
            </div>
            
            {/* Category: Web */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <Globe size={12} />
                Web
              </div>
              <WebToolItem toolName="web_search" />
              <WebToolItem toolName="web_fetch" />
              <WebToolItem toolName="codesearch" />
            </div>
            
            {/* Category: Utility */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <Hash size={12} />
                Utility
              </div>
              <UtilityToolItem toolName="calculate" />
              <UtilityToolItem toolName="bash" />
            </div>
            
            {/* Category: Filesystem (vault required) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <FolderOpen size={12} />
                Filesystem {vault.vaultConnected ? '' : '(Vault Required)'}
              </div>
              {!vault.vaultConnected && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400 flex items-center gap-2">
                  <Info size={12} />
                  Connect an Obsidian vault to enable filesystem tools
                </div>
              )}
              {vault.vaultConnected && (
                <>
                  <FileSystemToolItem toolName="list_files" />
                  <FileSystemToolItem toolName="read_file" />
                  <FileSystemToolItem toolName="write_file" />
                  <FileSystemToolItem toolName="edit_file" />
                  <FileSystemToolItem toolName="mkdir" />
                  <FileSystemToolItem toolName="delete_file" />
                  <FileSystemToolItem toolName="delete_directory" />
                  <FileSystemToolItem toolName="search_in_file" />
                  <FileSystemToolItem toolName="get_file_info" />
                </>
              )}
            </div>
            
            {/* Enable All / Disable All */}
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
