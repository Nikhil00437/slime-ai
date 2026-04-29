import React, { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { SkillForge } from './slime/SkillForge';
import WebScraper from './components/WebScraper';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { HelpPalette, useHelpPalette } from './components/HelpPalette';
import { MessageSquare, FlaskConical, Command, HelpCircle, Bug } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { initFavicon, setFaviconStatus } from './utils/favicon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initErrorLogging } from './api/errorLogging';

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT BACKGROUND - from ui-improvements
// ═══════════════════════════════════════════════════════════════════════════

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          background: "#22c55e",
          opacity: 0.06,
          filter: "blur(130px)",
          top: -150, left: -100,
          animation: "orbFloat1 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 450, height: 450,
          background: "#06b6d4",
          opacity: 0.05,
          filter: "blur(120px)",
          bottom: -100, right: -80,
          animation: "orbFloat2 30s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 300, height: 300,
          background: "#8b5cf6",
          opacity: 0.035,
          filter: "blur(100px)",
          top: "40%", right: "25%",
          animation: "orbFloat1 20s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

type Tab = 'chat' | 'forge' | 'scraper';

function AppContent() {
  const { error, setError, isLoading, pendingWebSearch, setPendingWebSearch } = useAppContext();
  const [showError, setShowError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const { isOpen: isCommandPaletteOpen, setIsOpen: setCommandPaletteOpen } = useCommandPalette();
  const { isOpen: isHelpOpen, setIsOpen: setHelpOpen } = useHelpPalette();

  // Helper to open web scraper
  const openWebScraper = (query?: string) => {
    setTab('scraper');
  };

  // Handle pending web search - switch to scraper tab with animation
  useEffect(() => {
    if (pendingWebSearch) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setTab('scraper');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingWebSearch]);

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
    <div className="h-screen flex overflow-hidden relative">
      <AmbientBackground />
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          borderBottom: '1px solid rgba(34, 197, 94, 0.08)',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(24px)',
          flexShrink: 0,
        }}>
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare size={14} />} label="Chat" />
          <TabBtn active={tab === 'forge'} onClick={() => setTab('forge')} icon={<FlaskConical size={14} />} label="Skill Forge" accent />
          <TabBtn active={tab === 'scraper'} onClick={() => setTab('scraper')} icon={<Bug size={14} />} label="Web Scraper" />
          
          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-dark-500 hover:text-dark-300 hover:bg-dark-700/40 rounded transition-colors"
            title="Command Palette (Ctrl+K)"
          >
            <Command size={12} />
            <kbd className="kbd">Ctrl+K</kbd>
          </button>

          {/* Help Palette Trigger */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-dark-500 hover:text-dark-300 hover:bg-dark-700/40 rounded transition-colors"
            title="Help (Ctrl+H)"
          >
            <HelpCircle size={12} />
            <kbd className="kbd">Ctrl+H</kbd>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          <div
            key={tab}
            className="animate-fade-in"
            style={{ animationDuration: '200ms' }}
          >
            {tab === 'chat' ? <ChatPanel onOpenScraper={() => setTab('scraper')} /> : tab === 'forge' ? <SkillForge /> : <WebScraper />}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onOpenWebScraper={openWebScraper} />

      {/* Help Palette */}
      <HelpPalette isOpen={isHelpOpen} onClose={() => setHelpOpen(false)} />

      {/* Error Toast */}
      {showError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-dark-800/90 backdrop-blur-sm text-dark-100 px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 animate-slide-in-right border border-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mt-0.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs text-dark-400 mt-0.5">{showError}</p>
            </div>
            <button onClick={() => setShowError(null)} className="text-dark-500 hover:text-dark-200 shrink-0 btn-press">×</button>
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
          ? (accent ? 'rgba(34, 197, 94, 0.15)' : 'rgba(6, 182, 212, 0.12)')
          : 'transparent',
        border: active
          ? `1px solid ${accent ? 'rgba(34, 197, 94, 0.4)' : 'rgba(6, 182, 212, 0.3)'}`
          : '1px solid transparent',
        color: active
          ? (accent ? '#4ade80' : '#22d3ee')
          : 'rgba(148, 163, 184, 0.5)',
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  );
}

/**
 * Graceful JS Degradation Wrapper
 * Day 9: Core chat works even if non-critical scripts fail
 */
function GracefulDegradation({ children }: { children: React.ReactNode }) {
  const [scriptsLoaded, setScriptsLoaded] = useState(true);

  useEffect(() => {
    // Check if critical APIs are available
    const criticalApis = [
      'fetch',
      'Promise',
      'Map',
      'Set',
    ];
    
    const missing = criticalApis.filter(api => !(api in window));
    if (missing.length > 0) {
      console.warn('[GracefulDegradation] Missing APIs:', missing);
      setScriptsLoaded(false);
    }

    // Initialize error logging
    initErrorLogging();
  }, []);

  if (!scriptsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-dark-100 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 gradient-text">Browser Not Supported</h1>
          <p className="text-dark-500 mb-6">
            Your browser is missing critical features required to run this application.
            Please upgrade to a modern browser like Chrome, Edge, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <GracefulDegradation>
            <AppContent />
          </GracefulDegradation>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
