import { ChatMessage, Conversation, ProviderType } from '../types';
import { MemoryEntry, MemoryCategory } from '../slime/types';
import { saveMemoryEntry, getLastMemoryTimestamp } from './skillStorage';
import { nonStreamChatCompletion } from './providers';

let memoryIntervalId: number | null = null;
let isProcessingMemory = false;

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
