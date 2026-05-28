import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { HelpPalette, useHelpPalette } from './components/HelpPalette';
import { SidebarManager } from './components/SidebarManager';
import { AssistantSidebarContent } from './types';
import { MessageSquare, Command, HelpCircle, Bug, Loader2, BarChart3, Database, BookOpen, AlertTriangle } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { initFavicon, setFaviconStatus } from './utils/favicon';
import { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
import { initErrorLogging } from './api/errorLogging';
import { RagProvider } from './store/RagContext';

// Lazy load heavy components for code splitting
const WebScraper = lazy(() => import('./components/WebScraper'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const MemoryPanel = lazy(() => import('./components/MemoryPanel').then(m => ({ default: m.MemoryPanel })));
const RagPanel = lazy(() => import('./components/RagPanel').then(m => ({ default: m.RagPanel })));

// Loading fallback component
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      <span className="ml-2 text-gray-400">Loading...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE ERROR BOUNDARY - Section 10.2.2: Per-Feature Error Boundaries
// ═══════════════════════════════════════════════════════════════════════════

interface FeatureErrorProps {
  name: string;
  onRetry: () => void;
  onGoHome?: () => void;
}

function FeatureError({ name, onRetry, onGoHome }: FeatureErrorProps) {
  const handleGoHome = onGoHome || onRetry;
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="bg-dark-800/80 backdrop-blur-sm rounded-2xl border border-red-500/30 p-6 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{name} Error</h3>
        <p className="text-sm text-dark-400 mb-4">
          This feature encountered an error and couldn't load.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm rounded-lg transition-colors"
          >
            Go to Chat
          </button>
        </div>
      </div>
    </div>
  );
}

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

type Tab = 'chat' | 'scraper' | 'memory' | 'settings' | 'knowledge';

function AppContent() {
  const { error, setError, isLoading, pendingWebSearch, setPendingWebSearch } = useAppContext();
  const [showError, setShowError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = () => setRetryKey(prev => prev + 1);
  const { isOpen: isCommandPaletteOpen, setIsOpen: setCommandPaletteOpen } = useCommandPalette();
  const { isOpen: isHelpOpen, setIsOpen: setHelpOpen } = useHelpPalette();

  // Right sidebar state (for thinking/processing/coding panels)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSidebarContent, setRightSidebarContent] = useState<AssistantSidebarContent | undefined>(undefined);
  const [rightSidebarStreaming, setRightSidebarStreaming] = useState(false);

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
        {/* Sleek Top Bar - Qwen-inspired */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-dark-700/20 bg-dark-900/80 backdrop-blur-xl shrink-0">
          <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare size={15} />} label="Chat" />
          <TabBtn active={tab === 'scraper'} onClick={() => setTab('scraper')} icon={<Bug size={15} />} label="Scraper" />
          <TabBtn active={tab === 'memory'} onClick={() => setTab('memory')} icon={<Database size={15} />} label="Memory" />
          <TabBtn active={tab === 'knowledge'} onClick={() => setTab('knowledge')} icon={<BookOpen size={15} />} label="Knowledge" />
          <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={<HelpCircle size={15} />} label="Settings" />
          
          <div className="ml-auto flex items-center gap-1">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-dark-500 hover:text-dark-300 hover:bg-dark-700/40 rounded-md transition-colors"
              title="Command Palette (Ctrl+K or ⌘K)"
            >
              <Command size={13} />
              <span className="kbd-container hidden sm:inline-flex">
                <kbd className="kbd text-[10px]">Ctrl</kbd>
                <span className="text-dark-600">+</span>
                <kbd className="kbd text-[10px]">K</kbd>
              </span>
            </button>

            {/* Help Palette Trigger */}
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-dark-500 hover:text-dark-300 hover:bg-dark-700/40 rounded-md transition-colors"
              title="Help (Ctrl+H or ⌘H)"
            >
              <HelpCircle size={13} />
              <span className="kbd-container hidden sm:inline-flex">
                <kbd className="kbd text-[10px]">Ctrl</kbd>
                <span className="text-dark-600">+</span>
                <kbd className="kbd text-[10px]">H</kbd>
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          <div
            key={tab}
            className="animate-fade-in"
            style={{ animationDuration: '200ms' }}
          >
            {tab === 'chat' ? (
              <ErrorBoundary key={retryKey} fallback={<FeatureError name="Chat" onRetry={handleRetry} onGoHome={() => setTab('chat')} />}>
                <ChatPanel
                  onOpenScraper={() => setTab('scraper')}
                  rightSidebarOpen={rightSidebarOpen}
                  onRightSidebarOpen={setRightSidebarOpen}
                  onRightSidebarContentChange={setRightSidebarContent}
                  onRightSidebarStreamingChange={setRightSidebarStreaming}
                />
              </ErrorBoundary>
            ) : tab === 'scraper' ? (
              <Suspense fallback={<ComponentLoader />}>
                <ErrorBoundary key={retryKey} fallback={<FeatureError name="Web Scraper" onRetry={handleRetry} onGoHome={() => setTab('chat')} />}>
                  <WebScraper />
                </ErrorBoundary>
              </Suspense>
            ) : tab === 'memory' ? (
              <Suspense fallback={<ComponentLoader />}>
                <ErrorBoundary key={retryKey} fallback={<FeatureError name="Memory Panel" onRetry={handleRetry} onGoHome={() => setTab('chat')} />}>
                  <MemoryPanel onClose={() => setTab('chat')} />
                </ErrorBoundary>
              </Suspense>
            ) : tab === 'knowledge' ? (
              <Suspense fallback={<ComponentLoader />}>
                <ErrorBoundary key={retryKey} fallback={<FeatureError name="Knowledge" onRetry={handleRetry} onGoHome={() => setTab('chat')} />}>
                  <RagPanel onClose={() => setTab('chat')} />
                </ErrorBoundary>
              </Suspense>
            ) : tab === 'settings' ? (
              <Suspense fallback={<ComponentLoader />}>
                <ErrorBoundary key={retryKey} fallback={<FeatureError name="Settings" onRetry={handleRetry} onGoHome={() => setTab('chat')} />}>
                  <SettingsPanel onBack={() => setTab('chat')} />
                </ErrorBoundary>
              </Suspense>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Proper sliding sidebar for thinking/processing/coding */}
      <div className={`right-sidebar-container ${rightSidebarOpen ? 'open' : ''}`}>
        <SidebarManager
          content={rightSidebarContent}
          onClose={() => setRightSidebarOpen(false)}
          isStreaming={rightSidebarStreaming}
          compact={false}
          onBlockChange={(block) => {
            if (rightSidebarContent) {
              setRightSidebarContent({
                ...rightSidebarContent,
                activeBlock: block,
              });
            }
          }}
        />
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

function TabBtn({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
        active
          ? 'bg-slime-500/12 text-slime-400 border border-slime-500/25 font-medium shadow-sm'
          : 'text-dark-500 hover:text-dark-300 hover:bg-dark-700/30 border border-transparent'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
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
        <RagProvider>
          <ToastProvider>
            <GracefulDegradation>
              <AppContent />
            </GracefulDegradation>
          </ToastProvider>
        </RagProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
