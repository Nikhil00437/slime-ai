import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HelpCircle,
  Search,
  Keyboard,
  Navigation,
  Zap,
  MessageSquare,
  FolderOpen,
  Shield,
  BookOpen,
  Star,
  ChevronRight,
  ChevronDown,
  Layers,
  Cpu,
  Bot,
  Globe,
  Sparkles,
  TrendingUp,
  Clock,
  Database,
  FileText,
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface HelpPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPalette: React.FC<HelpPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedSection('welcome');
    }
  }, [isOpen]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  // Filter sections based on query
  const allSections = getHelpSections();
  const filteredSections = query
    ? allSections.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase())
      )
    : allSections;

  const selectedContent = allSections.find(s => s.id === selectedSection)?.content || allSections[0]?.content;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Help Palette */}
      <div
        className="relative w-full max-w-4xl h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Sidebar - Navigation */}
        <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-950/50">
          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            <Search size={16} className="text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search help..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
            />
          </div>

          {/* Section List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredSections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors mb-1 ${
                  selectedSection === s.id
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className={selectedSection === s.id ? 'text-blue-400' : 'text-gray-500'}>
                  {s.icon}
                </span>
                <span className="text-sm flex-1">{s.title}</span>
                {selectedSection === s.id && <ChevronRight size={14} className="text-blue-400" />}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">H</kbd>
              <span>to toggle</span>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedContent}
        </div>
      </div>
    </div>
  );
};

// Hook to manage help palette state
export const useHelpPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
};

// All help sections
function getHelpSections(): HelpSection[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome',
      icon: <HelpCircle size={16} />,
      content: <WelcomeSection />,
    },
    {
      id: 'navigation',
      title: 'Navigation',
      icon: <Navigation size={16} />,
      content: <NavigationSection />,
    },
    {
      id: 'keyboard',
      title: 'Keyboard Shortcuts',
      icon: <Keyboard size={16} />,
      content: <KeyboardShortcutsSection />,
    },
    {
      id: 'models',
      title: 'Models & Providers',
      icon: <Cpu size={16} />,
      content: <ModelsSection />,
    },
    {
      id: 'chat',
      title: 'Chat Features',
      icon: <MessageSquare size={16} />,
      content: <ChatFeaturesSection />,
    },
    {
      id: 'vault',
      title: 'Vault System',
      icon: <FolderOpen size={16} />,
      content: <VaultSection />,
    },
    {
      id: 'memory',
      title: 'Memory System',
      icon: <Database size={16} />,
      content: <MemorySection />,
    },
    {
      id: 'skills',
      title: 'Skills System',
      icon: <Sparkles size={16} />,
      content: <SkillsSection />,
    },
    {
      id: 'forge',
      title: 'Skill Forge',
      icon: <Zap size={16} />,
      content: <SkillForgeSection />,
    },
    {
      id: 'files',
      title: 'File Attachments',
      icon: <FileText size={16} />,
      content: <FileAttachmentsSection />,
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Shield size={16} />,
      content: <SettingsSection />,
    },
  ];
}

// Section Components
function WelcomeSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <HelpCircle className="text-blue-400" size={28} />
          Welcome to Slime AI
        </h2>
        <p className="text-gray-400">
          A unified LLM model aggregator that connects you to multiple AI providers in one place.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          Quick Start Guide
        </h3>
        <ol className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</span>
            <span><strong className="text-white">Connect a Provider:</strong> Go to Settings and add your API keys for OpenAI, Anthropic, Google Gemini, Grok, or connect to local models via Ollama/LM Studio.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</span>
            <span><strong className="text-white">Select a Model:</strong> Choose from your available models in the sidebar. Models are grouped by provider.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">3</span>
            <span><strong className="text-white">Start Chatting:</strong> Type your message and press Enter or click Send to start a conversation.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">4</span>
            <span><strong className="text-white">Save to Vault:</strong> Connect an Obsidian vault to save your chats, memory, and skills persistently.</span>
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FeatureCard
          icon={<MessageSquare size={20} />}
          title="Multi-Model Chat"
          description="Switch between different AI providers seamlessly"
          color="blue"
        />
        <FeatureCard
          icon={<Sparkles size={20} />}
          title="Skills System"
          description="Use and create specialized AI skills"
          color="purple"
        />
        <FeatureCard
          icon={<FolderOpen size={20} />}
          title="Vault Sync"
          description="Persist data to your Obsidian vault"
          color="green"
        />
        <FeatureCard
          icon={<Database size={20} />}
          title="Memory"
          description="AI remembers context across conversations"
          color="yellow"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green' | 'yellow';
}) {
  const colors = {
    blue: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-600/10 border-purple-500/20 text-purple-400',
    green: 'bg-green-600/10 border-green-500/20 text-green-400',
    yellow: 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]} transition-transform hover:scale-[1.02]`}>
      <div className="mb-2">{icon}</div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

function NavigationSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Navigation size={22} className="text-blue-400" />
          Navigation Guide
        </h2>
        <p className="text-gray-400 text-sm">Learn how to navigate through the app</p>
      </div>

      <div className="space-y-4">
        <NavItem
          title="Sidebar"
          description="The left sidebar contains your model list and conversation history. Click the chevron to collapse/expand."
          tips={[
            'Hover over collapsed icons to see tooltips',
            'Swipe left on conversations to delete (mobile)',
            'Swipe right to pin/unpin conversations',
          ]}
        />

        <NavItem
          title="Tab Bar"
          description="Switch between Chat and Skill Forge views using the tabs at the top."
          tips={[
            'Chat: Send messages and interact with AI models',
            'Skill Forge: Create and manage custom skills',
          ]}
        />

        <NavItem
          title="Command Palette"
          description="Quick access to all actions via keyboard"
          tips={[
            'Press Ctrl+K to open',
            'Search for commands, models, or settings',
            'Use arrow keys to navigate, Enter to select',
          ]}
        />

        <NavItem
          title="Settings Panel"
          description="Configure providers, API keys, and preferences"
          tips={[
            'Press Ctrl+, to open',
            'Manage connected providers',
            'Configure model selectors for memory and skill generation',
          ]}
        />
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <BookOpen size={16} className="text-blue-400" />
          Pro Tip
        </h3>
        <p className="text-sm text-gray-400">
          Use <kbd className="kbd">Ctrl+H</kbd> anytime to open this help palette and learn about any feature!
        </p>
      </div>
    </div>
  );
}

function NavItem({ title, description, tips }: {
  title: string;
  description: string;
  tips: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        {expanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50">
          <ul className="mt-3 space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-blue-400 mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeyboardShortcutsSection() {
  const shortcuts = [
    { keys: ['Ctrl', 'H'], action: 'Open Help Palette', category: 'General' },
    { keys: ['Ctrl', 'K'], action: 'Open Command Palette', category: 'General' },
    { keys: ['Ctrl', ','], action: 'Open Settings', category: 'General' },
    { keys: ['Ctrl', 'N'], action: 'New Chat', category: 'Chat' },
    { keys: ['Ctrl', 'Enter'], action: 'Send Message', category: 'Chat' },
    { keys: ['Ctrl', 'L'], action: 'Clear Current Chat', category: 'Chat' },
    { keys: ['Ctrl', 'Shift', 'C'], action: 'Copy Last Response', category: 'Chat' },
    { keys: ['↑'], action: 'Previous message in input history', category: 'Chat' },
    { keys: ['↓'], action: 'Next message in input history', category: 'Chat' },
    { keys: ['Esc'], action: 'Close modals/palettes', category: 'General' },
  ];

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Keyboard size={22} className="text-blue-400" />
          Keyboard Shortcuts
        </h2>
        <p className="text-gray-400 text-sm">Master these shortcuts for a faster workflow</p>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h3>
          <div className="space-y-2">
            {shortcuts.filter(s => s.category === cat).map((shortcut, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
              >
                <span className="text-sm text-gray-300">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span className="text-gray-600">+</span>}
                      <kbd className="kbd">{key}</kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-sm text-yellow-300 flex items-start gap-2">
          <span className="text-yellow-400 mt-0.5">💡</span>
          <span>On Mac, use <kbd className="kbd">⌘</kbd> instead of <kbd className="kbd">Ctrl</kbd></span>
        </p>
      </div>
    </div>
  );
}

function ModelsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Cpu size={22} className="text-blue-400" />
          Models & Providers
        </h2>
        <p className="text-gray-400 text-sm">Connect to various AI providers</p>
      </div>

      <div className="space-y-4">
        <ProviderCard
          name="Ollama"
          icon={<Cpu size={20} />}
          color="orange"
          description="Run open-source models locally"
          examples={['llama2', 'mistral', 'codellama', 'mixtral']}
          setup="Download Ollama, then models auto-detect on localhost:11434"
        />

        <ProviderCard
          name="LM Studio"
          icon={<Bot size={20} />}
          color="purple"
          description="Local model inference with a friendly UI"
          examples={['Any GGUF model', 'Llama variants', 'Mistral variants']}
          setup="Run LM Studio, connects to localhost:1234"
        />

        <ProviderCard
          name="OpenRouter"
          icon={<Globe size={20} />}
          color="blue"
          description="Gateway to many models via single API"
          examples={['GPT-4', 'Claude', 'Gemini', 'Llama', 'Mistral']}
          setup="Get API key from openrouter.ai"
        />

        <ProviderCard
          name="OpenAI"
          icon={<Globe size={20} />}
          color="green"
          description="Direct OpenAI API access"
          examples={['GPT-4o', 'GPT-4 Turbo', 'GPT-3.5 Turbo']}
          setup="Get API key from platform.openai.com"
        />

        <ProviderCard
          name="Anthropic"
          icon={<Globe size={20} />}
          color="orange"
          description="Claude models directly"
          examples={['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku']}
          setup="Get API key from console.anthropic.com"
        />

        <ProviderCard
          name="Google Gemini"
          icon={<Globe size={20} />}
          color="yellow"
          description="Google's multimodal models"
          examples={['Gemini Pro', 'Gemini Ultra', 'Gemini 1.5']}
          setup="Get API key from aistudio.google.com"
        />

        <ProviderCard
          name="Grok"
          icon={<Globe size={20} />}
          color="gray"
          description="xAI's Grok models"
          examples={['Grok-1', 'Grok-2']}
          setup="Get API key from x.ai"
        />
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Star size={16} className="text-blue-400" />
          Model Capabilities
        </h3>
        <p className="text-sm text-gray-400">
          Each model can have different capabilities (image upload, audio, video, file upload).
          The UI filters models based on your attachments to show compatible options.
        </p>
      </div>
    </div>
  );
}

function ProviderCard({ name, icon, color, description, examples, setup }: {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  examples: string[];
  setup: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClasses: Record<string, string> = {
    orange: 'border-orange-500/20 text-orange-400',
    purple: 'border-purple-500/20 text-purple-400',
    blue: 'border-blue-500/20 text-blue-400',
    green: 'border-green-500/20 text-green-400',
    yellow: 'border-yellow-500/20 text-yellow-400',
    gray: 'border-gray-500/20 text-gray-400',
  };

  return (
    <div className={`bg-gray-800/30 rounded-xl border ${colorClasses[color]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className={colorClasses[color]}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{name}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        {expanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50 space-y-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Popular Models</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {examples.map((ex, i) => (
                <span key={i} className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300">{ex}</span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Setup</span>
            <p className="text-sm text-gray-400 mt-1">{setup}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatFeaturesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <MessageSquare size={22} className="text-blue-400" />
          Chat Features
        </h2>
        <p className="text-gray-400 text-sm">Everything you can do in the chat</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FeatureDetail
          title="Streaming Responses"
          description="See AI responses appear in real-time as they're generated"
        />
        <FeatureDetail
          title="Markdown Rendering"
          description="AI responses support full markdown including code blocks with syntax highlighting"
        />
        <FeatureDetail
          title="Code Blocks"
          description="Copy code with one click. Supports syntax highlighting for 100+ languages"
        />
        <FeatureDetail
          title="File Attachments"
          description="Attach images, audio, video, or documents to your messages"
        />
        <FeatureDetail
          title="Conversation Branching"
          description="Create branches from any message to explore different directions"
        />
        <FeatureDetail
          title="Export Options"
          description="Export conversations as Markdown or JSON"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Message Actions</h3>
        <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-4 space-y-2 text-sm">
          <ActionItem action="Thumb Up/Down" description="Rate responses to improve the skill system" />
          <ActionItem action="Branch" description="Create a new conversation branch from this message" />
          <ActionItem action="Copy" description="Copy message content to clipboard" />
          <ActionItem action="Edit" description="Edit your message and regenerate the response" />
          <ActionItem action="Delete" description="Remove a message from the conversation" />
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2">Conversation Management</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Rename conversations by clicking the title</li>
          <li>• Pin important conversations to keep them at the top</li>
          <li>• Duplicate conversations to start variations</li>
          <li>• Search through conversation history</li>
        </ul>
      </div>
    </div>
  );
}

function FeatureDetail({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
      <h4 className="text-white text-sm font-medium mb-1">{title}</h4>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

function ActionItem({ action, description }: { action: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-blue-400 font-medium min-w-20">{action}</span>
      <span className="text-gray-400">{description}</span>
    </div>
  );
}

function VaultSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <FolderOpen size={22} className="text-blue-400" />
          Vault System
        </h2>
        <p className="text-gray-400 text-sm">Connect to an Obsidian vault for persistent storage</p>
      </div>

      <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <FolderOpen size={18} className="text-green-400" />
          What is Vault Sync?
        </h3>
        <p className="text-sm text-gray-300">
          Connect Slime AI to your Obsidian vault to automatically save:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-green-400" />
            <strong className="text-white">Chats:</strong> Conversations saved as Markdown files
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-green-400" />
            <strong className="text-white">Memory:</strong> Persistent context across sessions
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-green-400" />
            <strong className="text-white">Skills:</strong> Custom skills saved as .md files
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-green-400" />
            <strong className="text-white">Settings:</strong> API keys and preferences
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Vault Structure</h3>
        <div className="bg-gray-800/50 rounded-xl p-4 font-mono text-xs">
          <p className="text-gray-500 mb-2">Your vault will contain:</p>
          <pre className="text-gray-300 whitespace-pre-wrap">{`vault/
├── .env              # API keys (not synced)
├── chats/            # Conversation files
├── memory/
│   ├── perpetual/    # Long-term memory
│   ├── periodically/ # Medium-term (30 day TTL)
│   └── ephemerally/  # Short-term (1 day TTL)
└── skills/           # Custom skills`}</pre>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Connecting a Vault</h3>
        <ol className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</span>
            <span>Open Settings (Ctrl+,)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</span>
            <span>Click "Select Vault Folder" in the Vault section</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">3</span>
            <span>Grant permission to your Obsidian vault folder</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">4</span>
            <span>Your data will sync automatically!</span>
          </li>
        </ol>
      </div>

      <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-sm text-yellow-300">
          <strong>Note:</strong> API keys are stored locally only and never leave your device.
          Only conversation content and settings are synced to the vault.
        </p>
      </div>
    </div>
  );
}

function MemorySection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Database size={22} className="text-blue-400" />
          Memory System
        </h2>
        <p className="text-gray-400 text-sm">AI context that persists across conversations</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          How Memory Works
        </h3>
        <p className="text-sm text-gray-300 mb-3">
          Slime AI has a three-tier memory system that provides context to AI models:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-3">
            <Database size={14} className="text-green-400 mt-1" />
            <div>
              <strong className="text-white">Perpetual</strong>
              <span className="text-gray-400 ml-2">Never expires</span>
              <p className="text-gray-500 text-xs mt-1">Long-term: user profile, system prompts, preferences</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Clock size={14} className="text-yellow-400 mt-1" />
            <div>
              <strong className="text-white">Periodically</strong>
              <span className="text-gray-400 ml-2">30 day TTL</span>
              <p className="text-gray-500 text-xs mt-1">Medium-term: project context, recent learnings</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <TrendingUp size={14} className="text-orange-400 mt-1" />
            <div>
              <strong className="text-white">Ephemerally</strong>
              <span className="text-gray-400 ml-2">1 day TTL</span>
              <p className="text-gray-500 text-xs mt-1">Short-term: current chat context</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Memory Sources</h3>
        <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-4 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <FileText size={14} className="text-blue-400 mt-1" />
            <div>
              <strong className="text-white">Chat History</strong>
              <p className="text-gray-400 text-xs mt-1">Previous conversations provide ongoing context</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Star size={14} className="text-yellow-400 mt-1" />
            <div>
              <strong className="text-white">User Preferences</strong>
              <p className="text-gray-400 text-xs mt-1">Learned from your interactions and explicit settings</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles size={14} className="text-purple-400 mt-1" />
            <div>
              <strong className="text-white">Skill Context</strong>
              <p className="text-gray-400 text-xs mt-1">Active skills provide specialized knowledge</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Zap size={16} className="text-blue-400" />
          Auto-Summarization
        </h3>
        <p className="text-sm text-gray-400">
          Long conversations are automatically summarized using a dedicated model to maintain context
          without hitting token limits. You can configure which model handles this in Settings.
        </p>
      </div>
    </div>
  );
}

function SkillsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles size={22} className="text-blue-400" />
          Skills System
        </h2>
        <p className="text-gray-400 text-sm">Tensura-inspired skill system with ranks and levels</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          Skill Ranks
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <RankInfo rank="Normal" probability="55%" color="text-gray-400" />
          <RankInfo rank="Rare" probability="40%" color="text-blue-400" />
          <RankInfo rank="Unique" probability="~5%" color="text-purple-400" />
          <RankInfo rank="Terminal" probability="0.0000001%" color="text-red-400" />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Ultimate skills cannot be generated - they require a superior model or special conditions.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Level System</h3>
        <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-4">
          <p className="text-sm text-gray-400 mb-3">Level up by getting thumbs up on your skill responses:</p>
          <div className="space-y-2 text-xs">
            <LevelRow level={1} threshold={0} />
            <LevelRow level={2} threshold={20} />
            <LevelRow level={3} threshold={50} />
            <LevelRow level={4} threshold={100} />
            <LevelRow level={5} threshold={200} />
            <LevelRow level={6} threshold={500} />
            <LevelRow level={7} threshold={1000} />
            <LevelRow level={8} threshold={2000} />
            <LevelRow level={9} threshold={5000} />
            <LevelRow level={10} threshold={10000} />
            <p className="text-gray-500 mt-2">Beyond level 10: exponential growth (1.5x per level)</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          Gluttony Skill
        </h3>
        <p className="text-sm text-gray-400">
          The default unique skill that can merge compatible skills (95%+ compatibility).
          Use it to combine multiple skills into a more powerful version.
        </p>
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-2">Skill Compatibility</h3>
        <p className="text-sm text-gray-400">
          Each skill has compatibility rules based on model capabilities. Some models may not
          support certain features. The UI shows warnings when you select an incompatible model.
        </p>
      </div>
    </div>
  );
}

function RankInfo({ rank, probability, color }: { rank: string; probability: string; color: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
      <span className={`font-medium ${color}`}>{rank}</span>
      <span className="text-gray-500">{probability}</span>
    </div>
  );
}

function LevelRow({ level, threshold }: { level: number; threshold: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white font-medium">Level {level}</span>
      <span className="text-gray-500">{threshold}+ thumbs</span>
    </div>
  );
}

function SkillForgeSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Zap size={22} className="text-purple-400" />
          Skill Forge
        </h2>
        <p className="text-gray-400 text-sm">Create and customize AI skills</p>
      </div>

      <div className="bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-yellow-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-400" />
          What is Skill Forge?
        </h3>
        <p className="text-sm text-gray-300 mb-3">
          Skill Forge is where you create new skills that enhance AI responses. Each skill
          has a rank, abilities, and can level up based on user feedback.
        </p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-yellow-400" />
            Define skill behavior and personality
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-yellow-400" />
            Set rank and rarity probabilities
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-yellow-400" />
            Add abilities and special features
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={14} className="text-yellow-400" />
            Test skills in real-time
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Creating a Skill</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold shrink-0">1</span>
            <div>
              <strong className="text-white">Name & Describe</strong>
              <p className="text-gray-400 text-xs mt-1">Give your skill a name and describe what it does</p>
            </div>
          </li>
          <li className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold shrink-0">2</span>
            <div>
              <strong className="text-white">Select Model</strong>
              <p className="text-gray-400 text-xs mt-1">Choose which AI model generates the skill content</p>
            </div>
          </li>
          <li className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold shrink-0">3</span>
            <div>
              <strong className="text-white">Generate & Customize</strong>
              <p className="text-gray-400 text-xs mt-1">Let AI create initial content, then refine it</p>
            </div>
          </li>
          <li className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold shrink-0">4</span>
            <div>
              <strong className="text-white">Save & Use</strong>
              <p className="text-gray-400 text-xs mt-1">Save to vault and activate for use in chat</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-2">Skill Generation Model</h3>
        <p className="text-sm text-gray-400">
          In Settings, you can configure which model is used for skill generation.
          More capable models (like GPT-4 or Claude) will create better skills.
        </p>
      </div>
    </div>
  );
}

function FileAttachmentsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <FileText size={22} className="text-blue-400" />
          File Attachments
        </h2>
        <p className="text-gray-400 text-sm">Attach files to your messages</p>
      </div>

      <div className="bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-cyan-500/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-3">Supported File Types</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <FileType icon="🖼️" name="Images" examples="PNG, JPG, GIF, WebP" />
          <FileType icon="🎵" name="Audio" examples="MP3, WAV, OGG" />
          <FileType icon="🎬" name="Video" examples="MP4, WebM" />
          <FileType icon="📄" name="Documents" examples="PDF, TXT, Markdown" />
          <FileType icon="📊" name="Data" examples="JSON, CSV" />
          <FileType icon="💻" name="Code" examples="Any text file" />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold">How to Attach Files</h3>
        <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-4 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</span>
            <div>
              <strong className="text-white">Click Attachment Button</strong>
              <p className="text-gray-400 text-xs mt-1">Look for the paperclip icon in the chat input area</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</span>
            <div>
              <strong className="text-white">Select Files</strong>
              <p className="text-gray-400 text-xs mt-1">Choose one or more files from your device</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">3</span>
            <div>
              <strong className="text-white">Send Message</strong>
              <p className="text-gray-400 text-xs mt-1">The AI will analyze your attachments and respond</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-sm text-yellow-300">
          <strong>Note:</strong> Model compatibility varies. Some models support image analysis,
          others don't. The UI filters compatible models when you attach files.
        </p>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2">Drag & Drop</h3>
        <p className="text-sm text-gray-400">
          You can also drag and drop files directly into the chat area. This is often
          faster than using the file picker.
        </p>
      </div>
    </div>
  );
}

function FileType({ icon, name, examples }: { icon: string; name: string; examples: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
      <span className="text-xl">{icon}</span>
      <div>
        <span className="text-white font-medium">{name}</span>
        <p className="text-xs text-gray-500">{examples}</p>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Shield size={22} className="text-blue-400" />
          Settings
        </h2>
        <p className="text-gray-400 text-sm">Configure your Slime AI experience</p>
      </div>

      <div className="space-y-4">
        <SettingsCategory
          title="Providers"
          items={[
            { name: 'Ollama', description: 'Local models on localhost:11434' },
            { name: 'LM Studio', description: 'Local models on localhost:1234' },
            { name: 'OpenRouter', description: 'Multi-provider gateway' },
            { name: 'OpenAI', description: 'Direct API access' },
            { name: 'Anthropic', description: 'Claude models' },
            { name: 'Google Gemini', description: 'Multimodal models' },
            { name: 'Grok', description: 'xAI models' },
          ]}
        />

        <SettingsCategory
          title="Vault"
          items={[
            { name: 'Connect Vault', description: 'Link to Obsidian vault' },
            { name: 'Sync Settings', description: 'Auto-sync preferences' },
          ]}
        />

        <SettingsCategory
          title="Model Selectors"
          items={[
            { name: 'Summarization Model', description: 'For automatic memory summarization' },
            { name: 'Skill Generation Model', description: 'For creating skills in Skill Forge' },
          ]}
        />

        <SettingsCategory
          title="Chat Settings"
          items={[
            { name: 'Auto-save Interval', description: 'How often to save conversations' },
            { name: 'Offline Queue', description: 'Queue messages when offline' },
            { name: 'Conflict Resolution', description: 'How to handle sync conflicts' },
          ]}
        />
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-gray-300">
          Open Settings with <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">,</kbd> to access all
          configuration options.
        </p>
      </div>
    </div>
  );
}

function SettingsCategory({ title, items }: { title: string; items: { name: string; description: string }[] }) {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-gray-700/50">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <span className="text-white text-sm font-medium">{item.name}</span>
            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
