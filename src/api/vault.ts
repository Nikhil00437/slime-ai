import { Conversation, ChatMessage } from '../types';

const CHATS_FOLDER = 'chats';
const MEMORY_FOLDER = 'memory';
const WEBSCRAPER_FOLDER = 'webscrape';
const DB_NAME = 'Slime-vault';
const DB_VERSION = 1;
const HANDLE_STORE = 'handles';

export interface FileSystemAPI {
  showDirectoryPicker: (options?: {
    mode?: 'read' | 'readwrite';
    startIn?: 'documents' | 'downloads' | 'desktop';
  }) => Promise<FileSystemDirectoryHandle>;
}

declare global {
  interface Window {
    showDirectoryPicker?: FileSystemAPI['showDirectoryPicker'];
  }
}

let vaultHandle: FileSystemDirectoryHandle | null = null;
let db: IDBDatabase | null = null;

export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(HANDLE_STORE)) {
        database.createObjectStore(HANDLE_STORE);
      }
    };
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HANDLE_STORE, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.put(handle, 'default');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HANDLE_STORE, 'readonly');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.get('default');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function selectVaultFolder(): Promise<string | null> {
  if (!hasFileSystemAccess()) {
    console.warn('File System Access API not supported');
    return null;
  }

  try {
    const handle = await window.showDirectoryPicker!({
      mode: 'readwrite',
      startIn: 'documents',
    });
    vaultHandle = handle;

    await ensureFoldersExist(handle);
    await saveHandle(handle);

    return handle.name;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Failed to select vault folder:', err);
    }
    return null;
  }
}

export async function restoreVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (vaultHandle) return vaultHandle;

  try {
    const handle = await loadHandle();
    if (!handle) return null;

    const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      vaultHandle = handle;
      return handle;
    }

    const requestPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (requestPermission === 'granted') {
      vaultHandle = handle;
      return handle;
    }

    return null;
  } catch {
    return null;
  }
}

export async function requestVaultPermission(): Promise<boolean> {
  if (!vaultHandle) return false;

  try {
    const permission = await (vaultHandle as any).requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

async function ensureFoldersExist(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await handle.getDirectoryHandle(CHATS_FOLDER, { create: true });
  } catch (e) {
    console.warn('Could not create chats folder:', e);
  }
  try {
    await handle.getDirectoryHandle(MEMORY_FOLDER, { create: true });
  } catch (e) {
    console.warn('Could not create memory folder:', e);
  }
  try {
    await handle.getDirectoryHandle(WEBSCRAPER_FOLDER, { create: true });
  } catch (e) {
    console.warn('Could not create webscrape folder:', e);
  }
}

async function getOrCreateFolder(
  parentHandle: FileSystemDirectoryHandle,
  folderName: string
): Promise<FileSystemDirectoryHandle> {
  return parentHandle.getDirectoryHandle(folderName, { create: true });
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function conversationToMarkdown(conv: Conversation): string {
  // Extract all unique model IDs from messages (only for assistant messages)
  const modelIds = [...new Set(
    conv.messages
      .filter(m => m.role === 'assistant' && m.model)
      .map(m => m.model)
  )];
  
  const frontmatterLines = [
    `id: "${conv.id}"`,
    `title: "${conv.title}"`,
    `model: "${conv.modelId}"`,
  ];
  
  if (modelIds.length > 0) {
    frontmatterLines.push(`models: ${JSON.stringify(modelIds)}`);
  }
  
  frontmatterLines.push(
    `provider: "${conv.provider}"`,
    `createdAt: ${conv.createdAt}`,
    `updatedAt: ${conv.updatedAt}`
  );
  
  if (conv.memoryEnabled !== undefined) {
    frontmatterLines.push(`memoryEnabled: ${conv.memoryEnabled}`);
  }
  
  if (conv.agentSteps && conv.agentSteps.length > 0) {
    frontmatterLines.push(`agentSteps: ${JSON.stringify(conv.agentSteps)}`);
  }
  
  const lines: string[] = [
    '---',
    ...frontmatterLines,
    '---',
    '',
  ];

  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const time = formatTimestamp(msg.timestamp);
    lines.push(`## ${role} (${time})`);
    lines.push('');
    
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        if (att.type === 'image') {
          lines.push(`![${att.name}](${att.url})`);
        } else {
          lines.push(`[File: ${att.name}]`);
        }
      }
      lines.push('');
    }

    // Save toolCalls if present
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      lines.push(`[toolCalls: ${JSON.stringify(msg.toolCalls)}]`);
      lines.push('');
    }

    // Save toolCallId for tool result messages
    if (msg.toolCallId) {
      lines.push(`[toolCallId: ${msg.toolCallId}]`);
      lines.push('');
    }

    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

function markdownToConversation(
  content: string,
  fileName: string
): Conversation | null {
  try {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) return null;

    const frontmatter: Record<string, string | number | string[]> = {};
    const fmLines = frontmatterMatch[1].split('\n');
    for (const line of fmLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith('[')) {
        // Handle JSON array for models field
        try {
          frontmatter[key] = JSON.parse(value);
          continue;
        } catch {
          // Not valid JSON, treat as string
        }
      } else if (!isNaN(Number(value))) {
        frontmatter[key] = Number(value);
        continue;
      }

      frontmatter[key] = value;
    }

    const body = content.slice(frontmatterMatch[0].length);
    const messages: ChatMessage[] = [];

    const sections = body.split(/^##\s+/m).filter(Boolean);
    const modelArray = Array.isArray(frontmatter.models) ? frontmatter.models as string[] : [];
    let modelIndex = 0;
    
    for (const section of sections) {
      // Match User, Assistant, or Tool roles
      const match = section.match(/^(User|Assistant|Tool)\s*\(([^)]+)\)\n([\s\S]*)$/);
      if (match) {
        const role = match[1].toLowerCase() as 'user' | 'assistant' | 'tool';

        // If assistant message and we have a models array, use the next model
        // Otherwise use the default model
        let messageModel = String(frontmatter.model || '');
        if (role === 'assistant' && modelArray.length > 0 && modelIndex < modelArray.length) {
          messageModel = modelArray[modelIndex] || messageModel;
          modelIndex = (modelIndex + 1) % modelArray.length; // Cycle through models
        }

        const sectionContent = match[3].trim();

        // Extract toolCalls if present (handles both objects and arrays)
        let toolCalls: any[] | undefined;
        const toolCallsMatch = sectionContent.match(/\[toolCalls:\s*(\{.*?\}|\[.*?\])/s);
        if (toolCallsMatch) {
          try {
            const parsed = JSON.parse(toolCallsMatch[1]);
            // Ensure it's an array
            toolCalls = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Extract toolCallId if present
        let toolCallId: string | undefined;
        const toolCallIdMatch = sectionContent.match(/\[toolCallId:\s*(.+?)\]/s);
        if (toolCallIdMatch) {
          toolCallId = toolCallIdMatch[1].trim();
        }

        // Remove the toolCalls and toolCallId markers from content
        let cleanContent = sectionContent
          .replace(/\[toolCalls:\s*(\{.*?\}|\[.*?\])\]/gs, '')
          .replace(/\[toolCallId:\s*.*?\]/gs, '')
          .trim();

        messages.push({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          content: cleanContent,
          model: messageModel,
          provider: (frontmatter.provider as any) || 'ollama',
          timestamp: new Date(match[2]).getTime(),
          toolCalls,
          toolCallId,
        });
      }
    }

    return {
      id: String(frontmatter.id || fileName.replace('.md', '')),
      title: String(frontmatter.title || 'Untitled'),
      messages,
      createdAt: Number(frontmatter.createdAt) || Date.now(),
      updatedAt: Number(frontmatter.updatedAt) || Date.now(),
      modelId: String(frontmatter.model || ''),
      provider: (frontmatter.provider as any) || 'ollama',
      modelIds: Array.isArray(frontmatter.models) ? frontmatter.models : undefined,
      memoryEnabled: String(frontmatter.memoryEnabled) === 'true',
      agentSteps: Array.isArray(frontmatter.agentSteps) ? (frontmatter.agentSteps as any[]) : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveConversationToVault(conv: Conversation): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const chatsFolder = await getOrCreateFolder(handle, CHATS_FOLDER);
    const fileName = `${formatDate(conv.createdAt)}-${conv.id}.md`;
    const fileHandle = await chatsFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(conversationToMarkdown(conv));
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to save conversation to vault:', err);
    return false;
  }
}

export async function loadConversationsFromVault(): Promise<Conversation[]> {
  const handle = await restoreVaultHandle();
  if (!handle) return [];

  try {
    const chatsFolder = await getOrCreateFolder(handle, CHATS_FOLDER);
    const conversations: Conversation[] = [];

    for await (const entry of (chatsFolder as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const conv = markdownToConversation(content, entry.name);
          if (conv && conv.messages.length > 0) {
            conversations.push(conv);
          }
        } catch (e) {
          console.warn(`Failed to read file: ${entry.name}`, e);
        }
      }
    }

    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to load conversations from vault:', err);
    return [];
  }
}

export async function deleteConversationFromVault(conv: Conversation): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const chatsFolder = await getOrCreateFolder(handle, CHATS_FOLDER);
    const fileName = `${formatDate(conv.createdAt)}-${conv.id}.md`;
    await chatsFolder.removeEntry(fileName);
    return true;
  } catch (err) {
    console.error('Failed to delete conversation from vault:', err);
    return false;
  }
}

export interface ModelMemory {
  modelId: string;
  provider: string;
  context: string;
  lastUpdated: number;
}

export interface UserMemory {
  name?: string;
  facts: string[];
  preferences: Record<string, string>;
}

export async function saveModelMemory(memory: ModelMemory): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const memoryFolder = await getOrCreateFolder(handle, MEMORY_FOLDER);
    const fileName = `${memory.provider}-${memory.modelId.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    const fileHandle = await memoryFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(memory, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadModelMemories(): Promise<ModelMemory[]> {
  const handle = await restoreVaultHandle();
  if (!handle) return [];

  try {
    const memoryFolder = await getOrCreateFolder(handle, MEMORY_FOLDER);
    const memories: ModelMemory[] = [];

    for await (const entry of (memoryFolder as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name !== 'user-memory.json') {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const memory = JSON.parse(content) as ModelMemory;
          if (memory.modelId && memory.context) {
            memories.push(memory);
          }
        } catch {
          // skip invalid files
        }
      }
    }

    return memories;
  } catch {
    return [];
  }
}

export async function saveUserMemory(memory: UserMemory): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const memoryFolder = await getOrCreateFolder(handle, MEMORY_FOLDER);
    const fileHandle = await memoryFolder.getFileHandle('user-memory.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(memory, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadUserMemory(): Promise<UserMemory | null> {
  const handle = await restoreVaultHandle();
  if (!handle) return null;

  try {
    const memoryFolder = await getOrCreateFolder(handle, MEMORY_FOLDER);
    const fileHandle = await memoryFolder.getFileHandle('user-memory.json');
    const file = await fileHandle.getFile();
    const content = await file.text();
    return JSON.parse(content) as UserMemory;
  } catch {
    return null;
  }
}

export interface VaultEnv {
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GROK_API_KEY?: string;
  SKILL_GENERATION_MODEL?: string;
  SKILL_GENERATION_PROVIDER?: string;
  MEMORY_PROCESSING_MODEL?: string;
  MEMORY_PROCESSING_PROVIDER?: string;
  MEMORY_AUTO_ENABLED?: string;
  MEMORY_INTERVAL_MINUTES?: string;
  [key: string]: string | undefined;
}

export async function saveEnvToVault(env: VaultEnv): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    // First load existing .env content
    let existingEnv: VaultEnv = {};
    try {
      const fileHandle = await handle.getFileHandle('.env');
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          if (key && value) {
            existingEnv[key] = value;
          }
        }
      }
    } catch {
      // .env doesn't exist yet, that's fine
    }

    // Merge new values with existing
    const mergedEnv: VaultEnv = { ...existingEnv, ...env };

    // Write merged content
    const lines: string[] = [
      '# SlimeAI Environment Variables',
      '# Do not commit this file to version control',
      '',
    ];

    for (const [key, value] of Object.entries(mergedEnv)) {
      if (value) {
        lines.push(`${key}=${value}`);
      }
    }

    const fileHandle = await handle.getFileHandle('.env', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(lines.join('\n'));
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to save .env to vault:', err);
    return false;
  }
}

export async function loadEnvFromVault(): Promise<VaultEnv> {
  const handle = await restoreVaultHandle();
  if (!handle) return {};

  try {
    const fileHandle = await handle.getFileHandle('.env');
    const file = await fileHandle.getFile();
    const content = await file.text();

    const env: VaultEnv = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (key && value) {
          env[key] = value;
        }
      }
    }

    return env;
  } catch {
    return {};
  }
}

export async function deleteEnvFromVault(): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    await handle.removeEntry('.env');
    return true;
  } catch {
    return false;
  }
}

export async function syncToVault(
  conversations: Conversation[]
): Promise<{ synced: number; failed: number }> {
  const handle = await restoreVaultHandle();
  if (!handle) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const conv of conversations) {
    try {
      const success = await saveConversationToVault(conv);
      if (success) synced++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export function isVaultConnected(): boolean {
  return vaultHandle !== null;
}

const SKILLS_FOLDER = 'skills';

export async function saveSkillsToVault(skills: any[]): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const skillsFolder = await getOrCreateFolder(handle, SKILLS_FOLDER);
    
    const gluttony = skills.find(s => s.id === 'gluttony-skill');
    if (gluttony) {
      const gluttonyFile = await skillsFolder.getFileHandle('gluttony.skill', { create: true });
      const writable = await gluttonyFile.createWritable();
      await writable.write(JSON.stringify(gluttony, null, 2));
      await writable.close();
    }

    const customSkills = skills.filter(s => s.id !== 'gluttony-skill');
    for (const skill of customSkills) {
      const fileName = `${skill.id}.skill`;
      const fileHandle = await skillsFolder.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(skill, null, 2));
      await writable.close();
    }
    
    return true;
  } catch (err) {
    console.error('Failed to save skills to vault:', err);
    return false;
  }
}

export async function loadSkillsFromVault(): Promise<any[]> {
  const handle = await restoreVaultHandle();
  if (!handle) return [];

  try {
    const skillsFolder = await getOrCreateFolder(handle, SKILLS_FOLDER);
    const skills: any[] = [];

    for await (const entry of (skillsFolder as any).values()) {
      if (entry.kind === 'file' && (entry.name.endsWith('.skill') || entry.name.endsWith('.json'))) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const skill = JSON.parse(content);
          if (skill.id && skill.name) {
            skills.push(skill);
          }
        } catch (err) {
          console.warn('Failed to read skill file:', entry.name, err);
        }
      }
    }

    return skills;
  } catch (err) {
    console.error('Failed to load skills from vault:', err);
    return [];
  }
}

export function getVaultName(): string | null {
  return vaultHandle?.name || null;
}

/* ── Web Scraper Storage ── */

export interface WebScrapedPage {
  title: string;
  url: string;
  snippet: string;
  content: string;
  scrapedAt: string;
  query: string;
}

export async function saveScrapedPagesToVault(
  pages: WebScrapedPage[],
  query: string
): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const webscrapeFolder = await getOrCreateFolder(handle, WEBSCRAPER_FOLDER);
    
    // Create filename based on query and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeQuery = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    const fileName = `${safeQuery}_${timestamp}.md`;
    
    // Generate markdown content
    const lines: string[] = [
      `---`,
      `query: "${query}"`,
      `savedAt: ${Date.now()}`,
      `pages: ${pages.length}`,
      `---`,
      ``,
      `# Search Results: "${query}"`,
      ``,
      `**Date:** ${new Date().toISOString()}`,
      `**Pages:** ${pages.length}`,
      ``,
      `---`,
      ``,
    ];
    
    pages.forEach((p, i) => {
      lines.push(`## ${i + 1}. ${p.title}`);
      lines.push(``);
      lines.push(`**URL:** <${p.url}>`);
      lines.push(`**Scraped:** ${p.scrapedAt}`);
      lines.push(``);
      lines.push(`### Content`);
      lines.push(``);
      lines.push(p.content);
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
    });
    
    const fileHandle = await webscrapeFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(lines.join('\n'));
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to save scraped pages to vault:', err);
    return false;
  }
}

export async function loadScrapedPagesFromVault(): Promise<{ query: string; pages: WebScrapedPage[]; savedAt: number; fileName: string }[]> {
  const handle = await restoreVaultHandle();
  if (!handle) return [];

  try {
    const webscrapeFolder = await getOrCreateFolder(handle, WEBSCRAPER_FOLDER);
    const scrapedData: { query: string; pages: WebScrapedPage[]; savedAt: number; fileName: string }[] = [];

    for await (const entry of (webscrapeFolder as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          
          // Extract frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
          if (!frontmatterMatch) continue;
          
          let query = '';
          let savedAt = 0;
          let pageCount = 0;
          
          const fmLines = frontmatterMatch[1].split('\n');
          for (const line of fmLines) {
            if (line.startsWith('query:')) {
              query = line.replace('query:', '').trim().replace(/^["']|["']$/g, '');
            } else if (line.startsWith('savedAt:')) {
              savedAt = parseInt(line.replace('savedAt:', '').trim(), 10);
            } else if (line.startsWith('pages:')) {
              pageCount = parseInt(line.replace('pages:', '').trim(), 10);
            }
          }
          
          // Parse pages from markdown sections
          const pages: WebScrapedPage[] = [];
          const sections = content.split(/^##\s+\d+\.\s+/m).filter(Boolean);
          
          for (const section of sections) {
            if (!section.trim()) continue;
            
            // Extract URL from **URL:** <...>
            const urlMatch = section.match(/\*\*URL:\*\*\s*<(.+)>/);
            const scrapedAtMatch = section.match(/\*\*Scraped:\*\*\s*(.+)/);
            
            // Get title from first line (after ##)
            const titleMatch = section.match(/^#?\s*(.+?)(?:\n|$)/);
            const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
            
            // Get content between "### Content" and next "---"
            const contentMatch = section.match(/### Content\s*\n\n([\s\S]*?)(?=\n---|\n##|\n*$)/);
            const pageContent = contentMatch ? contentMatch[1].trim() : '';
            
            // Generate snippet from first 200 chars of content
            const snippet = pageContent.slice(0, 200).replace(/[#*]/g, '').trim();
            
            if (urlMatch) {
              pages.push({
                title,
                url: urlMatch[1],
                snippet,
                content: pageContent,
                scrapedAt: scrapedAtMatch ? scrapedAtMatch[1].trim() : new Date().toISOString(),
                query,
              });
            }
          }
          
          if (pages.length > 0) {
            scrapedData.push({
              query: query || entry.name.replace('.md', ''),
              pages,
              savedAt: savedAt || file.lastModified,
              fileName: entry.name,
            });
          }
        } catch (err) {
          console.warn('Failed to read scraped file:', entry.name, err);
        }
      }
    }

    // Sort by savedAt descending (newest first)
    return scrapedData.sort((a, b) => b.savedAt - a.savedAt);
  } catch (err) {
    console.error('Failed to load scraped pages from vault:', err);
    return [];
  }
}

export async function deleteScrapedFileFromVault(fileName: string): Promise<boolean> {
  const handle = await restoreVaultHandle();
  if (!handle) return false;

  try {
    const webscrapeFolder = await getOrCreateFolder(handle, WEBSCRAPER_FOLDER);
    await webscrapeFolder.removeEntry(fileName);
    return true;
  } catch (err) {
    console.error('Failed to delete scraped file from vault:', err);
    return false;
  }
}
