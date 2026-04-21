import { ChatMessage, Conversation, ProviderType } from '../types';
import { MemoryEntry, MemoryCategory } from '../slime/types';
import { saveMemoryEntry, getLastMemoryTimestamp, loadMemory } from './skillStorage';
import { nonStreamChatCompletion } from './providers';

let memoryIntervalId: number | null = null;
let isProcessingMemory = false;

// ==================== Working Memory Buffer ====================

export interface WorkingMemoryItem {
  id: string;
  content: string;
  important: boolean;
  createdAt: number;
  turnsAgo: number;
}

export interface WorkingMemoryState {
  items: WorkingMemoryItem[];
  tokenCount: number;
  maxTokens: number;
  summarizeAfter: number;
  autoSummarize: boolean;
}

const DEFAULT_WORKING_MEMORY: WorkingMemoryState = {
  items: [],
  tokenCount: 0,
  maxTokens: 4000,
  summarizeAfter: 10,
  autoSummarize: true,
};

// Working memory state
let workingMemory: WorkingMemoryState = { ...DEFAULT_WORKING_MEMORY };
let turnCount = 0;

export function getWorkingMemory(): WorkingMemoryState {
  return workingMemory;
}

export function addToWorkingMemory(content: string, important = false): void {
  const item: WorkingMemoryItem = {
    id: `wm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content,
    important,
    createdAt: Date.now(),
    turnsAgo: 0,
  };
  
  // Update turnsAgo for existing items
  workingMemory.items = workingMemory.items.map(i => ({
    ...i,
    turnsAgo: i.turnsAgo + 1,
  }));
  
  workingMemory.items.unshift(item);
  
  // Update token count estimate
  const totalTokens = estimateTokens(JSON.stringify(workingMemory.items));
  workingMemory.tokenCount = totalTokens;
  
  turnCount++;
  
  // Auto-summarize check
  if (workingMemory.autoSummarize && turnCount >= workingMemory.summarizeAfter) {
    triggerSummarization();
  }
  
  // Trim if over budget
  while (workingMemory.tokenCount > workingMemory.maxTokens && workingMemory.items.length > 0) {
    const removed = workingMemory.items.pop();
    if (removed) {
      workingMemory.tokenCount -= estimateTokens(removed.content);
    }
  }
}

export function markImportant(itemId: string): void {
  workingMemory.items = workingMemory.items.map(i =>
    i.id === itemId ? { ...i, important: true } : i
  );
}

export function removeFromWorkingMemory(itemId: string): void {
  const item = workingMemory.items.find(i => i.id === itemId);
  if (item) {
    workingMemory.tokenCount -= estimateTokens(item.content);
  }
  workingMemory.items = workingMemory.items.filter(i => i.id !== itemId);
}

export function clearWorkingMemory(): void {
  workingMemory = { ...DEFAULT_WORKING_MEMORY };
  turnCount = 0;
}

export function setWorkingMemorySettings(settings: Partial<WorkingMemoryState>): void {
  workingMemory = { ...workingMemory, ...settings };
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

async function triggerSummarization(): Promise<void> {
  if (workingMemory.items.length < 3) return;
  
  const importantItems = workingMemory.items.filter(i => i.important);
  const oldItems = workingMemory.items.filter(i => i.turnsAgo > 5);
  
  if (importantItems.length === 0 && oldItems.length === 0) {
    turnCount = 0;
    return;
  }
  
  // Summarization would happen here - for now just reset count
  console.log('[Memory] Triggered summarization, important items:', importantItems.length);
  turnCount = 0;
}

export function getContextWindow(): { context: string; tokenCount: number; remaining: number } {
  const context = workingMemory.items
    .slice(0, 20)
    .map(i => i.content)
    .join('\n---\n');
  
  const tokens = workingMemory.tokenCount;
  return {
    context,
    tokenCount: tokens,
    remaining: Math.max(0, workingMemory.maxTokens - tokens),
  };
}

export function searchWorkingMemory(query: string): WorkingMemoryItem[] {
  const queryLower = query.toLowerCase();
  return workingMemory.items.filter(i =>
    i.content.toLowerCase().includes(queryLower)
  );
}

// ==================== Original Memory Settings ====================

export interface MemorySettings {
  enabled: boolean;
  intervalMinutes: number;
  modelId: string;
  provider: ProviderType;
  baseUrl: string;
  apiKey?: string;
}

const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  enabled: false,
  intervalMinutes: 15,
  modelId: '',
  provider: 'ollama' as ProviderType,
  baseUrl: '',
  apiKey: undefined,
};

export function loadMemorySettings(): MemorySettings {
  try {
    const stored = localStorage.getItem('Slimeemory_settings');
    if (stored) return { ...DEFAULT_MEMORY_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_MEMORY_SETTINGS;
}

export function saveMemorySettings(settings: MemorySettings): void {
  localStorage.setItem('Slime_memory_settings', JSON.stringify(settings));
}

export function startMemoryProcessor(
  conversations: () => Conversation[],
  settings: MemorySettings
) {
  stopMemoryProcessor();

  if (!settings.enabled || !settings.modelId || !settings.provider) return;

  const intervalMs = settings.intervalMinutes * 60 * 1000;
  const randomOffset = Math.random() * intervalMs * 0.5;

  memoryIntervalId = window.setTimeout(() => {
    processMemory(conversations, settings);
    memoryIntervalId = window.setInterval(() => {
      processMemory(conversations, settings);
    }, intervalMs);
  }, randomOffset);
}

export function stopMemoryProcessor(): void {
  if (memoryIntervalId) {
    clearInterval(memoryIntervalId);
    memoryIntervalId = null;
  }
}

async function processMemory(
  conversations: () => Conversation[],
  settings: MemorySettings
): Promise<void> {
  if (isProcessingMemory) return;
  isProcessingMemory = true;

  try {
    const lastTimestamp = await getLastMemoryTimestamp();
    const allConversations = conversations();

    const recentMessages: ChatMessage[] = [];
    for (const conv of allConversations) {
      for (const msg of conv.messages) {
        if (msg.timestamp > lastTimestamp && msg.role === 'user') {
          recentMessages.push(msg);
        }
      }
    }

    if (recentMessages.length === 0) return;

    const context = recentMessages
      .map(m => `User: ${m.content}`)
      .join('\n\n');

    const prompt = `Review the following conversation history and extract key information points. 
Categorize each point as:
- PERPETUALLY: Information for long-term memory (facts about user, important knowledge)
- PERIODICALLY: Information for medium-term (current project context, recent preferences)
- EPHEMERALLY: Information for immediate use (temporary calculations, quick references)

Format your response as a JSON array with this structure:
[{"content": "key point here", "category": "PERPETUALLY|PERIODICALLY|EPHEMERALLY"}]

Conversation:
${context}`;

    const result = await nonStreamChatCompletion(
      settings.provider,
      settings.baseUrl,
      settings.modelId,
      [],
      prompt,
      0.3,
      2000,
      settings.apiKey
    );

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      isProcessingMemory = false;
      return;
    }

    const entries = JSON.parse(jsonMatch[0]) as Array<{ content: string; category: string }>;

    for (const entry of entries) {
      const category: MemoryCategory = 
        entry.category === 'PERPETUALLY' ? 'perpetually' :
        entry.category === 'EPHEMERALLY' ? 'ephemerally' : 'periodically';

      const memoryEntry: MemoryEntry = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: entry.content,
        category,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      await saveMemoryEntry(memoryEntry);
    }
  } catch (err) {
    console.error('Memory processing failed:', err);
  } finally {
    isProcessingMemory = false;
  }
}

export function getMemoryCategories(): MemoryCategory[] {
  return ['perpetually', 'periodically', 'ephemerally'];
}

// Search memory entries using simple keyword matching
export async function searchMemory(query: string, maxResults: number = 5): Promise<MemoryEntry[]> {
  try {
    const allMemory = await loadMemory();
    
    if (!query.trim()) {
      return allMemory.slice(0, maxResults);
    }
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    // Score each entry based on keyword matches
    const scored = allMemory.map(entry => {
      const contentLower = entry.content.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 10;
        }
        // Bonus for exact match
        if (contentLower === queryLower) {
          score += 20;
        }
        // Bonus for word boundaries
        if (contentLower.split(/\s+/).some(w => w === word)) {
          score += 5;
        }
      }
      
      return { entry, score };
    });
    
    // Sort by score (descending) and return top results
    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(s => s.entry);
    
    return results;
  } catch (err) {
    console.error('Memory search failed:', err);
    return [];
  }
}

// Extract keywords from a query for memory search
export function extractMemoryKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'need', 'dare', 'ought',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
    'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
    'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'any', 'also', 'get', 'got', 'make',
    'made', 'want', 'use', 'used', 'tell', 'told', 'say', 'said', 'know',
    'knew', 'think', 'thought', 'see', 'saw', 'come', 'came', 'take',
    'took', 'give', 'gave', 'tell', 'asked', 'let', 'put', 'keep', 'kept'
  ]);
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
