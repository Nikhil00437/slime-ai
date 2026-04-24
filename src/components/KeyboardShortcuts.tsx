import React from 'react';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Global
  { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'Global' },
  { keys: ['Ctrl', 'H'], description: 'Open help palette', category: 'Global' },
  { keys: ['Ctrl', 'N'], description: 'New conversation', category: 'Global' },
  { keys: ['Ctrl', ','], description: 'Open settings', category: 'Global' },

  // Input
  { keys: ['Ctrl', 'Enter'], description: 'Send message', category: 'Input' },
  { keys: ['↑'], description: 'Previous input in history', category: 'Input' },
  { keys: ['↓'], description: 'Next input in history', category: 'Input' },
  { keys: ['Escape'], description: 'Close dropdowns/cancel', category: 'Input' },

  // Skills
  { keys: ['Ctrl', '1'], description: 'Activate Code Expert', category: 'Skills' },
  { keys: ['Ctrl', '2'], description: 'Activate Creative Writer', category: 'Skills' },
  { keys: ['Ctrl', '3'], description: 'Activate Research Analyst', category: 'Skills' },
  { keys: ['Ctrl', '4'], description: 'Activate Teacher', category: 'Skills' },
  { keys: ['Ctrl', '5'], description: 'Activate Debate Partner', category: 'Skills' },
  { keys: ['Ctrl', '0'], description: 'Deactivate skill', category: 'Skills' },

  // Messages
  { keys: ['@'], description: 'Insert skill reference', category: 'Messages' },
  { keys: ['/'], description: 'Insert command', category: 'Messages' },
  { keys: ['$'], description: 'Insert variable', category: 'Messages' },
];

interface KeyboardShortcutsProps {
  compact?: boolean;
}

export function KeyboardShortcuts({ compact = false }: KeyboardShortcutsProps) {
  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">K</kbd>
          <span>Commands</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">1-5</kbd>
          <span>Skills</span>
        </span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4 text-gray-300">
        <Keyboard size={16} />
        <span className="font-medium">Keyboard Shortcuts</span>
      </div>

      <div className="space-y-4">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {category}
            </h4>
            <div className="space-y-1.5">
              {SHORTCUTS.filter(s => s.category === category).map(shortcut => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-400">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, idx) => (
                      <React.Fragment key={key}>
                        {idx > 0 && <span className="text-gray-600">+</span>}
                        <kbd className="kbd">{key}</kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ShortcutHintProps {
  keys: string[];
}

export function ShortcutHint({ keys }: ShortcutHintProps) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {keys.map((key, idx) => (
        <React.Fragment key={key}>
          {idx > 0 && <span className="text-gray-500 mx-0.5">+</span>}
          <kbd className="kbd text-[10px] py-0.5 px-1">{key}</kbd>
        </React.Fragment>
      ))}
    </div>
  );
}