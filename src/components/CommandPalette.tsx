import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import {
  Search,
  Settings,
  Plus,
  Cpu,
  Bot,
  Globe,
  ArrowRight,
  Zap,
  Code,
  BookOpen,
  Brain,
  MessageSquare,
  GraduationCap,
  Scale,
} from 'lucide-react';
import { DEFAULT_SKILLS, Skill } from '../types';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  category: 'action' | 'navigation' | 'settings' | 'model' | 'skill';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillActivate?: (skillId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSkillActivate }) => {
  const {
    createConversation,
    setShowSettings,
    providers,
    setActiveModel,
  } = useAppContext();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get all available models for model switching commands
  const allModels = providers.flatMap(p => p.models);

  // Skill icons mapping
  const skillIcons: Record<string, React.ReactNode> = {
    'code-expert': <Code size={16} />,
    'creative-writer': <BookOpen size={16} />,
    'research-analyst': <Brain size={16} />,
    'teacher': <GraduationCap size={16} />,
    'debate-partner': <Scale size={16} />,
  };

  const commands: Command[] = [
    // Actions
    {
      id: 'new-chat',
      label: 'New Chat',
      icon: <Plus size={16} />,
      shortcut: 'Ctrl+N',
      category: 'action',
      action: () => {
        createConversation();
        onClose();
      },
      keywords: ['new', 'create', 'chat', 'conversation'],
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      icon: <Settings size={16} />,
      shortcut: 'Ctrl+,',
      category: 'navigation',
      action: () => {
        setShowSettings(true);
        onClose();
      },
      keywords: ['settings', 'preferences', 'config'],
    },
    // Skills
    ...DEFAULT_SKILLS.map(skill => ({
      id: `skill-${skill.id}`,
      label: `Activate ${skill.name}`,
      icon: skillIcons[skill.id] || <Zap size={16} />,
      category: 'skill' as const,
      action: () => {
        if (onSkillActivate) {
          onSkillActivate(skill.id);
        }
        onClose();
      },
      keywords: [skill.name.toLowerCase(), skill.id, ...(skill.keywords || [])],
    })),
    // Models - will be dynamically added
    ...allModels.map(model => ({
      id: `model-${model.id}`,
      label: `Switch to ${model.name}`,
      icon: model.provider === 'ollama' ? <Cpu size={16} /> :
            model.provider === 'lmstudio' ? <Bot size={16} /> : <Globe size={16} />,
      category: 'model' as const,
      action: () => {
        setActiveModel(model);
        onClose();
      },
      keywords: [model.name.toLowerCase(), model.provider],
    })),
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => {
    if (!query) return true;
    const searchText = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchText) ||
      cmd.keywords?.some(kw => kw.toLowerCase().includes(searchText))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Global keyboard shortcut to open palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by parent
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    action: 'Actions',
    navigation: 'Navigation',
    settings: 'Settings',
    model: 'Models',
    skill: 'Skills',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-overlay" />
      
      {/* Command Palette */}
      <div 
        className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search size={18} className="text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        {/* Commands List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">No commands found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {categoryLabels[category]}
                </div>
                {cmds.map((cmd) => {
                  const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                  const isSelected = globalIdx === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-blue-600/20 text-blue-400' 
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span className={isSelected ? 'text-blue-400' : 'text-gray-500'}>
                        {cmd.icon}
                      </span>
                      <span className="flex-1 text-sm">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="kbd">{cmd.shortcut}</kbd>
                      )}
                      <ArrowRight size={14} className={`text-gray-600 transition-transform ${isSelected ? 'translate-x-1' : ''}`} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="kbd">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd">↵</kbd> Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">K</kbd> to open
          </span>
        </div>
      </div>
    </div>
  );
};

// Hook to manage command palette state
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
};