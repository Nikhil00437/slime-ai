/**
 * Pre-Destructive Action Backups
 * Day 6: Auto-export conversation before clear/delete
 */

import { Conversation } from '../types';

export interface BackupResult {
  success: boolean;
  backupId?: string;
  error?: string;
  data?: string;
}

const BACKUP_PREFIX = 'mm_backup_';
const BACKUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Create a backup of conversations before destructive action
 */
export function createBackup(conversations: Conversation[]): BackupResult {
  try {
    const backupId = `${BACKUP_PREFIX}${Date.now()}`;
    const data = JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      count: conversations.length,
      conversations,
    });

    // Store in localStorage (limited space, so only keep recent)
    localStorage.setItem(backupId, data);

    // Clean old backups
    cleanupOldBackups();

    return { success: true, backupId, data };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Failed to create backup',
    };
  }
}

/**
 * Create a backup of a single conversation
 */
export function createConversationBackup(conversation: Conversation): BackupResult {
  return createBackup([conversation]);
}

/**
 * Restore backup by ID
 */
export function restoreBackup(backupId: string): BackupResult & { conversations?: Conversation[] } {
  try {
    const data = localStorage.getItem(backupId);
    if (!data) {
      return { success: false, error: 'Backup not found' };
    }

    const parsed = JSON.parse(data);
    return {
      success: true,
      backupId,
      data,
      conversations: parsed.conversations,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Failed to restore backup',
    };
  }
}

/**
 * Get all available backups
 */
export function getBackups(): Array<{ id: string; timestamp: number; count: number }> {
  const backups: Array<{ id: string; timestamp: number; count: number }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        backups.push({
          id: key,
          timestamp: data.timestamp || 0,
          count: data.count || 0,
        });
      } catch {
        // Skip invalid backups
      }
    }
  }

  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Delete a backup
 */
export function deleteBackup(backupId: string): void {
  localStorage.removeItem(backupId);
}

/**
 * Clean up backups older than max age
 */
export function cleanupOldBackups(): void {
  const now = Date.now();

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (now - (data.timestamp || 0) > BACKUP_MAX_AGE_MS) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Auto-backup before destructive action with confirmation
 */
export async function backupBeforeAction(
  conversations: Conversation[],
  actionName: string
): Promise<BackupResult> {
  console.log(`[Backup] Creating backup before: ${actionName}`);
  const result = createBackup(conversations);

  if (result.success) {
    console.log(`[Backup] Created backup: ${result.backupId}`);
  } else {
    console.warn(`[Backup] Failed to create backup: ${result.error}`);
  }

  return result;
}

/**
 * Export backup as downloadable file
 */
export function exportBackupToFile(backupId: string, filename?: string): void {
  const result = restoreBackup(backupId);
  if (!result.success || !result.data) return;

  const blob = new Blob([result.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `slime-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
