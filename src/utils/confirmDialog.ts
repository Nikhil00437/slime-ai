/**
 * Confirmation Dialogs for Destructive Actions
 * Day 6: Prevent accidental data loss
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  requireTextInput?: string; // If set, user must type this exact text
}

export interface ConfirmResult {
  confirmed: boolean;
  inputText?: string;
}

/**
 * Show a confirmation dialog using native confirm (fallback)
 */
export function confirmAction(options: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    // Use native confirm as simple fallback
    const message = `${options.title}\n\n${options.message}`;
    const confirmed = window.confirm(message);
    resolve({ confirmed });
  });
}

/**
 * Predefined confirmation configs for common destructive actions
 */
export const CONFIRM_PRESETS = {
  deleteConversation: (title?: string): ConfirmOptions => ({
    title: 'Delete Conversation',
    message: `Are you sure you want to delete "${title || 'this conversation'}"? This action cannot be undone.`,
    confirmText: 'Delete',
    confirmVariant: 'danger',
  }),

  clearAllConversations: (): ConfirmOptions => ({
    title: 'Clear All Conversations',
    message: 'Are you sure you want to delete ALL conversations? This will permanently remove all chat history.',
    confirmText: 'Clear All',
    confirmVariant: 'danger',
    requireTextInput: 'DELETE ALL',
  }),

  disconnectVault: (): ConfirmOptions => ({
    title: 'Disconnect Vault',
    message: 'This will disconnect your vault and disable cloud providers. You can reconnect later.',
    confirmText: 'Disconnect',
    confirmVariant: 'warning',
  }),

  deleteSkill: (name?: string): ConfirmOptions => ({
    title: 'Delete Skill',
    message: `Are you sure you want to delete the skill "${name || 'this skill'}"?`,
    confirmText: 'Delete',
    confirmVariant: 'danger',
  }),

  overwriteFile: (filename?: string): ConfirmOptions => ({
    title: 'Overwrite File',
    message: `The file "${filename || 'this file'}" already exists. Do you want to overwrite it?`,
    confirmText: 'Overwrite',
    confirmVariant: 'warning',
  }),

  resetSettings: (): ConfirmOptions => ({
    title: 'Reset Settings',
    message: 'This will reset all settings to their default values. Your conversations will not be affected.',
    confirmText: 'Reset',
    confirmVariant: 'danger',
  }),

  deleteMemory: (): ConfirmOptions => ({
    title: 'Delete Memory Entry',
    message: 'Are you sure you want to delete this memory entry?',
    confirmText: 'Delete',
    confirmVariant: 'danger',
  }),
};

/**
 * Confirm with preset
 */
export function confirmPreset(
  preset: keyof typeof CONFIRM_PRESETS,
  ...args: string[]
): Promise<ConfirmResult> {
  const config = CONFIRM_PRESETS[preset](...args as [string?]);
  return confirmAction(config);
}
