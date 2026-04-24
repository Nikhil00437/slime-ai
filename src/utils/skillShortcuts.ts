import { useEffect, useCallback } from 'react';
import { DEFAULT_SKILLS, Skill } from '../types';

/**
 * Skill keyboard shortcuts hook
 * Maps Ctrl+1-5 to skill activation
 */
export function useSkillShortcuts(onActivate: (skillId: string | null) => void) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle if no input is focused (or it's a textarea/input)
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

    if (!e.ctrlKey && !e.metaKey) return;

    // Ctrl+Shift+0-9 or Ctrl+1-5 for skills
    const skillIndex = {
      '1': 0,
      '2': 1,
      '3': 2,
      '4': 3,
      '5': 4,
    }[e.key];

    if (skillIndex !== undefined && skillIndex < DEFAULT_SKILLS.length) {
      if (isInputFocused) {
        // If in input, just toggle the skill
        e.preventDefault();
        onActivate(DEFAULT_SKILLS[skillIndex].id);
      } else {
        // If not focused, activate
        e.preventDefault();
        onActivate(DEFAULT_SKILLS[skillIndex].id);
      }
    }

    // Ctrl+0 or Escape to deactivate
    if (e.key === '0' || e.key === 'Escape') {
      if (!isInputFocused) {
        e.preventDefault();
        onActivate(null);
      }
    }
  }, [onActivate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get skill shortcut display
 */
export function getSkillShortcut(index: number): string | null {
  if (index >= 0 && index < 5) {
    return `Ctrl+${index + 1}`;
  }
  return null;
}

/**
 * Skill shortcut hint component
 */
export function SkillShortcutHint({ skillId }: { skillId: string }) {
  const index = DEFAULT_SKILLS.findIndex(s => s.id === skillId);
  const shortcut = getSkillShortcut(index);

  if (!shortcut) return null;

  return (
    <kbd className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded border border-gray-600">
      {shortcut}
    </kbd>
  );
}