import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

interface QuickPrompt {
  id: string;
  name: string;
  content: string;
}

export interface SettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  quickPrompts: QuickPrompt[];
  addQuickPrompt: (name: string, content: string) => void;
  removeQuickPrompt: (id: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children, initialSettings }: { children: React.ReactNode; initialSettings?: AppSettings }) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings || DEFAULT_SETTINGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addQuickPrompt = useCallback((name: string, content: string) => {
    const id = `qp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setQuickPrompts(prev => [...prev, { id, name, content }]);
  }, []);

  const removeQuickPrompt = useCallback((id: string) => {
    setQuickPrompts(prev => prev.filter(q => q.id !== id));
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      setSettings,
      isSidebarOpen,
      setIsSidebarOpen,
      showSettings,
      setShowSettings,
      quickPrompts,
      addQuickPrompt,
      removeQuickPrompt,
      error,
      setError,
      isLoading,
      setIsLoading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}