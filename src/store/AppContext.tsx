import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Provider,
  ProviderType,
  ModelInfo,
  ChatMessage,
  Conversation,
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_PROVIDERS,
  Skill,
  DEFAULT_SKILLS,
} from '../types';
import {
  detectOllamaModels,
  detectLMStudioModels,
  detectOpenRouterModels,
  detectOpenAIModels,
  detectAnthropicModels,
  detectGeminiModels,
  detectGrokModels,
  checkProviderHealth,
  streamChatCompletion,
} from '../api/providers';
import { rateSkillPerformance } from '../api/skillRating';
import {
  selectVaultFolder,
  restoreVaultHandle,
  requestVaultPermission,
  saveConversationToVault,
  loadConversationsFromVault,
  deleteConversationFromVault,
  saveUserMemory,
  loadUserMemory,
  syncToVault,
  hasFileSystemAccess,
  isVaultConnected,
  getVaultName,
  saveModelMemory,
  loadModelMemories,
  saveEnvToVault,
  loadEnvFromVault,
  VaultEnv,
  ModelMemory,
  UserMemory,
  saveSkillsToVault,
  loadSkillsFromVault,
} from '../api/vault';
import { loadSkills, updateSkillFeedback as updateSkillFeedbackDB } from '../api/skillStorage';
import { Attachment } from '../components/AttachmentInput';
import { SlimeSkill } from '../slime/types';

interface VaultState {
  vaultConnected: boolean;
  vaultName: string | null;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

interface AppState {
  providers: Provider[];
  conversations: Conversation[];
  activeConversationId: string | null;
  activeModel: ModelInfo | null;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  showSettings: boolean;
  vault: VaultState;
  modelMemories: ModelMemory[];
  userMemory: UserMemory | null;
  skills: SlimeSkill[];
  isExecutingTool: boolean;
  activeTools: string[];
}

interface AppContextType extends AppState {
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
  setActiveModel: React.Dispatch<React.SetStateAction<ModelInfo | null>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  createConversation: (modelId?: string, provider?: ProviderType) => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  stopStreaming: () => void;
  detectModels: (providerId: ProviderType) => Promise<void>;
  updateProvider: (id: ProviderType, updates: Partial<Provider>) => void;
  setError: (error: string | null) => void;
  activeConversation: Conversation | null;
  clearAllConversations: () => void;
  connectVault: () => Promise<boolean>;
  disconnectVault: () => void;
  syncConversations: () => Promise<void>;
  updateModelMemory: (modelId: string, provider: ProviderType, context: string) => Promise<void>;
  updateUserMemory: (memory: UserMemory) => Promise<void>;
  refreshVaultState: () => void;
  hasFileSystemAccess: () => boolean;
  saveApiKeyToVault: (providerId: string, apiKey: string) => Promise<void>;
  setSkills: React.Dispatch<React.SetStateAction<SlimeSkill[]>>;
  activeSkill: SlimeSkill | null;
  updateSkillFeedback: (skillId: string, thumbsUp: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files in a specific directory recursively.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The directory path to list, use empty string for root" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a specific file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The file path relative to vault root" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a specific file (overwrites if exists).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The file path" },
          content: { type: "string", description: "The content to write" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Surgically edit a file by replacing specific target text with replacement text.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The file path" },
          target: { type: "string", description: "The exact text to find and replace" },
          replacement: { type: "string", description: "The text to replace it with" }
        },
        required: ["path", "target", "replacement"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" }
        },
        required: ["query"]
      }
    }
  }
];

async function traverseVaultPath(handle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle | FileSystemFileHandle | null> {
  if (!path || path === '.' || path === '/') return handle;
  const parts = path.split('/').filter(Boolean);
  let current: FileSystemDirectoryHandle = handle;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      try {
        return await current.getFileHandle(part);
      } catch {
        try {
          return await (current.getDirectoryHandle as any)(part);
        } catch {
          return null;
        }
      }
    } else {
      try {
        current = await (current.getDirectoryHandle as any)(part);
      } catch {
        return null;
      }
    }
  }
  return current;
}

async function ensurePath(handle: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle | null> {
  const parts = path.split('/').filter(Boolean);
  let current: FileSystemDirectoryHandle = handle;
  for (let i = 0; i < parts.length - 1; i++) {
    current = await (current.getDirectoryHandle as any)(parts[i], { create: true });
  }
  if (parts.length > 0) {
    return await current.getFileHandle(parts[parts.length - 1], { create: true });
  }
  return null;
}

async function listFilesRecursive(dirHandle: FileSystemDirectoryHandle, currentPath = ''): Promise<string[]> {
  const paths: string[] = [];
  try {
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        paths.push(`${currentPath}${entry.name}`);
      } else if (entry.kind === 'directory') {
        const subHandle = await (dirHandle.getDirectoryHandle as any)(entry.name);
        const subPaths = await listFilesRecursive(subHandle, `${currentPath}${entry.name}/`);
        paths.push(...subPaths);
      }
    }
  } catch (err) {
    console.error(err);
  }
  return paths;
}

export const handleToolExecution = async (name: string, args: any): Promise<any> => {
  const handle = await restoreVaultHandle();
  if (name !== 'web_search' && !handle) {
    return { error: 'Vault not connected or permission denied.' };
  }

  try {
    switch (name) {
      case 'list_files': {
        const root = args.path ? await traverseVaultPath(handle!, args.path) : handle;
        if (!root || root.kind !== 'directory') return { error: `Directory not found: ${args.path}` };
        const files = await listFilesRecursive(root as FileSystemDirectoryHandle, args.path ? `${args.path}/` : '');
        return { files };
      }
      case 'read_file': {
        const fileNode = await traverseVaultPath(handle!, args.path);
        if (!fileNode || fileNode.kind !== 'file') return { error: `File not found: ${args.path}` };
        const file = await (fileNode as FileSystemFileHandle).getFile();
        const content = await file.text();
        return { content };
      }
      case 'write_file': {
        const fh = await ensurePath(handle!, args.path);
        if (!fh) return { error: `Invalid path: ${args.path}` };
        const writable = await (fh as any).createWritable();
        await writable.write(args.content);
        await writable.close();
        return { success: true };
      }
      case 'edit_file': {
        const fileNode = await traverseVaultPath(handle!, args.path);
        if (!fileNode || fileNode.kind !== 'file') return { error: `File not found: ${args.path}` };
        const file = await (fileNode as FileSystemFileHandle).getFile();
        let content = await file.text();
        if (!content.includes(args.target)) return { error: 'Target string not found in file.' };
        content = content.replace(args.target, args.replacement);
        const writable = await (fileNode as any).createWritable();
        await writable.write(content);
        await writable.close();
        return { success: true };
      }
      case 'web_search': {
        await new Promise(r => setTimeout(r, 1000));
        return { 
          results: [
            { title: 'Mock Result 1', snippet: `This is a mock search result for: ${args.query}`, url: 'https://example.com/1' },
            { title: 'Mock Result 2', snippet: 'More mock details about the query.', url: 'https://example.com/2' }
          ]
        };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const savedSettings = loadFromStorage<AppSettings>('mm_settings', DEFAULT_SETTINGS);
  const savedProviders = loadFromStorage<Provider[]>('mm_providers', DEFAULT_PROVIDERS);
  const savedConversations = loadFromStorage<Conversation[]>('mm_conversations', []);

  const [providers, setProviders] = useState<Provider[]>(savedProviders);
  const [conversations, setConversations] = useState<Conversation[]>(savedConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    savedConversations[0]?.id || null
  );
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [settings, setSettings] = useState<AppSettings>(savedSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [modelMemories, setModelMemories] = useState<ModelMemory[]>([]);
  const [userMemory, setUserMemory] = useState<UserMemory | null>(null);
  const [skills, setSkills] = useState<SlimeSkill[]>(
    loadFromStorage<Skill[]>('mm_skills', DEFAULT_SKILLS) as unknown as SlimeSkill[]
  );
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const [vault, setVault] = useState<VaultState>({
    vaultConnected: false,
    vaultName: null,
    lastSyncTime: null,
    isSyncing: false,
  });

  const abortRef = useRef(false);

  const refreshVaultState = useCallback(() => {
    setVault((prev) => ({
      ...prev,
      vaultConnected: isVaultConnected(),
      vaultName: getVaultName(),
    }));
  }, []);

  const connectVault = useCallback(async (): Promise<boolean> => {
    const hasAccess = hasFileSystemAccess();
    if (!hasAccess) {
      setError('File System Access API not supported in this browser. Try Chrome or Edge.');
      return false;
    }

    let handle = await restoreVaultHandle();
    if (!handle) {
      const vaultName = await selectVaultFolder();
      if (!vaultName) return false;
      handle = await restoreVaultHandle();
    }

    if (!handle) {
      const permission = await requestVaultPermission();
      if (!permission) {
        setError('Permission to access vault was denied. Please grant access in browser settings.');
        return false;
      }
    }

    refreshVaultState();

    const vaultConvs = await loadConversationsFromVault();
    if (vaultConvs.length > 0) {
      setConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newConvs = vaultConvs.filter((c) => !existingIds.has(c.id));
        const merged = [...newConvs, ...prev];
        return merged.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }

    const memories = await loadModelMemories();
    setModelMemories(memories);

    const userMem = await loadUserMemory();
    setUserMemory(userMem);

    const vaultSkills = await loadSkillsFromVault();
    if (vaultSkills.length > 0) {
      setSkills(prev => {
        const merged = [...prev];
        for (const vaultSkill of vaultSkills) {
          const existingIdx = merged.findIndex(s => s.id === vaultSkill.id);
          if (existingIdx >= 0) {
            merged[existingIdx] = { ...merged[existingIdx], ...vaultSkill };
          } else {
            merged.push(vaultSkill);
          }
        }
        return merged;
      });
    }

    const vaultEnv = await loadEnvFromVault();
    const providerKeys: Record<string, string> = {
      openrouter: 'OPENROUTER_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
      grok: 'GROK_API_KEY',
    };

    setProviders((prev) =>
      prev.map((p) => {
        const envKey = providerKeys[p.id];
        if (envKey && vaultEnv[envKey]) {
          return { ...p, apiKey: vaultEnv[envKey], enabled: true };
        }
        if (envKey && p.requiresVault) {
          return { ...p, apiKey: '', enabled: false, status: 'disconnected' };
        }
        return p;
      })
    );

    setVault((prev) => ({
      ...prev,
      lastSyncTime: Date.now(),
    }));

    return true;
  }, [refreshVaultState]);

  const disconnectVault = useCallback(() => {
    localStorage.removeItem('vault_handles');
    setProviders((prev) =>
      prev.map((p) =>
        p.requiresVault
          ? { ...p, apiKey: '', enabled: false, status: 'disconnected' }
          : p
      )
    );
    setVault({
      vaultConnected: false,
      vaultName: null,
      lastSyncTime: null,
      isSyncing: false,
    });
  }, []);

  const syncConversations = useCallback(async () => {
    if (!isVaultConnected()) return;

    setVault((prev) => ({ ...prev, isSyncing: true }));

    try {
      await syncToVault(conversations);
      setVault((prev) => ({ ...prev, lastSyncTime: Date.now() }));
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setVault((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [conversations, settings, providers]);

  const updateModelMemory = useCallback(
    async (modelId: string, provider: ProviderType, context: string) => {
      const memory: ModelMemory = {
        modelId,
        provider,
        context,
        lastUpdated: Date.now(),
      };

      await saveModelMemory(memory);

      setModelMemories((prev) => {
        const filtered = prev.filter((m) => !(m.modelId === modelId && m.provider === provider));
        return [...filtered, memory];
      });
    },
    []
  );

  const updateUserMemory = useCallback(async (memory: UserMemory) => {
    await saveUserMemory(memory);
    setUserMemory(memory);
  }, []);

  const saveApiKeyToVault = useCallback(async (providerId: string, apiKey: string) => {
    if (!isVaultConnected()) return;

    const env: VaultEnv = {};
    const keyMap: Record<string, string> = {
      openrouter: 'OPENROUTER_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
      grok: 'GROK_API_KEY',
    };
    const envKey = keyMap[providerId];
    if (envKey) {
      env[envKey] = apiKey;
    }
    await saveEnvToVault(env);
  }, []);

  useEffect(() => {
    restoreVaultHandle().then((handle) => {
      if (handle) {
        refreshVaultState();
        loadConversationsFromVault().then((vaultConvs) => {
          if (vaultConvs.length > 0) {
            setConversations((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const newConvs = vaultConvs.filter((c) => !existingIds.has(c.id));
              return [...newConvs, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
            });
          }
        });
        loadModelMemories().then(setModelMemories);
        loadUserMemory().then(setUserMemory);
        loadSkillsFromVault().then((vaultSkills) => {
          if (vaultSkills.length > 0) {
            setSkills(prev => {
              const merged = [...prev];
              for (const vaultSkill of vaultSkills) {
                const existingIdx = merged.findIndex(s => s.id === vaultSkill.id);
                if (existingIdx >= 0) {
                  merged[existingIdx] = { ...merged[existingIdx], ...vaultSkill };
                } else {
                  merged.push(vaultSkill);
                }
              }
              return merged;
            });
          }
        });
      }
    });
  }, [refreshVaultState]);

  useEffect(() => {
    if (conversations.length > 0 && isVaultConnected()) {
      const timeoutId = setTimeout(() => {
        const latestConv = conversations[0];
        saveConversationToVault(latestConv).catch(console.error);
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [conversations]);

  useEffect(() => {
    saveToStorage('mm_settings', settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage('mm_skills', skills);
  }, [skills]);

  useEffect(() => {
    saveToStorage('mm_providers', providers);
  }, [providers]);

  useEffect(() => {
    saveToStorage('mm_conversations', conversations);
  }, [conversations]);

  useEffect(() => {
    if (vault.vaultConnected && skills.length > 0) {
      const timeout = setTimeout(() => {
        saveSkillsToVault(skills).catch(console.error);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [skills, vault.vaultConnected]);

  useEffect(() => {
    const init = async () => {
      for (const provider of providers) {
        if (provider.enabled) {
          await detectModels(provider.id);
        }
      }
    };
    init();
  }, []);

  const detectModels = useCallback(async (providerId: ProviderType) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, status: 'checking' } : p))
    );

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const isHealthy = await checkProviderHealth(providerId, provider.baseUrl, provider.apiKey);

    if (!isHealthy) {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? { ...p, status: 'disconnected', models: [] }
            : p
        )
      );
      return;
    }

    let models: ModelInfo[] = [];
    switch (providerId) {
      case 'ollama':
        models = await detectOllamaModels(provider.baseUrl);
        break;
      case 'lmstudio':
        models = await detectLMStudioModels(provider.baseUrl);
        break;
      case 'openrouter':
        if (!provider.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'disconnected', models: [] } : p
            )
          );
          return;
        }
        models = await detectOpenRouterModels(provider.apiKey);
        break;
      case 'openai':
        if (!provider.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'disconnected', models: [] } : p
            )
          );
          return;
        }
        models = await detectOpenAIModels(provider.apiKey);
        break;
      case 'anthropic':
        if (!provider.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'disconnected', models: [] } : p
            )
          );
          return;
        }
        models = await detectAnthropicModels(provider.apiKey);
        break;
      case 'gemini':
        if (!provider.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'disconnected', models: [] } : p
            )
          );
          return;
        }
        models = await detectGeminiModels(provider.apiKey);
        break;
      case 'grok':
        if (!provider.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'disconnected', models: [] } : p
            )
          );
          return;
        }
        models = await detectGrokModels(provider.apiKey);
        break;
    }

    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? { ...p, models, status: models.length > 0 ? 'connected' : 'disconnected' }
          : p
      )
    );
  }, [providers]);

  const createConversation = useCallback(
    (modelId?: string, provider?: ProviderType) => {
      const id = generateId();
      const model = modelId && provider ? { id: modelId, name: modelId, provider } : activeModel;

      const newConv: Conversation = {
        id,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: model?.id || '',
        provider: model?.provider || providers[0]?.id || 'ollama',
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(id);

      if (model) {
        setActiveModel(model);
      }

      return id;
    },
    [activeModel, providers]
  );

  const setActiveConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        setActiveModel({ id: conv.modelId, name: conv.modelId, provider: conv.provider });
      }
    },
    [conversations]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const conv = conversations.find((c) => c.id === id);

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          setActiveConversationId(filtered[0]?.id || null);
          if (filtered[0]) {
            setActiveModel({
              id: filtered[0].modelId,
              name: filtered[0].modelId,
              provider: filtered[0].provider,
            });
          }
        }
        return filtered;
      });

      if (conv && isVaultConnected()) {
        await deleteConversationFromVault(conv);
      }
    },
    [activeConversationId, conversations]
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!activeModel || !activeConversationId) return;
      abortRef.current = false;

      let messageContent = content;
      const messageAttachments = attachments 
        ? attachments.map(a => ({
            type: a.type,
            name: a.name,
            url: a.url,
            mimeType: a.mimeType,
          }))
        : undefined;

      const userMessageContent = content;
      let assistantResponseContent = '';

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: messageContent,
        model: activeModel.id,
        provider: activeModel.provider,
        timestamp: Date.now(),
        attachments: messageAttachments,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                title:
                  c.messages.length === 0
                    ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
                    : c.title,
                updatedAt: Date.now(),
              }
            : c
        )
      );

      const provider = providers.find((p) => p.id === activeModel.provider);
      if (!provider) {
        setError('Provider not found');
        return;
      }

      const conv = conversations.find((c) => c.id === activeConversationId);
      const initialContextMessages = conv ? [...conv.messages, userMessage] : [userMessage];

      const imageAttachments = attachments
        ? attachments.filter(a => a.type === 'image').map(a => ({
            type: 'image' as const,
            url: a.url,
            mimeType: a.mimeType,
          }))
        : undefined;

      const activeSkillNow = settings.activeSkillId
        ? skills.find(s => s.id === settings.activeSkillId) ?? null
        : null;
      let effectiveSystemPrompt = activeSkillNow
        ? activeSkillNow.systemPrompt
        : settings.systemPrompt;

      effectiveSystemPrompt += `\n\nYou have access to the following tools:\n${JSON.stringify(AVAILABLE_TOOLS, null, 2)}\nTo use tools, output a markdown JSON block containing an array of tool call objects: \`\`\`json\n[{"name": "...", "arguments": {...}}]\n\`\`\``;

      const runCompletionLoop = async (currentMessages: ChatMessage[]) => {
        if (abortRef.current) return;
        setIsLoading(true);

        const loopAssistantMessageId = generateId();
        const loopAssistantMessage: ChatMessage = {
          id: loopAssistantMessageId,
          role: 'assistant',
          content: '',
          model: activeModel.id,
          provider: activeModel.provider,
          timestamp: Date.now(),
          isStreaming: true,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: [...c.messages, loopAssistantMessage] }
              : c
          )
        );

        let assistantResponseContent = '';

        try {
          await streamChatCompletion(
            activeModel.provider,
            provider.baseUrl,
            activeModel.id,
            currentMessages,
            effectiveSystemPrompt,
            settings.temperature,
            settings.maxTokens,
            provider.apiKey,
            {
              onChunk: (text: string) => {
                if (abortRef.current) return;
                assistantResponseContent += text;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConversationId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === loopAssistantMessageId ? { ...m, content: m.content + text } : m
                          ),
                        }
                      : c
                  )
                );
              },
              onComplete: async () => {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConversationId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === loopAssistantMessageId ? { ...m, isStreaming: false } : m
                          ),
                        }
                      : c
                  )
                );
                
                let parsedToolCalls: import('../types').ToolCall[] = [];
                try {
                  const jsonMatch = assistantResponseContent.match(/```(?:json)?\s*(\[\s*{\s*"name"[\s\S]*?\])\s*```/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (Array.isArray(parsed)) {
                      parsedToolCalls = parsed.map((tc: any) => ({
                        id: generateId(),
                        type: 'function',
                        function: { name: tc.name || tc.tool, arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {}) }
                      }));
                    }
                  }
                } catch (e) {}

                if (parsedToolCalls.length > 0 && !abortRef.current) {
                  setIsExecutingTool(true);
                  setActiveTools(parsedToolCalls.map(tc => tc.function.name));

                  setConversations(prev => prev.map(c => c.id === activeConversationId ? {
                    ...c,
                    messages: c.messages.map(m => m.id === loopAssistantMessageId ? { ...m, toolCalls: parsedToolCalls } : m)
                  } : c));

                  const results = await Promise.all(parsedToolCalls.map(async tc => {
                    const args = JSON.parse(tc.function.arguments || '{}');
                    const res = await handleToolExecution(tc.function.name, args);
                    return {
                      id: generateId(),
                      role: 'tool' as const,
                      content: typeof res === 'string' ? res : JSON.stringify(res),
                      model: activeModel.id,
                      provider: activeModel.provider,
                      timestamp: Date.now(),
                      toolCallId: tc.id
                    };
                  }));

                  setIsExecutingTool(false);
                  setActiveTools([]);

                  setConversations(prev => prev.map(c => c.id === activeConversationId ? {
                    ...c,
                    messages: [...c.messages, ...results]
                  } : c));

                  const nextContext = [...currentMessages, { ...loopAssistantMessage, content: assistantResponseContent, isStreaming: false, toolCalls: parsedToolCalls }, ...results];
                  await runCompletionLoop(nextContext);
                } else {
                  setIsLoading(false);
                  if (settings.activeSkillId && userMessageContent && assistantResponseContent) {
                    const skill = skills.find(s => s.id === settings.activeSkillId);
                    if (skill && provider.apiKey) {
                      rateSkillPerformance(
                        skill, userMessageContent, assistantResponseContent,
                        activeModel.provider, provider.baseUrl, activeModel.id, provider.apiKey
                      ).then(res => {
                        if (res.thumbsUp) updateSkillFeedback(skill.id, true);
                      }).catch(console.error);
                    }
                  }
                }
              },
              onError: (err: string) => {
                setError(err);
                setIsLoading(false);
              },
            },
            imageAttachments
          );
        } catch (err: any) {
          setError(err.message);
          setIsLoading(false);
        }
      };

      await runCompletionLoop(initialContextMessages);
    },
    [activeModel, activeConversationId, conversations, providers, settings, skills]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
            }
          : c
      )
    );
  }, [activeConversationId]);

  const updateProvider = useCallback((id: ProviderType, updates: Partial<Provider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const clearAllConversations = useCallback(async () => {
    setConversations([]);
    setActiveConversationId(null);
    setActiveModel(null);
    localStorage.removeItem('mm_conversations');
  }, []);

  const updateSkillFeedback = useCallback(async (skillId: string, thumbsUp: boolean) => {
    try {
      await updateSkillFeedbackDB(skillId, thumbsUp);
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== skillId) return s;
          const newThumbsUp = thumbsUp ? (s.thumbsUp ?? 0) + 1 : s.thumbsUp ?? 0;
          return { ...s, thumbsUp: newThumbsUp };
        })
      );
    } catch (err) {
      console.error('Failed to update skill feedback:', err);
    }
  }, []);

  useEffect(() => {
    loadSkills().then((loadedSkills) => {
      setSkills(loadedSkills);
    }).catch(console.error);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const activeSkill = settings.activeSkillId
    ? skills.find(s => s.id === settings.activeSkillId) ?? null
    : null;

  return (
    <AppContext.Provider
      value={{
        providers,
        conversations,
        activeConversationId,
        activeModel,
        settings,
        isLoading,
        error,
        isSidebarOpen,
        showSettings,
        vault,
        modelMemories,
        userMemory,
        isExecutingTool,
        activeTools,
        setProviders,
        setActiveModel,
        setSettings,
        setIsSidebarOpen,
        setShowSettings,
        createConversation,
        setActiveConversation,
        deleteConversation,
        sendMessage,
        stopStreaming,
        detectModels,
        updateProvider,
        setError,
        activeConversation,
        clearAllConversations,
        connectVault,
        disconnectVault,
        syncConversations,
        updateModelMemory,
        updateUserMemory,
        saveApiKeyToVault,
        refreshVaultState,
        hasFileSystemAccess,
        skills, // Kept this one
        setSkills,
        activeSkill,
        updateSkillFeedback,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
