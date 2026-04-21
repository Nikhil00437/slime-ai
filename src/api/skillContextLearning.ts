/**
 * Skill Context Learning - Tracks skill usage patterns
 * Phase 1: Smart Auto-Detection (Conversation Context Learning)
 */

import type { ConversationType } from '../utils/skillDetection';

const DB_NAME = 'skill-learning-db';
const DB_VERSION = 1;

interface SkillUsageRecord {
  id?: number;
  skillId: string;
  conversationType: ConversationType;
  outcome: 'success' | 'neutral' | 'failed';
  modelId?: string;
  timestamp: number;
  messageCount: number;
}

interface DismissedSuggestion {
  id?: number;
  skillId: string;
  dismissedAt: number;
  reason?: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open database connection
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Skill usage store
      if (!db.objectStoreNames.contains('skillUsage')) {
        const skillUsageStore = db.createObjectStore('skillUsage', {
          keyPath: 'id',
          autoIncrement: true,
        });
        skillUsageStore.createIndex('by-skill', 'skillId', { unique: false });
        skillUsageStore.createIndex('by-type', 'conversationType', { unique: false });
        skillUsageStore.createIndex('by-timestamp', 'timestamp', { unique: false });
      }

      // Dismissed suggestions store
      if (!db.objectStoreNames.contains('dismissedSuggestions')) {
        db.createObjectStore('dismissedSuggestions', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Record a skill usage event
 */
export async function recordSkillUsage(
  skillId: string,
  conversationType: ConversationType,
  outcome: 'success' | 'neutral' | 'failed',
  options?: {
    modelId?: string;
    messageCount?: number;
  }
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['skillUsage'], 'readwrite');
    const store = transaction.objectStore('skillUsage');

    const record: SkillUsageRecord = {
      skillId,
      conversationType,
      outcome,
      modelId: options?.modelId,
      timestamp: Date.now(),
      messageCount: options?.messageCount ?? 0,
    };

    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all skill usage records
 */
async function getAllUsageRecords(): Promise<SkillUsageRecord[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['skillUsage'], 'readonly');
    const store = transaction.objectStore('skillUsage');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get skill success rates by conversation type
 */
export async function getSkillSuccessRates(): Promise<
  Record<ConversationType, Record<string, { success: number; total: number; rate: number }>>
> {
  const allRecords = await getAllUsageRecords();

  const stats: Record<
    ConversationType,
    Record<string, { success: number; total: number; rate: number }>
  > = {
    coding: {},
    writing: {},
    analysis: {},
    creative: {},
    general: {},
  };

  // Aggregate by skill + conversation type
  for (const record of allRecords) {
    const convType = record.conversationType;
    const skillId = record.skillId;
    const outcome = record.outcome;

    if (!stats[convType]) continue;

    if (!stats[convType][skillId]) {
      stats[convType][skillId] = { success: 0, total: 0, rate: 0 };
    }

    stats[convType][skillId].total += 1;
    if (outcome === 'success') {
      stats[convType][skillId].success += 1;
    }
  }

  // Calculate rates
  for (const convType of Object.keys(stats) as ConversationType[]) {
    const typeStats = stats[convType];
    if (!typeStats) continue;

    for (const skillId of Object.keys(typeStats)) {
      const stat = typeStats[skillId];
      stat.rate = stat.total > 0 ? stat.success / stat.total : 0;
    }
  }

  return stats;
}

/**
 * Get best skill for a conversation type based on historical data
 */
export async function getBestSkillForType(
  conversationType: ConversationType
): Promise<{ skillId: string; successRate: number } | null> {
  const rates = await getSkillSuccessRates();
  const typeStats = rates[conversationType];

  if (!typeStats || Object.keys(typeStats).length === 0) {
    return null;
  }

  // Find skill with highest success rate (minimum 2 uses)
  let bestSkill: { skillId: string; successRate: number } | null = null;

  for (const [skillId, stat] of Object.entries(typeStats)) {
    if (stat.total >= 2) {
      if (!bestSkill || stat.rate > bestSkill.successRate) {
        bestSkill = { skillId, successRate: stat.rate };
      }
    }
  }

  return bestSkill;
}

/**
 * Check if a suggestion was recently dismissed
 */
export async function wasSuggestionDismissed(skillId: string): Promise<boolean> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['dismissedSuggestions'], 'readonly');
    const store = transaction.objectStore('dismissedSuggestions');
    const request = store.getAll();

    request.onsuccess = () => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dismissed = request.result as DismissedSuggestion[];
      const found = dismissed.some(
        d => d.skillId === skillId && d.dismissedAt > oneDayAgo
      );
      resolve(found);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Record a dismissed suggestion
 */
export async function recordDismissedSuggestion(
  skillId: string,
  reason?: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['dismissedSuggestions'], 'readwrite');
    const store = transaction.objectStore('dismissedSuggestions');

    const dismissed: DismissedSuggestion = {
      skillId,
      dismissedAt: Date.now(),
      reason,
    };

    const request = store.add(dismissed);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up old records (call periodically)
 */
export async function cleanupOldRecords(): Promise<void> {
  const db = await openDB();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['skillUsage', 'dismissedSuggestions'], 'readwrite');
    const usageStore = transaction.objectStore('skillUsage');
    const dismissedStore = transaction.objectStore('dismissedSuggestions');

    // Clean old usage records
    const usageRequest = usageStore.getAll();
    usageRequest.onsuccess = () => {
      const records = usageRequest.result as SkillUsageRecord[];
      for (const record of records) {
        if (record.timestamp && record.timestamp < thirtyDaysAgo && record.id !== undefined) {
          usageStore.delete(record.id);
        }
      }
    };

    // Clean old dismissed suggestions
    const dismissedRequest = dismissedStore.getAll();
    dismissedRequest.onsuccess = () => {
      const dismissed = dismissedRequest.result as DismissedSuggestion[];
      for (const d of dismissed) {
        if (d.dismissedAt && d.dismissedAt < oneDayAgo && d.id !== undefined) {
          dismissedStore.delete(d.id);
        }
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get usage statistics for display
 */
export async function getSkillUsageStats(): Promise<{
  totalUsages: number;
  bySkill: Record<string, number>;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
}> {
  const allRecords = await getAllUsageRecords();

  const stats = {
    totalUsages: allRecords.length,
    bySkill: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    byOutcome: {} as Record<string, number>,
  };

  for (const record of allRecords) {
    stats.bySkill[record.skillId] = (stats.bySkill[record.skillId] || 0) + 1;
    stats.byType[record.conversationType] =
      (stats.byType[record.conversationType] || 0) + 1;
    stats.byOutcome[record.outcome] = (stats.byOutcome[record.outcome] || 0) + 1;
  }

  return stats;
}