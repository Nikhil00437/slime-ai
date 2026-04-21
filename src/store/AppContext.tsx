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
  DEFAULT_SKILLS,
  LoopConfig,
  LoopState,
  LoopHistoryEntry,
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
  ToolDefinition,
  ToolCallDelta,
} from '../api/providers';
import { searchMemory, extractMemoryKeywords } from '../api/memory';
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
import { loadSkills } from '../api/skillStorage';
import { Attachment } from '../components/AttachmentInput';
import { SlimeSkill } from '../slime/types';
import { TOOL_SETTINGS, Skill } from '../types';
import {
  detectSkillFromQuery,
  getAttachmentTypeFromList,
} from '../utils/skillDetection';

interface VaultState {
  vaultConnected: boolean;
  vaultName: string | null;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

interface ToolSettingsState {
  enabledTools: Record<string, boolean>;
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
  inputHistory: string[];
  inputHistoryIndex: number;
  searchQuery: string;
  searchResults: string[];
  toolSettings: ToolSettingsState;
  // Loop execution state
  loopState: LoopState | null;
  loopPaused: boolean;
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
  clearConversationMessages: (id: string) => void;
  // New feature methods
  regenerateLastResponse: () => Promise<void>;
  editLastMessage: (newContent: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  togglePinConversation: (id: string) => void;
  duplicateConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  branchConversation: (messageId: string) => void;
  addToInputHistory: (content: string) => void;
  searchConversation: (query: string) => void;
  copyMessageToClipboard: (content: string) => Promise<void>;
  exportConversation: (id: string, format: 'markdown' | 'pdf') => Promise<void>;
  addQuickPrompt: (name: string, content: string) => void;
  removeQuickPrompt: (id: string) => void;
  toggleFavoriteModel: (modelId: string) => void;
  importData: (data: string) => Promise<void>;
  exportAllData: () => Promise<string>;
  // Tool management
  toolSettings: ToolSettingsState;
  toggleTool: (toolName: string) => void;
  resetToolSettings: () => void;
  // Tool execution functions
  executeToolWithSettings: typeof executeToolWithSettings;
  cancelToolExecution: typeof cancelToolExecution;
  executeToolsParallel: typeof executeToolsParallel;
  toolApprovalState: Record<string, 'pending' | 'approved' | 'denied'>;
  setToolApproval: (toolName: string, state: 'pending' | 'approved' | 'denied') => void;
  // Loop execution
  startLoop: (prompt: string, config: LoopConfig) => void;
  pauseLoop: () => void;
  resumeLoop: () => void;
  cancelLoop: () => void;
  completeLoopIteration: (input: string, output: string, toolCalls?: string[], toolResults?: string[]) => void;
  resetLoop: () => void;
  setLoopState: React.Dispatch<React.SetStateAction<LoopState | null>>;
  setLoopPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | null>(null);

// Tool types - imported from types.ts or defined here
export type { ToolDefinition } from '../types';

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  list_files: {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files in a directory recursively. Returns file paths separated by newlines. Use this to explore the vault structure.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list (empty or '/' for root)" },
          pattern: { type: "string", description: "Optional glob pattern to filter files (e.g., '*.md', '*.ts')" }
        },
        required: []
      }
    }
  },
  read_file: {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the complete contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root" },
          offset: { type: "string", description: "Optional line number to start reading from" },
          limit: { type: "string", description: "Optional number of lines to read" }
        },
        required: ["path"]
      }
    }
  },
  write_file: {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Creates parent directories if needed. WARNING: Overwrites existing files!",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root" },
          content: { type: "string", description: "Content to write" }
        },
        required: ["path", "content"]
      }
    }
  },
  edit_file: {
    type: "function",
    function: {
      name: "edit_file",
      description: "Edit a file by replacing specific text. Useful for targeted changes without rewriting the entire file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root" },
          target: { type: "string", description: "Exact text to find and replace (use escape sequences for newlines)" },
          replacement: { type: "string", description: "Text to replace with" }
        },
        required: ["path", "target", "replacement"]
      }
    }
  },
  mkdir: {
    type: "function",
    function: {
      name: "mkdir",
      description: "Create a new directory (folder). Creates parent directories if they don't exist.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to create" }
        },
        required: ["path"]
      }
    }
  },
  delete_file: {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file. Cannot delete directories - use delete_directory instead.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to delete" }
        },
        required: ["path"]
      }
    }
  },
  delete_directory: {
    type: "function",
    function: {
      name: "delete_directory",
      description: "Delete an empty directory. Fails if directory contains files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to delete" }
        },
        required: ["path"]
      }
    }
  },
  search_in_file: {
    type: "function",
    function: {
      name: "search_in_file",
      description: "Search for a pattern within a file and return matching lines with context.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to search in" },
          pattern: { type: "string", description: "Regex pattern to search for" }
        },
        required: ["path", "pattern"]
      }
    }
  },
  get_file_info: {
    type: "function",
    function: {
      name: "get_file_info",
      description: "Get metadata about a file (size, modified date, etc).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" }
        },
        required: ["path"]
      }
    }
  },
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information. Returns title, snippet, and URL for each result.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          num_results: { type: "string", description: "Number of results (default 5)" }
        },
        required: ["query"]
      }
    }
  },
  web_fetch: {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch and extract text content from a URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
          max_length: { type: "string", description: "Maximum characters to extract (default 5000)" }
        },
        required: ["url"]
      }
    }
  },
  calculate: {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a mathematical expression and return the result.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression (e.g., '2 + 2', 'sqrt(16)', 'sin(0)')" }
        },
        required: ["expression"]
      }
    }
  },
  codesearch: {
    type: "function",
    function: {
      name: "codesearch",
      description: "Search code using Exa Code API. Returns relevant code snippets, documentation, and examples.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Code search query" },
          tokens: { type: "string", description: "Number of tokens (default 5000)" }
        },
        required: ["query"]
      }
    }
  },
  bash: {
    type: "function",
    function: {
      name: "bash",
      description: "Execute a bash command and return the output.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to execute" },
          timeout: { type: "string", description: "Timeout in seconds (default 30)" }
        },
        required: ["command"]
      }
    }
  }
};

// Convert to the format expected by LLM
export const AVAILABLE_TOOLS = Object.values(TOOL_DEFINITIONS);

// Get tools that are enabled and match criteria
export function getEnabledTools(includeDisabled = false): ToolDefinition[] {
  return AVAILABLE_TOOLS.filter(tool => 
    includeDisabled || TOOL_SETTINGS[tool.function.name]?.enabled !== false
  );
}

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

// Safe math evaluation to prevent code injection
function safeMathEval(expression: string): number | string {
  const sanitized = expression
    .replace(/[^0-9+\-*/().sqrtpowcosinsintanlogpiexpi% ,]/gi, '')
    .replace(/\s+/g, '');
  
  // Very limited math - only basic operations and specific functions
  // Parse numbers from expression
  const numbers = sanitized.match(/-?\d+\.?\d*/g) || [];
  // Simple evaluation for basic expressions
  if (numbers.length === 0) return 'Invalid expression';
  if (numbers.length === 1) return parseFloat(numbers[0]);
  
  // Replace common functions
  let expr = sanitized
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/pi/gi, 'Math.PI')
    .replace(/e(?![x])/gi, 'Math.E');
  
  // Only allow safe patterns
  if (!/^[0-9+\-*/.() \s,Math.sqrtpowcosintanlogexabs]+$/i.test(expr)) {
    return 'Expression contains disallowed operations';
  }
  
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 1000000000000) / 1000000000000;
    }
    return result;
  } catch {
    return 'Invalid expression';
  }
}

// Clean Whoogle-style web search 
async function searchWeb(query: string, numResults = 5): Promise<any> {
  const results: Array<{title: string; snippet: string; url: string}> = [];
  
  // DuckDuckGo HTML (most reliable)
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&b=${numResults}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const html = await res.text();
      const matches = html.matchAll(/href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g);
      for (const m of matches) {
        const url = m[1];
        const title = m[2].trim();
        if (url && !url.includes('duckduckgo') && title.length > 3) {
          results.push({ title, snippet: '', url });
        }
      }
    }
  } catch (e) { console.warn('DDG error:', e); }

  // Fallback to Startpage
  if (results.length === 0) {
    try {
      const res = await fetch(
        `https://www.startpage.com/do/search?query=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const html = await res.text();
        const matches = html.matchAll(/href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g);
        for (const m of matches) {
          const url = m[1];
          const title = m[2].trim();
          if (url && !url.includes('startpage') && title.length > 3 && results.length < numResults) {
            results.push({ title, snippet: '', url });
          }
        }
      }
    } catch (e) { console.warn('Startpage error:', e); }
  }

  if (results.length === 0) {
    return { results: [{ title: 'No results', snippet: `No results for "${query}"`, url: '' }] };
  }

  // Dedupe and return
  const seen = new Set<string>();
  const filtered = results.filter(r => {
    try {
      const h = new URL(r.url).hostname;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    } catch { return true; }
  });

  return { results: filtered.slice(0, numResults), count: filtered.length };
}

// Web fetch 
async function fetchUrl(url: string, maxLength = 5000): Promise<any> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const text = await res.text();
    const dom = new DOMParser().parseFromString(text.slice(0, maxLength), 'text/html');
    dom.querySelectorAll('script,style').forEach(e => e.remove());
    return { content: dom.body?.textContent?.replace(/\s+/g, ' ').trim() || text.slice(0, maxLength), url, length: text.length };
  } catch (e: any) { return { error: e.message }; }
}

// Code search using Exa API
async function codeSearchExa(query: string, tokens = 5000): Promise<any> {
  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('exa_api_key') || ''}`
      },
      body: JSON.stringify({
        query,
        numTokens: tokens,
        type: 'code'
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) return { error: `Exa API error: ${res.status}` };
    const data = await res.json();
    return { results: data.results || [], count: data.results?.length || 0 };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Execute bash command
async function executeBash(command: string, timeout = 30000): Promise<any> {
  // Note: Browser sandbox doesn't allow real bash execution
  // This is a placeholder - in production you'd use a server-side API
  return { 
    error: 'Bash execution requires server-side API. Command would be: ' + command,
    suggestion: 'Use web_search or web_fetch for browser-based tools.'
  };
}

// Tool execution state for cancellation
let activeToolAbortController: AbortController | null = null;

// Execute tool with retry, timeout, and result streaming
export async function executeToolWithSettings(
  name: string, 
  args: Record<string, any>,
  settings: { timeout: number; maxRetries: number; retryBackoff: number; streamResults: boolean },
  onStream?: (chunk: string) => void
): Promise<any> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
    try {
      // Create abort controller for this attempt
      activeToolAbortController = new AbortController();
      const timeoutId = setTimeout(() => {
        activeToolAbortController?.abort();
      }, settings.timeout);
      
      const result = await handleToolExecution(name, args);
      clearTimeout(timeoutId);
      activeToolAbortController = null;
      
      // Stream result if enabled
      if (settings.streamResults && onStream && typeof result === 'string') {
        onStream(JSON.stringify(result));
      }
      
      return result;
    } catch (e: any) {
      lastError = e;
      
      // Check if cancelled
      if (e.name === 'AbortError') {
        return { error: 'Tool execution cancelled' };
      }
      
      // Wait before retry with exponential backoff
      if (attempt < settings.maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, settings.retryBackoff * Math.pow(2, attempt))
        );
      }
    }
  }
  
  return { error: lastError?.message || 'Tool execution failed after retries' };
}

// Cancel running tool
export function cancelToolExecution(): void {
  if (activeToolAbortController) {
    activeToolAbortController.abort();
    activeToolAbortController = null;
  }
}

// Execute tools in parallel
export async function executeToolsParallel(
  tools: Array<{ name: string; args: Record<string, any> }>,
  settings: { timeout: number; maxRetries: number; retryBackoff: number; streamResults: boolean; maxConcurrent: number },
  onStream?: (toolName: string, result: any) => void
): Promise<Array<{ name: string; result: any }>> {
  const results: Array<{ name: string; result: any }> = [];
  const chunks = Math.ceil(tools.length / settings.maxConcurrent);
  
  for (let i = 0; i < chunks; i++) {
    const batch = tools.slice(i * settings.maxConcurrent, (i + 1) * settings.maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(tool => executeToolWithSettings(tool.name, tool.args, settings))
    );
    
    for (let j = 0; j < batch.length; j++) {
      const result = { name: batch[j].name, result: batchResults[j] };
      results.push(result);
      
      if (onStream) {
        onStream(batch[j].name, batchResults[j]);
      }
    }
  }
  
  return results;
}

// Tool execution handler
export const handleToolExecution = async (name: string, args: Record<string, any>): Promise<any> => {
  if (name === 'web_search') {
    return searchWeb(args.query, parseInt(args.num_results) || 5);
  }
  if (name === 'web_fetch') {
    return fetchUrl(args.url, parseInt(args.max_length) || 5000);
  }
  if (name === 'calculate') {
    return { result: safeMathEval(args.expression) };
  }
  if (name === 'codesearch') {
    return codeSearchExa(args.query, parseInt(args.tokens) || 5000);
  }
  if (name === 'bash') {
    return executeBash(args.command, parseInt(args.timeout) * 1000 || 30000);
  }

  const handle = await restoreVaultHandle();
  if (!handle) return { error: 'Vault not connected' };

  try {
    switch (name) {
      case 'list_files': {
        const root = args.path ? await traverseVaultPath(handle, args.path || '') : handle;
        if (!root || root.kind !== 'directory') return { error: `Not found: ${args.path}` };
        let files = await listFilesRecursive(root as FileSystemDirectoryHandle, args.path || '');
        if (args.pattern) files = files.filter(f => new RegExp(args.pattern.replace(/\*/g, '.*')).test(f));
        return { files, count: files.length };
      }
      case 'read_file': {
        const node = await traverseVaultPath(handle, args.path);
        if (!node || node.kind !== 'file') return { error: `Not found: ${args.path}` };
        return { content: await (await node.getFile()).text(), path: args.path };
      }
      case 'write_file': {
        const parts = args.path.split('/');
        const parent = parts.slice(0, -1).join('/') || '/';
        const name = parts.pop() || '';
        const p = parent === '/' ? handle : await traverseVaultPath(handle, parent);
        if (!p) return { error: `Parent not found: ${parent}` };
        const fh = await (p as FileSystemDirectoryHandle).getFileHandle(name, { create: true });
        await (await fh.createWritable()).write(args.content);
        return { success: true };
      }
      case 'delete_file': {
        const parts = args.path.split('/');
        const parent = parts.slice(0, -1).join('/') || '/';
        const name = parts.pop() || '';
        const p = parent === '/' ? handle : await traverseVaultPath(handle, parent);
        if (!p) return { error: `Parent not found: ${parent}` };
        await (p as FileSystemDirectoryHandle).removeEntry(name);
        return { success: true };
      }
      case 'create_folder': {
        const parts = args.path.split('/');
        const parent = parts.slice(0, -1).join('/') || '/';
        const name = parts.pop() || '';
        const p = parent === '/' ? handle : await traverseVaultPath(handle, parent);
        if (!p) return { error: `Parent not found: ${parent}` };
        await (p as FileSystemDirectoryHandle).getDirectoryHandle(name, { create: true });
        return { success: true };
      }
default: return { error: `Unknown: ${name}` };
    }
  } catch (e: any) { return { error: e.message }; }
}

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
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputHistoryIndex, setInputHistoryIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [loopPaused, setLoopPaused] = useState(false);
  const [toolApprovalState, setToolApprovalState] = useState<Record<string, 'pending' | 'approved' | 'denied'>>({});
  const [toolSettings, setToolSettings] = useState<ToolSettingsState>(() => {
    const saved = localStorage.getItem('mm_tool_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Default: enable all tools
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(TOOL_SETTINGS)) {
      initial[key] = true;
    }
    return { enabledTools: initial };
  });

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
    saveToStorage('mm_tool_settings', toolSettings);
  }, [toolSettings]);

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
            id: a.id,
            type: a.type,
            name: a.name,
            url: a.url,
            mimeType: a.mimeType,
          }))
        : undefined;

      // let assistantResponseContent = '';

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

      // Auto-recall relevant memory if enabled for this conversation
      let memoryRecallContext = '';
      if (conv?.memoryEnabled) {
        const keywords = extractMemoryKeywords(content);
        if (keywords.length > 0) {
          const relevantMemory = await searchMemory(keywords.join(' '), 5);
          if (relevantMemory.length > 0) {
            memoryRecallContext = `\n\nRelevant memories:\n${relevantMemory.map(m => `- ${m.content}`).join('\n')}`;
          }
        }
      }

      // Auto-detect skill based on query content with enhanced confidence scoring
      const detectSkillWithConfidence = (
        query: string,
        attachments: Attachment[]
      ): { skill: Skill | null; confidence: number } => {
        const attachmentType = getAttachmentTypeFromList(
          attachments as unknown as Array<{ type: string }>
        );
        // Use DEFAULT_SKILLS for detection (they have keywords/memoryTriggers)
        const allSkills: Skill[] = DEFAULT_SKILLS as Skill[];
        const result = detectSkillFromQuery(query, allSkills, attachmentType);
        return {
          skill: result.skill,
          confidence: result.confidence,
        };
      };

      // Check if query contains memory trigger phrases
      const shouldExtractMemory = (query: string): boolean => {
        const lowerQuery = query.toLowerCase();
        for (const skill of skills) {
          if (!skill.enabled) continue;
          const triggers = (skill as any).memoryTriggers || [];
          if (triggers.some((t: string) => lowerQuery.includes(t.toLowerCase()))) {
            return true;
          }
        }
        return false;
      };

      // Extract and save user info from query
      const extractAndSaveUserInfo = async (query: string, response: string): Promise<void> => {
        // Use vault.vaultConnected from context instead of isVaultConnected()
        if (!vault.vaultConnected || !userMemory) {
          console.log('[Memory] Vault not connected or no userMemory');
          return;
        }
        
        const currentFacts = userMemory.facts || [];
        if (currentFacts.length >= 50) {
          console.log('[Memory] Memory limit reached (50 facts)');
          return;
        }
        
        const prompt = `Analyze the user's message and AI response. Extract any new factual information about the user (name, job, preferences, background, interests, skills, etc.).
        
User message: "${query}"
AI response: "${response}"

Current known facts:
${currentFacts.map((f, i) => `${i + 1}. ${f}`).join('\n') || '(none)'}

Return a JSON array of ONLY new facts to add. If no new facts, return empty array []. Focus on:
- Personal info (name, age, location)
- Professional info (job, company, skills, experience)  
- Preferences (coding style, communication style, interests)
- Background (education, projects, tools used)

Respond with ONLY valid JSON array. Example format: ["fact 1", "fact 2"]`;

        try {
          const provider = providers.find(p => p.id === activeModel.provider);
          if (!provider?.apiKey) {
            console.log('[Memory] No API key for provider');
            return;
          }
          
          // Use the appropriate API call based on provider
          let res;
          if (provider.id === 'openai' || provider.id === 'openrouter') {
            res = await fetch(`${provider.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
                ...(provider.id === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'UnifiedLLM' } : {}),
              },
              body: JSON.stringify({
                model: provider.id === 'openrouter' ? 'openai/gpt-4o-mini' : activeModel.id,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.3,
              }),
            });
          } else if (provider.id === 'anthropic') {
            res = await fetch(`${provider.baseUrl}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': provider.apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: activeModel.id,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.3,
              }),
            });
          } else if (provider.id === 'gemini') {
            res = await fetch(`${provider.baseUrl}/models/${activeModel.id}:generateContent?key=${provider.apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
              }),
            });
          } else {
            console.log('[Memory] Unsupported provider for memory extraction:', provider.id);
            return;
          }
          
          if (!res.ok) {
            console.log('[Memory] API call failed:', res.status);
            return;
          }
          
          const data = await res.json();
          let content = '';
          
          // Parse response based on provider
          if (provider.id === 'anthropic') {
            content = data.content?.[0]?.text || '';
          } else if (provider.id === 'gemini') {
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            content = data.choices?.[0]?.message?.content || '';
          }
          
          if (!content) {
            console.log('[Memory] No content in response');
            return;
          }
          
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            let newFacts: string[] = [];
            try {
              newFacts = JSON.parse(jsonMatch[0]);
            } catch (e) {
              // Try to extract quoted strings
              const quotedMatch = content.match(/"([^"]+)"/g);
              if (quotedMatch) {
                newFacts = quotedMatch.map(s => s.replace(/"/g, ''));
              }
            }
            
            if (Array.isArray(newFacts) && newFacts.length > 0) {
              const filteredFacts = newFacts.filter((f: string) => 
                f && typeof f === 'string' && f.length > 3 && f.length < 200 && 
                !currentFacts.some(existing => existing.toLowerCase().includes(f.toLowerCase()))
              );
              
              if (filteredFacts.length > 0) {
                const updatedMemory: UserMemory = {
                  ...userMemory,
                  facts: [...currentFacts, ...filteredFacts],
                };
                await saveUserMemory(updatedMemory);
                setUserMemory(updatedMemory);
                console.log('[Memory] Saved new user facts:', filteredFacts);
              }
            }
          }
        } catch (err) {
          console.error('[Memory] Failed to extract user info:', err);
        }
      };

      // Use enhanced skill detection with confidence scoring and attachment awareness
      const { skill: matchedSkill } = detectSkillWithConfidence(content, attachments || []);
      let effectiveSystemPrompt = matchedSkill
        ? ((matchedSkill as unknown as { systemPrompt?: string }).systemPrompt || settings.systemPrompt)
        : settings.systemPrompt;

      // Add memory recall context if available
      if (memoryRecallContext) {
        effectiveSystemPrompt += memoryRecallContext;
      }

      // Filter tools by enabled settings
      const enabledToolsList = AVAILABLE_TOOLS.filter(
        tool => toolSettings.enabledTools[tool.function.name] !== false
      );

      // Convert to ToolDefinition format for native API tool calling
      const nativeTools: ToolDefinition[] = enabledToolsList.map(t => ({
        type: t.type,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));

      // Add tool descriptions to system prompt as fallback for models that don't support native tool calling
      effectiveSystemPrompt += `\n\nYou have access to the following tools:\n${JSON.stringify(enabledToolsList, null, 2)}\nTo use tools, output a markdown JSON block containing an array of tool call objects: \`\`\`json\n[{"name": "...", "arguments": {...}}]\n\`\`\`\nOnce you receive tool results, DO NOT call the tool again with the same arguments. Summarize the findings to the user.`;

        const runCompletionLoop = async (currentMessages: ChatMessage[], loopCount = 0) => {
        if (abortRef.current) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);

        const loopAssistantMessageId = generateId();
        const requestStartTime = Date.now();
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

        // Accumulate native tool call deltas during streaming
        const accumulatedToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

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
              onToolCalls: (toolCallDeltas: ToolCallDelta[]) => {
                for (const delta of toolCallDeltas) {
                  const idx = delta.index ?? 0;
                  const existing = accumulatedToolCalls.get(idx);
                  if (!existing && delta.id) {
                    // New tool call
                    accumulatedToolCalls.set(idx, {
                      id: delta.id,
                      name: delta.function?.name || '',
                      arguments: delta.function?.arguments || '',
                    });
                  } else if (existing) {
                    // Accumulate delta
                    if (delta.function?.name) existing.name += delta.function.name;
                    if (delta.function?.arguments) existing.arguments += delta.function.arguments;
                    if (delta.id) existing.id = delta.id;
                  }
                }
              },
              onComplete: async (usage?: { inputTokens: number; outputTokens: number; totalTokens: number }) => {
                const responseTime = Date.now() - requestStartTime;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConversationId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === loopAssistantMessageId ? { ...m, isStreaming: false, responseTime, usage } : m
                          ),
                        }
                      : c
                  )
                );

                let parsedToolCalls: import('../types').ToolCall[] = [];

                // First: check for native API tool calls (from providers that support tools parameter)
                if (accumulatedToolCalls.size > 0) {
                  parsedToolCalls = Array.from(accumulatedToolCalls.values()).map(tc => ({
                    id: tc.id || generateId(),
                    type: 'function' as const,
                    function: {
                      name: tc.name,
                      arguments: tc.arguments,
                    },
                  }));
                }

                // Fallback: parse markdown JSON tool calls (for models without native tool support)
                if (parsedToolCalls.length === 0) {
                  try {
                    const jsonMatch = assistantResponseContent.match(/```(?:json)?\s*(\[\s*{\s*"name"[\s\S]*?\])\s*```/);
                    if (jsonMatch) {
                      const parsed = JSON.parse(jsonMatch[1]);
                      if (Array.isArray(parsed)) {
                        parsedToolCalls = parsed.map((tc: any) => ({
                          id: generateId(),
                          type: 'function' as const,
                          function: { name: tc.name || tc.tool, arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {}) }
                        }));
                      }
                    }
                  } catch (e) {}
                }

                if (parsedToolCalls.length > 0 && !abortRef.current) {
                  setIsExecutingTool(true);
                  setActiveTools(parsedToolCalls.map(tc => tc.function.name));

                  // Create agent step entry
                  const currentStep = loopCount + 1;
                  setConversations(prev => prev.map(c => c.id === activeConversationId ? {
                    ...c,
                    messages: c.messages.map(m => m.id === loopAssistantMessageId ? { ...m, toolCalls: parsedToolCalls } : m),
                    agentSteps: [
                      ...(c.agentSteps || []),
                      {
                        stepNumber: currentStep,
                        toolCalls: parsedToolCalls,
                        toolResults: [],
                        timestamp: Date.now()
                      }
                    ]
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

                  // Update agent step with results
                  setConversations(prev => prev.map(c => c.id === activeConversationId ? {
                    ...c,
                    messages: [...c.messages, ...results],
                    agentSteps: (c.agentSteps || []).map((step, idx) => 
                      idx === (c.agentSteps || []).length - 1 
                        ? { ...step, toolResults: results }
                        : step
                    )
                  } : c));

                  setIsExecutingTool(false);
                  setActiveTools([]);

                  const nextContext = [...currentMessages, { ...loopAssistantMessage, content: assistantResponseContent, isStreaming: false, toolCalls: parsedToolCalls }, ...results];
                  await runCompletionLoop(nextContext, loopCount + 1);
                } else {
                  setIsLoading(false);
                  
                  // Auto-extract and save user info to memory if triggers detected
                  if (shouldExtractMemory(content)) {
                    extractAndSaveUserInfo(content, assistantResponseContent).catch(console.error);
                  }
                }
              },
              onError: (err: string) => {
                setError(err);
                setIsLoading(false);
              },
            },
            imageAttachments,
            nativeTools
          );
        } catch (err: any) {
          setError(err.message);
          setIsLoading(false);
        }
      };

      await runCompletionLoop(initialContextMessages);
    },
    [activeModel, activeConversationId, conversations, providers, settings, skills, vault, userMemory]
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

  // Loop execution functions
  const startLoop = useCallback((prompt: string, config: LoopConfig) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setLoopState({
      id,
      status: 'running',
      currentIteration: 0,
      maxIterations: config.maxIterations,
      startTime: Date.now(),
      lastIterationTime: 0,
      history: [],
    });
    setLoopPaused(false);
  }, []);

  const pauseLoop = useCallback(() => {
    setLoopPaused(true);
    setLoopState(prev =>
      prev ? { ...prev, status: 'paused' } : null
    );
  }, []);

  const resumeLoop = useCallback(() => {
    setLoopPaused(false);
    setLoopState(prev =>
      prev ? { ...prev, status: 'running' } : null
    );
  }, []);

  const cancelLoop = useCallback(() => {
    setLoopState(prev =>
      prev ? { ...prev, status: 'cancelled' } : null
    );
    setLoopPaused(false);
  }, []);

  const completeLoopIteration = useCallback(
    (input: string, output: string, toolCalls: string[] = [], toolResults: string[] = []) => {
      setLoopState(prev => {
        if (!prev) return null;
        const duration = Date.now() - prev.startTime;
        const newEntry: LoopHistoryEntry = {
          iteration: prev.currentIteration,
          timestamp: Date.now(),
          input,
          output,
          toolCalls,
          toolResults,
          duration,
          status: 'success',
        };
        return {
          ...prev,
          currentIteration: prev.currentIteration + 1,
          lastIterationTime: duration,
          history: [...prev.history, newEntry],
          status: prev.currentIteration + 1 >= prev.maxIterations ? 'completed' : 'running',
        };
      });
    },
    []
  );

  const resetLoop = useCallback(() => {
    setLoopState(null);
    setLoopPaused(false);
  }, []);

  const updateProvider = useCallback((id: ProviderType, updates: Partial<Provider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const clearAllConversations = useCallback(async () => {
    setConversations([]);
    setActiveConversationId(null);
    setActiveModel(null);
    localStorage.removeItem('mm_conversations');
  }, []);

  const clearConversationMessages = useCallback((id: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, messages: [], updatedAt: Date.now() };
    }));
  }, []);

  useEffect(() => {
    loadSkills().then((loadedSkills) => {
      setSkills(loadedSkills);
    }).catch(console.error);
  }, []);

  // ============ NEW FEATURE FUNCTIONS ============

  const addToInputHistory = useCallback((content: string) => {
    if (!content.trim()) return;
    setInputHistory(prev => {
      const filtered = prev.filter(item => item !== content);
      return [content, ...filtered].slice(0, 50);
    });
    setInputHistoryIndex(-1);
  }, []);

  const regenerateLastResponse = useCallback(async () => {
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation || !activeModel) return;
    
    // Find the last user message that has an assistant response
    const messages = currentConversation.messages;
    let lastUserIndex = -1;
    let lastAssistantIndex = -1;
    
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && lastUserIndex === -1) {
        lastUserIndex = i;
      }
      if (messages[i].role === 'assistant' && lastUserIndex !== -1 && lastAssistantIndex === -1) {
        lastAssistantIndex = i;
        break;
      }
    }
    
    if (lastUserIndex === -1 || lastAssistantIndex === -1) return;
    
    const userMessage = messages[lastUserIndex];
    const userContent = userMessage.content;
    
    // Remove the user message and all messages after it
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversationId) return c;
      return {
        ...c,
        messages: c.messages.slice(0, lastUserIndex),
      };
    }));
    
    // Resend the message
    await sendMessage(userContent, userMessage.attachments as any);
  }, [activeModel, activeConversationId, sendMessage]);

  const editLastMessage = useCallback(async (newContent: string) => {
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation || !activeModel) return;
    
    const messages = currentConversation.messages;
    let lastUserIndex = -1;
    
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    
    if (lastUserIndex === -1) return;
    
    // Update the message content
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversationId) return c;
      const updatedMessages = [...c.messages];
      updatedMessages[lastUserIndex] = {
        ...updatedMessages[lastUserIndex],
        content: newContent,
        timestamp: Date.now(),
      };
      return { ...c, messages: updatedMessages };
    }));
    
    // Find and remove subsequent assistant messages
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversationId) return c;
      return { ...c, messages: c.messages.slice(0, lastUserIndex + 1) };
    }));
    
    // Resend with new content
    await sendMessage(newContent, messages[lastUserIndex].attachments as any);
  }, [activeModel, activeConversationId, sendMessage]);

  const retryLastMessage = useCallback(async () => {
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) return;
    
    const messages = currentConversation.messages;
    let lastErrorIndex = -1;
    
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].error) {
        lastErrorIndex = i;
        break;
      }
    }
    
    if (lastErrorIndex === -1) return;
    
    // Find the corresponding user message
    let userIndex = -1;
    for (let i = lastErrorIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userIndex = i;
        break;
      }
    }
    
    if (userIndex === -1) return;
    
    const userMessage = messages[userIndex];
    
    // Remove the error message
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversationId) return c;
      return { ...c, messages: c.messages.slice(0, lastErrorIndex) };
    }));
    
    // Resend the message
    await sendMessage(userMessage.content, userMessage.attachments as any);
  }, [activeConversationId, sendMessage]);

  const togglePinConversation = useCallback((id: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, isPinned: !c.isPinned };
    }));
  }, []);

  const duplicateConversation = useCallback((id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    
    const newId = generateId();
    const newConv: Conversation = {
      ...conv,
      id: newId,
      title: `${conv.title} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
    };
    
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
  }, [conversations]);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, title: newTitle, updatedAt: Date.now() };
    }));
  }, []);

  const branchConversation = useCallback((messageId: string) => {
    const conv = activeConversation;
    if (!conv) return;
    
    const messageIndex = conv.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    const newId = generateId();
    const branchMessages = conv.messages.slice(0, messageIndex + 1);
    
    const newConv: Conversation = {
      id: newId,
      title: `${conv.title} (branch)`,
      messages: branchMessages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: conv.modelId,
      provider: conv.provider,
    };
    
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
  }, [activeConversationId, conversations]);

  const searchConversation = useCallback((query: string) => {
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    setSearchQuery(query);
    if (!currentConversation || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = currentConversation.messages
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .map(m => m.id);
    
    setSearchResults(results);
  }, [activeConversationId, conversations]);

  const copyMessageToClipboard = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const exportConversation = useCallback(async (id: string, format: 'markdown' | 'pdf') => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    
    let content = '';
    
    if (format === 'markdown') {
      content = `# ${conv.title}\n\n`;
      content += `Created: ${new Date(conv.createdAt).toLocaleString()}\n\n`;
      
      for (const msg of conv.messages) {
        const role = msg.role === 'user' ? '**You**' : '**Assistant**';
        content += `${role}:\n${msg.content}\n\n---\n\n`;
      }
      
      // Download as markdown
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF export (simplified - just use browser print)
      content = `# ${conv.title}\n\n`;
      for (const msg of conv.messages) {
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        content += `${role}: ${msg.content}\n\n`;
      }
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>${conv.title}</title></head><body><pre>${content}</pre></body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }, [conversations]);

  const addQuickPrompt = useCallback((name: string, content: string) => {
    const newPrompt = {
      id: generateId(),
      name,
      content,
      createdAt: Date.now(),
    };
    setSettings(prev => ({
      ...prev,
      quickPrompts: [...prev.quickPrompts, newPrompt],
    }));
  }, []);

  const removeQuickPrompt = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      quickPrompts: prev.quickPrompts.filter(p => p.id !== id),
    }));
  }, []);

  const toggleFavoriteModel = useCallback((modelId: string) => {
    setSettings(prev => {
      const isFavorite = prev.favoriteModels.includes(modelId);
      return {
        ...prev,
        favoriteModels: isFavorite
          ? prev.favoriteModels.filter(id => id !== modelId)
          : [...prev.favoriteModels, modelId],
      };
    });
    
    // Also update recent models
    if (activeModel) {
      setSettings(prev => {
        const filtered = prev.recentModels.filter(id => id !== activeModel.id);
        return {
          ...prev,
          recentModels: [activeModel.id, ...filtered].slice(0, 10),
        };
      });
    }
  }, [activeModel]);

  const importData = useCallback(async (data: string) => {
    try {
      const imported = JSON.parse(data);
      
      if (imported.conversations) {
        setConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newConvs = imported.conversations.filter((c: Conversation) => !existingIds.has(c.id));
          return [...newConvs, ...prev];
        });
      }
      
      if (imported.settings) {
        setSettings(prev => ({ ...prev, ...imported.settings }));
      }
      
      if (imported.skills) {
        setSkills(prev => [...prev, ...imported.skills]);
      }
    } catch (err) {
      setError('Failed to import data');
      console.error(err);
    }
  }, [setError]);

  const exportAllData = useCallback(async (): Promise<string> => {
    const data = {
      conversations: conversations.map(c => ({
        ...c,
        messages: c.messages.map(m => ({
          ...m,
          isStreaming: false,
        })),
      })),
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        streamResponses: settings.streamResponses,
        sidebarCollapsed: settings.sidebarCollapsed,
        activeSkillId: settings.activeSkillId,
        recentModels: settings.recentModels,
        favoriteModels: settings.favoriteModels,
        quickPrompts: settings.quickPrompts,
        autoRetry: settings.autoRetry,
        maxRetries: settings.maxRetries,
        showTimestamps: settings.showTimestamps,
        showTokenCount: settings.showTokenCount,
        showCostEstimate: settings.showCostEstimate,
      },
      skills: skills,
      exportedAt: Date.now(),
    };
    
    return JSON.stringify(data, null, 2);
  }, [conversations, settings, skills]);

  const toggleTool = useCallback((toolName: string) => {
    setToolSettings(prev => ({
      ...prev,
      enabledTools: {
        ...prev.enabledTools,
        [toolName]: !prev.enabledTools[toolName]
      }
    }));
  }, []);

  const resetToolSettings = useCallback(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(TOOL_SETTINGS)) {
      initial[key] = true;
    }
    setToolSettings({ enabledTools: initial });
    localStorage.removeItem('mm_tool_settings');
  }, []);

  const setToolApproval = useCallback((toolName: string, state: 'pending' | 'approved' | 'denied') => {
    setToolApprovalState(prev => ({ ...prev, [toolName]: state }));
  }, []);

  // Update active model to track in recent
  useEffect(() => {
    if (activeModel) {
      setSettings(prev => {
        const filtered = prev.recentModels.filter(id => id !== activeModel.id);
        return {
          ...prev,
          recentModels: [activeModel.id, ...filtered].slice(0, 10),
        };
      });
    }
  }, [activeModel?.id]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

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
        inputHistory,
        inputHistoryIndex,
        searchQuery,
        searchResults,
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
        clearConversationMessages,
        connectVault,
        disconnectVault,
        syncConversations,
        updateModelMemory,
        updateUserMemory,
        saveApiKeyToVault,
        refreshVaultState,
        hasFileSystemAccess,
        skills,
        setSkills,
        // New feature methods
        regenerateLastResponse,
        editLastMessage,
        retryLastMessage,
        togglePinConversation,
        duplicateConversation,
        renameConversation,
        branchConversation,
        addToInputHistory,
        searchConversation,
        copyMessageToClipboard,
        exportConversation,
        addQuickPrompt,
        removeQuickPrompt,
        toggleFavoriteModel,
        importData,
        exportAllData,
        // Tool management
        toolSettings,
        toggleTool,
        resetToolSettings,
        // Tool execution
        executeToolWithSettings,
        cancelToolExecution,
        executeToolsParallel,
        toolApprovalState,
        setToolApproval,
        // Loop execution
        loopState,
        loopPaused,
        startLoop,
        pauseLoop,
        resumeLoop,
        cancelLoop,
        completeLoopIteration,
        resetLoop,
        setLoopState,
        setLoopPaused,
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
