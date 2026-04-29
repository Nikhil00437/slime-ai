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
  modelIds?: string[];
  memoryEnabled?: boolean;
  agentSteps?: AgentStep[];
}

export interface AgentStep {
  stepNumber: number;
  toolCalls: ToolCall[];
  toolResults: ChatMessage[];
  timestamp: number;
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

// ==================== Loop Execution ====================

export type LoopStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';

export type StopConditionType = 'keyword' | 'threshold' | 'manual' | 'maxIterations';

export type ExitStrategy = 'immediate' | 'afterToolResult' | 'onResponse';

export interface LoopConfig {
  maxIterations: number;
  iterationTimeout: number; // milliseconds
  stopCondition: StopConditionType;
  stopKeyword?: string;
  stopThreshold?: number;
  autoContinueOnToolResult: boolean;
  exitStrategy: ExitStrategy;
}

export interface LoopState {
  id: string;
  status: LoopStatus;
  currentIteration: number;
  maxIterations: number;
  startTime: number;
  lastIterationTime: number;
  history: LoopHistoryEntry[];
  error?: string;
}

export interface LoopHistoryEntry {
  iteration: number;
  timestamp: number;
  input: string;
  output: string;
  toolCalls?: string[];
  toolResults?: string[];
  duration: number;
  status: 'success' | 'error' | 'cancelled';
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
  // Model selectors
  summarizationModel: string;
  skillGenerationModel: string;
  // Chat persistence
  autoSaveInterval: number;
  offlineQueueEnabled: boolean;
  conflictResolution: 'local' | 'remote' | 'newest' | 'manual';
  lastSyncTimestamp: number | null;
  // Loop execution
  loopEnabled: boolean;
  loopConfig: LoopConfig;
  // Tool execution
  toolSettings: ToolExecutionSettings;
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
  keywords?: string[];
  memoryTriggers?: string[];
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
    keywords: ['code', 'programming', 'function', 'class', 'algorithm', 'debug', 'implement', 'syntax', 'bug', 'error', 'refactor', 'optimize', 'api', 'frontend', 'backend', 'web', 'react', 'python', 'javascript', 'typescript', 'sql', 'database'],
    memoryTriggers: ['i am a', "i'm a", 'i work as', 'my stack', 'my tech', 'i use', 'i prefer', 'my code'],
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
    keywords: ['write', 'story', 'poem', 'poetry', 'creative', 'fiction', 'narrative', 'character', 'plot', 'novel', 'script', 'dialogue', 'verse', 'rhym', 'metaphor'],
    memoryTriggers: ['i like', 'my favorite', 'i enjoy', 'i want'],
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
    keywords: ['research', 'analyze', 'analysis', 'study', 'report', 'data', 'findings', 'summary', 'conclusion', 'evidence', 'source', 'cite', 'reference'],
    memoryTriggers: ['i am', "i'm", 'my name is', 'i work', 'i study', 'research'],
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
    keywords: ['explain', 'teach', 'learn', 'understand', 'concept', 'how does', 'what is', 'why does', 'tutorial', 'lesson', 'explain', 'help me understand'],
    memoryTriggers: ['i am', "i'm", "i don't understand", 'can you explain', 'help me learn'],
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
    keywords: ['debate', 'argument', 'disagree', 'counter', 'prove', '反驳', 'argue', 'pros', 'cons', 'discussion', 'opposing'],
    memoryTriggers: ['i think', 'i believe', 'i feel', 'my opinion'],
  },
];

// Personality Presets - Rotating lineup of AI personas
export const PERSONALITY_PRESETS: Skill[] = [
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Guides with wisdom, encourages growth',
    systemPrompt: 'You are a wise mentor who guides others toward growth. Ask powerful questions. Share stories from experience. Encourage reflection. Celebrate progress.',
    icon: '🌱',
    category: 'guidance',
    builtIn: true,
    enabled: true,
    keywords: ['mentor', 'guide', 'coach', 'advice', 'help', 'career', 'growth', 'learn'],
    memoryTriggers: ['help me', 'advice', 'career', 'guidance', 'how should i'],
  },
  {
    id: 'skeptical-friend',
    name: 'Skeptical Friend',
    description: 'Questions everything, finds holes in logic',
    systemPrompt: 'You are a skeptical but friendly thinker. Question assumptions. Point out logical flaws. Play devil\'s advocate. Help separate fact from fiction.',
    icon: '🤔',
    category: 'thinking',
    builtIn: true,
    enabled: true,
    keywords: ['skeptical', 'question', 'really', 'sure', 'think', 'logic', 'fact', 'fake'],
    memoryTriggers: ['is this true', 'really', 'are you sure', 'but what if'],
  },
  {
    id: 'hype-man',
    name: 'Hype Man',
    description: 'Energetic, motivational, pushes you forward',
    systemPrompt: 'You are an energetic hype person who pushes others to achieve. Be enthusiastic. Celebrate wins. Motivate action. Don\'t let them quit.',
    icon: '🔥',
    category: 'motivation',
    builtIn: true,
    enabled: true,
    keywords: ['hype', 'motivate', 'energy', 'push', 'excited', 'go for it', 'you got this'],
    memoryTriggers: ['can i', 'should i', 'i want to', 'excited', 'nervous'],
  },
  {
    id: 'silent-observer',
    name: 'Silent Observer',
    description: 'Thoughtful, minimal, watches and waits',
    systemPrompt: 'You are a quiet, thoughtful observer. Speak less, observe more. Ask careful questions. Let silence do work. Offer insights only when ready.',
    icon: '👁️',
    category: 'contemplation',
    builtIn: true,
    enabled: true,
    keywords: ['observe', 'watch', 'think', 'silent', 'quiet', 'reflect', 'deep'],
    memoryTriggers: ['think about', 'ponder', 'reflect', 'what if', 'meditate'],
  },
  {
    id: 'devil-advocate',
    name: 'Devil\'s Advocate',
    description: 'Argues the opposite, tests your beliefs',
    systemPrompt: 'You argue the opposing view to help strengthen arguments. Take contrarian positions. Test assumptions. Make the user think from all angles.',
    icon: '😈',
    category: 'debate',
    builtIn: true,
    enabled: true,
    keywords: ['argue', 'opposite', 'contrarian', 'challenge', 'belief', 'position', 'viewpoint'],
    memoryTriggers: ['but what if', 'challenge', 'opposing', 'argue', 'prove me wrong'],
  },
  {
    id: 'elder-wisdom',
    name: 'Elder Wisdom',
    description: 'Age-old perspective, patient and timeless',
    systemPrompt: 'You speak with the wisdom of ages. Reference history and timeless truths. Be patient. Offer long-view perspective. Value simplicity and depth.',
    icon: '🧓',
    category: 'wisdom',
    builtIn: true,
    enabled: true,
    keywords: ['wisdom', 'elder', 'ancient', 'history', 'patient', 'timeless', 'generation'],
    memoryTriggers: ['grandfather', 'wise', 'old', 'generation', 'history', 'tradition'],
  },
  {
    id: 'chaos-agent',
    name: 'Chaos Agent',
    description: 'Unpredictable, challenges status quo',
    systemPrompt: 'You are an agent of chaos who challenges the status quo. Break rules. Question norms. Suggest wild alternatives. Don\'t let complacency win.',
    icon: '🌀',
    category: 'disruption',
    builtIn: true,
    enabled: true,
    keywords: ['chaos', 'break', 'rules', 'alternative', 'wild', 'crazy', 'rebel', 'disrupt'],
    memoryTriggers: ['different', 'unconventional', 'crazy', 'break', 'rebel', 'wild idea'],
  },
  {
    id: 'detail-oriented',
    name: 'Detail Oriented',
    description: 'Thorough, precise, catches everything',
    systemPrompt: 'You are extremely detail-oriented. Catch edge cases. Point out fine print. Verify specifics. Nothing slips past you.',
    icon: '🔍',
    category: 'analysis',
    builtIn: true,
    enabled: true,
    keywords: ['detail', 'edge case', 'specific', 'thorough', 'check', 'verify', 'fine print'],
    memoryTriggers: ['check', 'verify', 'detail', 'specific', 'edge case', 'what about'],
  },
];

// Default values used in DEFAULT_SETTINGS (not exported, must be defined first)
const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxIterations: 10,
  iterationTimeout: 120000,
  stopCondition: 'manual',
  stopKeyword: '',
  stopThreshold: 0,
  autoContinueOnToolResult: true,
  exitStrategy: 'afterToolResult',
};

const DEFAULT_TOOL_SETTINGS_VAL: ToolExecutionSettings = {
  timeout: 60000,
  maxRetries: 3,
  retryBackoff: 1000,
  maxConcurrent: 3,
  streamResults: true,
  promptPermission: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: `You are a helpful assistant.

## Tool Use Rules
- Use search tools for factual/current queries about news, prices, weather, or real-time information.
- If search tool returns {error} or empty results: respond "Search unavailable. Answering from internal knowledge."
- NEVER invent URLs, titles, or snippets when tools fail.
- Clearly state uncertainty when information may be outdated.
- Cite only results provided by search tools.`,
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
  // Model selectors
  summarizationModel: '',
  skillGenerationModel: '',
  // Chat persistence
  autoSaveInterval: 30,
  offlineQueueEnabled: true,
  conflictResolution: 'newest',
  lastSyncTimestamp: null,
  // Loop execution
  loopEnabled: false,
  loopConfig: DEFAULT_LOOP_CONFIG,
  // Tool execution
  toolSettings: DEFAULT_TOOL_SETTINGS_VAL,
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

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

export interface ToolSettings {
  enabled: boolean;
  requiresVault: boolean;
  description: string;
  category: 'filesystem' | 'web' | 'utility';
  requiresApproval?: boolean; // Tools that need user confirmation before execution
}

export const TOOL_SETTINGS: Record<string, ToolSettings> = {
  list_files: { enabled: true, requiresVault: true, description: "List files in directory", category: 'filesystem' },
  read_file: { enabled: true, requiresVault: true, description: "Read file contents", category: 'filesystem' },
  write_file: { enabled: true, requiresVault: true, description: "Write/create files", category: 'filesystem' },
  edit_file: { enabled: true, requiresVault: true, description: "Edit file contents", category: 'filesystem' },
  mkdir: { enabled: true, requiresVault: true, description: "Create directories", category: 'filesystem' },
  delete_file: { enabled: true, requiresVault: true, description: "Delete files", category: 'filesystem' },
  delete_directory: { enabled: true, requiresVault: true, description: "Delete empty directories", category: 'filesystem' },
  search_in_file: { enabled: true, requiresVault: true, description: "Search within files", category: 'filesystem' },
  get_file_info: { enabled: true, requiresVault: true, description: "Get file metadata", category: 'filesystem' },
  web_search: { enabled: true, requiresVault: false, description: "Search the web", category: 'web' },
  web_fetch: { enabled: true, requiresVault: false, description: "Fetch URL content", category: 'web' },
  calculate: { enabled: true, requiresVault: false, description: "Math calculations", category: 'utility' },
  codesearch: { enabled: true, requiresVault: false, description: "Search code using Exa Code API", category: 'web' },
  bash: { enabled: true, requiresVault: false, description: "Execute bash command", category: 'utility', requiresApproval: true },
  // Browser automation tools
  browser_navigate: { enabled: true, requiresVault: false, description: "Navigate to a URL", category: 'web' },
  browser_scrape: { enabled: true, requiresVault: false, description: "Scrape page content", category: 'web' },
  browser_screenshot: { enabled: true, requiresVault: false, description: "Take a screenshot", category: 'web' },
  browser_act: { enabled: true, requiresVault: false, description: "Perform browser action (click, fill, scroll)", category: 'web', requiresApproval: true },
  browser_get_cookies: { enabled: true, requiresVault: true, description: "Get browser cookies", category: 'web' },
  browser_set_cookies: { enabled: true, requiresVault: true, description: "Set browser cookies", category: 'web', requiresApproval: true },
  browser_close: { enabled: true, requiresVault: false, description: "Close browser session", category: 'web' },
  browser_save_cookies: { enabled: true, requiresVault: true, description: "Save cookies to vault", category: 'web' },
  browser_load_cookies: { enabled: true, requiresVault: true, description: "Load cookies from vault", category: 'web' },
  browser_history: { enabled: true, requiresVault: false, description: "Get browser history", category: 'web' },
  // Playwright CLI browser automation
  pw_browser: { enabled: true, requiresVault: false, description: "Playwright CLI browser automation (navigate, click, type, extract)", category: 'web' },
  pw_run: { enabled: true, requiresVault: false, description: "Run Playwright CLI command", category: 'web' },
};

// Tool execution settings - defined before DEFAULT_SETTINGS
export interface ToolExecutionSettings {
  timeout: number; // milliseconds
  maxRetries: number;
  retryBackoff: number; // milliseconds base
  maxConcurrent: number;
  streamResults: boolean;
  promptPermission: boolean;
}

export const DEFAULT_TOOL_SETTINGS: ToolExecutionSettings = {
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  retryBackoff: 1000, // 1 second base
  maxConcurrent: 3,
  streamResults: true,
  promptPermission: true
};