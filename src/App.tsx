import React, { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { SkillForge } from './slime/SkillForge';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { HelpPalette, useHelpPalette } from './components/HelpPalette';
import { MessageSquare, FlaskConical, Command, HelpCircle } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { initFavicon, setFaviconStatus } from './utils/favicon';

type Tab = 'chat' | 'forge';

function AppContent() {
  const { error, setError, isLoading } = useAppContext();
  const [showError, setShowError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const { isOpen: isCommandPaletteOpen, setIsOpen: setCommandPaletteOpen } = useCommandPalette();
  const { isOpen: isHelpOpen, setIsOpen: setHelpOpen } = useHelpPalette();

  // Initialize favicon and update based on loading state
  useEffect(() => {
    initFavicon();
  }, []);

  useEffect(() => {
    if (isLoading) {
      setFaviconStatus('streaming');
    } else {
      setFaviconStatus('idle');
    }
  }, [isLoading]);

  useEffect(() => {
    if (error) {
      setShowError(error);
      setFaviconStatus('error');
      const timer = setTimeout(() => {
        setShowError(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  return (
    <div className="h-screen flex bg-gray-900 text-white overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0d1117',
          flexShrink: 0,
        }}>
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare size={14} />} label="Chat" />
          <TabBtn active={tab === 'forge'} onClick={() => setTab('forge')} icon={<FlaskConical size={14} />} label="Skill Forge" accent />
          
          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-400 hover:bg-gray-800 rounded transition-colors"
            title="Command Palette (Ctrl+K)"
          >
            <Command size={12} />
            <kbd className="kbd">Ctrl+K</kbd>
          </button>

          {/* Help Palette Trigger */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-400 hover:bg-gray-800 rounded transition-colors"
            title="Help (Ctrl+H)"
          >
            <HelpCircle size={12} />
            <kbd className="kbd">Ctrl+H</kbd>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          {tab === 'chat' ? <ChatPanel /> : <SkillForge />}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      {/* Help Palette */}
      <HelpPalette isOpen={isHelpOpen} onClose={() => setHelpOpen(false)} />

      {/* Error Toast */}
      {showError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 animate-slide-in-right">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs text-red-100/80 mt-0.5">{showError}</p>
            </div>
            <button onClick={() => setShowError(null)} className="text-red-200 hover:text-white shrink-0 btn-press">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, accent }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 600 : 400,
        background: active
          ? (accent ? 'rgba(107,70,193,0.25)' : 'rgba(99,179,237,0.15)')
          : 'transparent',
        border: active
          ? `1px solid ${accent ? '#6B46C1' : 'rgba(99,179,237,0.4)'}`
          : '1px solid transparent',
        color: active
          ? (accent ? '#D6BCFA' : '#90CDF4')
          : 'rgba(180,200,220,0.5)',
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}
