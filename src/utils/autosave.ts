/**
 * Auto-save conversation utilities
 * Saves conversations to localStorage periodically
 */

import { Conversation, ChatMessage } from '../types';

const AUTOSAVE_KEY = 'mm_autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const MAX_AUTOSAVE_INSTANCES = 50;

interface AutosaveEntry {
  conversationId: string;
  conversation: Conversation;
  timestamp: number;
}

/**
 * Save conversation state for recovery
 */
export function saveConversationAutosave(conversation: Conversation): void {
  const autosaves = getAutosaveEntries();
  
  // Update or create entry
  const existingIndex = autosaves.findIndex(
    entry => entry.conversationId === conversation.id
  );

  const entry: AutosaveEntry = {
    conversationId: conversation.id,
    conversation,
    timestamp: Date.now(),
  };

  if (existingIndex !== -1) {
    autosaves[existingIndex] = entry;
  } else {
    autosaves.unshift(entry);
  }

  // Limit stored instances
  const trimmed = autosaves.slice(0, MAX_AUTOSAVE_INSTANCES);
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(trimmed));
}

/**
 * Get all autosave entries
 */
export function getAutosaveEntries(): AutosaveEntry[] {
  const stored = localStorage.getItem(AUTOSAVE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Get autosave for specific conversation
 */
export function getConversationAutosave(conversationId: string): AutosaveEntry | null {
  const entries = getAutosaveEntries();
  return entries.find(e => e.conversationId === conversationId) || null;
}

/**
 * Check if conversation has autosave data
 */
export function hasAutosave(conversationId: string): boolean {
  return getConversationAutosave(conversationId) !== null;
}

/**
 * Clear autosave for specific conversation
 */
export function clearConversationAutosave(conversationId: string): void {
  const autosaves = getAutosaveEntries().filter(
    e => e.conversationId !== conversationId
  );
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosaves));
}

/**
 * Clear all autosave data
 */
export function clearAllAutosaves(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

/**
 * Get autosave storage info
 */
export function getAutosaveStorageInfo(): { count: number; oldestTimestamp: number | null; newestTimestamp: number | null } {
  const entries = getAutosaveEntries();
  
  if (entries.length === 0) {
    return { count: 0, oldestTimestamp: null, newestTimestamp: null };
  }

  const timestamps = entries.map(e => e.timestamp).sort((a, b) => a - b);
  
  return {
    count: entries.length,
    oldestTimestamp: timestamps[0],
    newestTimestamp: timestamps[timestamps.length - 1],
  };
}

/**
 * React hook for auto-saving conversations
 */
export function useAutosave(
  conversation: Conversation | null,
  interval: number = AUTOSAVE_INTERVAL
) {
  React.useEffect(() => {
    if (!conversation) return;

    const timer = setInterval(() => {
      saveConversationAutosave(conversation);
    }, interval);

    // Save immediately on mount
    saveConversationAutosave(conversation);

    return () => {
      clearInterval(timer);
    };
  }, [conversation, interval]);
}

// Import React for the hook
import * as React from 'react';

/**
 * Recovery manager for finding lost conversations
 */
export function getRecoverableConversations(): AutosaveEntry[] {
  const autosaves = getAutosaveEntries();
  
  // Filter to conversations that might have been lost
  // (no messages or last message is old)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  return autosaves.filter(entry => {
    const conv = entry.conversation;
    // Has no messages or last update was over an hour ago
    if (conv.messages.length === 0) return true;
    if (conv.updatedAt < oneHourAgo) return true;
    return false;
  });
}