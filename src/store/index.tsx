// Context exports
export { ProviderProvider, useProviders } from './ProviderContext';
export { ConversationProvider, useConversations } from './ConversationContext';
export { SettingsProvider, useSettings } from './SettingsContext';
export { VaultProvider, useVault } from './VaultContext';
export { ToolProvider, useTools } from './ToolContext';
export { LoopProvider, useLoop } from './LoopContext';
export { RagProvider, useRag } from './RagContext';

// Combined App Provider - wraps all contexts for easy setup
import React from 'react';
import { ProviderProvider } from './ProviderContext';
import { ConversationProvider } from './ConversationContext';
import { SettingsProvider } from './SettingsContext';
import { VaultProvider } from './VaultContext';
import { ToolProvider } from './ToolContext';
import { LoopProvider } from './LoopContext';
import { RagProvider } from './RagContext';
import { DEFAULT_PROVIDERS } from '../types';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ProviderProvider initialProviders={DEFAULT_PROVIDERS}>
      <ConversationProvider>
        <SettingsProvider>
          <VaultProvider>
            <ToolProvider>
              <LoopProvider>
                <RagProvider>
                  {children}
                </RagProvider>
              </LoopProvider>
            </ToolProvider>
          </VaultProvider>
        </SettingsProvider>
      </ConversationProvider>
    </ProviderProvider>
  );
}

// Re-export types for convenience
export type { ProviderContextType } from './ProviderContext';
export type { ConversationContextType } from './ConversationContext';
export type { SettingsContextType } from './SettingsContext';
export type { VaultContextType } from './VaultContext';
export type { ToolContextType } from './ToolContext';
export type { LoopContextType } from './LoopContext';