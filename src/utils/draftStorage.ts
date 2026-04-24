/**
 * Draft auto-save with version history for recovering unsent messages
 */

const DRAFT_STORAGE_KEY = 'mm_drafts';
const DRAFT_HISTORY_KEY = 'mm_draft_history';
const MAX_HISTORY_ITEMS = 10;

interface DraftEntry {
  conversationId: string;
  content: string;
  timestamp: number;
  attachments?: string[]; // Base64 URLs
}

interface DraftHistory {
  [conversationId: string]: DraftEntry[];
}

/**
 * Save draft to localStorage
 */
export function saveDraft(conversationId: string, content: string, attachments?: string[]): void {
  if (!content.trim() && (!attachments || attachments.length === 0)) {
    localStorage.removeItem(`mm_draft_${conversationId}`);
    return;
  }

  const draft: DraftEntry = {
    conversationId,
    content,
    timestamp: Date.now(),
    attachments,
  };

  localStorage.setItem(`mm_draft_${conversationId}`, JSON.stringify(draft));

  // Add to history
  addToHistory(draft);
}

/**
 * Load draft from localStorage
 */
export function loadDraft(conversationId: string): DraftEntry | null {
  const stored = localStorage.getItem(`mm_draft_${conversationId}`);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear draft
 */
export function clearDraft(conversationId: string): void {
  localStorage.removeItem(`mm_draft_${conversationId}`);
}

/**
 * Add entry to draft history
 */
function addToHistory(entry: DraftEntry): void {
  const history = getDraftHistory();

  if (!history[entry.conversationId]) {
    history[entry.conversationId] = [];
  }

  // Check if content is different enough to add to history
  const recentEntry = history[entry.conversationId][0];
  if (recentEntry && recentEntry.content === entry.content) {
    // Update timestamp but don't add new entry
    history[entry.conversationId][0].timestamp = entry.timestamp;
  } else {
    // Add new entry at the beginning
    history[entry.conversationId].unshift(entry);

    // Limit history size per conversation
    history[entry.conversationId] = history[entry.conversationId].slice(0, MAX_HISTORY_ITEMS);
  }

  // Clean old entries (older than 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const convId of Object.keys(history)) {
    history[convId] = history[convId].filter(e => e.timestamp > sevenDaysAgo);
    if (history[convId].length === 0) {
      delete history[convId];
    }
  }

  localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Get draft history for a conversation
 */
export function getDraftHistory(): DraftHistory {
  const stored = localStorage.getItem(DRAFT_HISTORY_KEY);
  if (!stored) return {};

  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Get version history for a specific conversation
 */
export function getConversationDraftHistory(conversationId: string): DraftEntry[] {
  const history = getDraftHistory();
  return history[conversationId] || [];
}

/**
 * Restore draft from history
 */
export function restoreFromHistory(conversationId: string, timestamp: number): DraftEntry | null {
  const history = getConversationDraftHistory(conversationId);
  return history.find(e => e.timestamp === timestamp) || null;
}

/**
 * Clear all draft history
 */
export function clearAllDraftHistory(): void {
  localStorage.removeItem(DRAFT_HISTORY_KEY);

  // Also clear all individual drafts
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('mm_draft_')) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Get storage size estimate
 */
export function getDraftStorageInfo(): { count: number; size: string } {
  const history = getDraftHistory();
  let count = 0;
  let totalSize = 0;

  for (const entries of Object.values(history)) {
    count += entries.length;
    totalSize += entries.reduce((sum, e) => sum + e.content.length, 0);
  }

  return {
    count,
    size: `${(totalSize / 1024).toFixed(1)} KB`,
  };
}

/**
 * React hook for draft management
 */
export function useDraft(conversationId: string | null) {
  const [draft, setDraft] = React.useState<DraftEntry | null>(null);
  const [history, setHistory] = React.useState<DraftEntry[]>([]);

  React.useEffect(() => {
    if (!conversationId) {
      setDraft(null);
      setHistory([]);
      return;
    }

    setDraft(loadDraft(conversationId));
    setHistory(getConversationDraftHistory(conversationId));
  }, [conversationId]);

  const updateDraft = React.useCallback((content: string, attachments?: string[]) => {
    if (!conversationId) return;
    saveDraft(conversationId, content, attachments);
    setDraft({ conversationId, content, timestamp: Date.now(), attachments });
  }, [conversationId]);

  const restoreDraft = React.useCallback((timestamp: number) => {
    const entry = restoreFromHistory(conversationId || '', timestamp);
    if (entry) {
      setDraft(entry);
    }
    return entry;
  }, [conversationId]);

  const clear = React.useCallback(() => {
    if (!conversationId) return;
    clearDraft(conversationId);
    setDraft(null);
  }, [conversationId]);

  return {
    draft,
    history,
    updateDraft,
    restoreDraft,
    clear,
  };
}