export type ProviderType = 'ollama' | 'lmstudio' | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'grok';

export interface Provider {
  id: ProviderType;
  name: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  models: ModelInfo[];
  status: 'connected' | 'disconnected' | 'checking';
  requiresVault?: boolean;
}

export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  audio: boolean;
  video: boolean;
  fileUpload: boolean;
  maxContextTokens?: number;
  maxOutputTokens?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  parameters?: string;
  capabilities?: ModelCapabilities;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  model: string;
  provider: ProviderType;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio' | 'video';
    name: string;
    url: string;
    mimeType: string;
  }>;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  responseTime?: number;
  error?: string;
  isRetrying?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  provider: ProviderType;
  isPinned?: boolean;
  lastModelId?: string;
  favoriteModels?: string[];
}

export interface InputHistoryItem {
  id: string;
  content: string;
  timestamp: number;
}

export interface QuickPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

export interface AppSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponses: boolean;
  sidebarCollapsed: boolean;
  activeSkillId: string | null;
  recentModels: string[];
  favoriteModels: string[];
  quickPrompts: QuickPrompt[];
  autoRetry: boolean;
  maxRetries: number;
  showTimestamps: boolean;
  showTokenCount: boolean;
  showCostEstimate: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  category: 'coding' | 'writing' | 'analysis' | 'creative' | 'custom';
  builtIn: boolean;
  enabled: boolean;
  rank?: 'normal' | 'rare' | 'unique' | 'ultimate' | 'terminal';
  level?: number;
  thumbsUp?: number;
  thumbsDown?: number;
  isDefault?: boolean;
}

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'code-expert',
    name: 'Code Expert',
    description: 'Enhanced coding: step-by-step reasoning, best practices, edge cases',
    systemPrompt: 'You are an expert software engineer. Provide precise, well-commented code. Reason through problems step by step. Flag edge cases and potential bugs. Prefer idiomatic solutions.',
    icon: '💻',
    category: 'coding',
    builtIn: true,
    enabled: true,
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Storytelling, poetry, world-building',
    systemPrompt: 'You are a creative writing expert with a flair for vivid prose, compelling characters, and evocative imagery. Embrace the user\'s creative vision. Suggest and explore narrative possibilities.',
    icon: '✍️',
    category: 'writing',
    builtIn: true,
    enabled: true,
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Deep analysis, structured breakdowns, citations',
    systemPrompt: 'You are a rigorous research analyst. Structure your responses with clear sections. Distinguish facts from inference. Highlight uncertainties. When citing, name sources clearly.',
    icon: '🔬',
    category: 'analysis',
    builtIn: true,
    enabled: true,
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Clear explanations, analogies, Socratic method',
    systemPrompt: 'You are a patient, skilled teacher. Break complex topics into digestible steps. Use analogies and concrete examples. Check for understanding. Encourage questions.',
    icon: '🎓',
    category: 'analysis',
    builtIn: true,
    enabled: true,
  },
  {
    id: 'debate-partner',
    name: 'Debate Partner',
    description: 'Steelman arguments, expose weaknesses',
    systemPrompt: 'You are a sharp debate partner. Steelman the strongest version of any argument. Point out logical fallacies. Present counterarguments without bias. Push the user to think harder.',
    icon: '⚖️',
    category: 'analysis',
    builtIn: true,
    enabled: true,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: 'You are a helpful assistant.',
  streamResponses: true,
  sidebarCollapsed: false,
  activeSkillId: null,
  recentModels: [],
  favoriteModels: [],
  quickPrompts: [],
  autoRetry: true,
  maxRetries: 3,
  showTimestamps: true,
  showTokenCount: false,
  showCostEstimate: true,
};

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    enabled: true,
    models: [],
    status: 'checking',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234',
    enabled: true,
    models: [],
    status: 'checking',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
];
