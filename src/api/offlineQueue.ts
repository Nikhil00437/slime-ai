import { ChatMessage } from '../types';

const DB_NAME = 'Slime-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pendingMessages';
const CONV_STORE = 'conversationDrafts';

let db: IDBDatabase | null = null;

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
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(CONV_STORE)) {
        database.createObjectStore(CONV_STORE, { keyPath: 'id' });
      }
    };
  });
}

export interface PendingMessage {
  id: string;
  conversationId: string;
  content: string;
  attachments?: { name: string; url: string; type: string }[];
  modelId: string;
  provider: string;
  timestamp: number;
  retryCount: number;
}

export interface ConversationDraft {
  id: string;
  title: string;
  modelId: string;
  provider: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Add message to offline queue
export async function queueMessage(message: PendingMessage): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(message);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all pending messages for a conversation
export async function getPendingMessages(conversationId: string): Promise<PendingMessage[]> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('conversationId');
    const request = index.getAll(conversationId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending messages
export async function getAllPendingMessages(): Promise<PendingMessage[]> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove message from queue
export async function removePendingMessage(messageId: string): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(messageId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Update retry count
export async function incrementRetryCount(messageId: string): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(messageId);
    getReq.onsuccess = () => {
      const msg = getReq.result as PendingMessage;
      if (msg) {
        msg.retryCount++;
        store.put(msg);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Save conversation draft locally
export async function saveConversationDraft(draft: ConversationDraft): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CONV_STORE, 'readwrite');
    const store = tx.objectStore(CONV_STORE);
    const request = store.put(draft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Load all conversation drafts
export async function loadConversationDrafts(): Promise<ConversationDraft[]> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CONV_STORE, 'readonly');
    const store = tx.objectStore(CONV_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Load specific draft
export async function loadConversationDraft(id: string): Promise<ConversationDraft | null> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CONV_STORE, 'readonly');
    const store = tx.objectStore(CONV_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Delete conversation draft
export async function deleteConversationDraft(id: string): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(CONV_STORE, 'readwrite');
    const store = tx.objectStore(CONV_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all pending messages
export async function clearOfflineQueue(): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get queue count
export async function getQueueCount(): Promise<number> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Queue size for UI display
export interface OfflineQueueStatus {
  pendingCount: number;
  isOnline: boolean;
  lastChecked: number;
}

export async function getOfflineQueueStatus(): Promise<OfflineQueueStatus> {
  const count = await getQueueCount();
  return {
    pendingCount: count,
    isOnline: isOnline(),
    lastChecked: Date.now(),
  };
}