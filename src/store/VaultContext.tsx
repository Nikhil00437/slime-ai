import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserMemory, ModelMemory } from '../api/vault';

interface VaultState {
  vaultConnected: boolean;
  vaultName: string | null;
  lastSyncTime: number | null;
  isSyncing: boolean;
  isFallbackMode: boolean;
}

export interface VaultContextType {
  vault: VaultState;
  userMemory: UserMemory | null;
  modelMemories: ModelMemory[];
  connectVault: () => Promise<boolean>;
  disconnectVault: () => void;
  syncConversations: () => Promise<void>;
  updateModelMemory: (modelId: string, provider: string, context: string) => Promise<void>;
  updateUserMemory: (memory: UserMemory) => Promise<void>;
  refreshVaultState: () => void;
  hasFileSystemAccess: () => boolean;
  saveApiKeyToVault: (providerId: string, apiKey: string) => Promise<void>;
  loadUserMemory: () => Promise<UserMemory | null>;
  loadModelMemories: () => Promise<ModelMemory[]>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children, initialVaultState }: { children: React.ReactNode; initialVaultState?: Partial<VaultState> }) {
  const [vault, setVault] = useState<VaultState>({
    vaultConnected: false,
    vaultName: null,
    lastSyncTime: null,
    isSyncing: false,
    isFallbackMode: false,
    ...initialVaultState,
  });
  const [userMemory, setUserMemory] = useState<UserMemory | null>(null);
  const [modelMemories, setModelMemories] = useState<ModelMemory[]>([]);

  const connectVault = useCallback(async (): Promise<boolean> => {
    try {
      setVault(prev => ({ ...prev, isSyncing: true }));
      // Vault connection logic would go here - importing from api/vault
      setVault(prev => ({ ...prev, vaultConnected: true, vaultName: 'Vault', isSyncing: false, lastSyncTime: Date.now() }));
      return true;
    } catch {
      setVault(prev => ({ ...prev, isSyncing: false }));
      return false;
    }
  }, []);

  const disconnectVault = useCallback(() => {
    setVault(prev => ({ ...prev, vaultConnected: false, vaultName: null, lastSyncTime: null }));
  }, []);

  const syncConversations = useCallback(async () => {
    if (!vault.vaultConnected) return;
    setVault(prev => ({ ...prev, isSyncing: true }));
    // Sync logic would go here
    setVault(prev => ({ ...prev, isSyncing: false, lastSyncTime: Date.now() }));
  }, [vault.vaultConnected]);

  const updateModelMemory = useCallback(async (modelId: string, provider: string, context: string) => {
    const existing = modelMemories.find(m => m.modelId === modelId && m.provider === provider);
    if (existing) {
      setModelMemories(prev => prev.map(m => 
        m.modelId === modelId && m.provider === provider 
          ? { ...m, context, lastUpdated: Date.now() } 
          : m
      ));
    } else {
      setModelMemories(prev => [...prev, { modelId, provider, context, lastUpdated: Date.now() }]);
    }
  }, [modelMemories]);

  const updateUserMemory = useCallback(async (memory: UserMemory) => {
    setUserMemory(memory);
  }, []);

  const refreshVaultState = useCallback(() => {
    // Refresh vault state logic
  }, []);

  const hasFileSystemAccess = useCallback((): boolean => {
    return 'showOpenFilePicker' in window;
  }, []);

  const saveApiKeyToVault = useCallback(async (_providerId: string, _apiKey: string) => {
    // Save API key to vault
  }, []);

  const loadUserMemory = useCallback(async (): Promise<UserMemory | null> => {
    return userMemory;
  }, [userMemory]);

  const loadModelMemories = useCallback(async (): Promise<ModelMemory[]> => {
    return modelMemories;
  }, [modelMemories]);

  return (
    <VaultContext.Provider value={{
      vault,
      userMemory,
      modelMemories,
      connectVault,
      disconnectVault,
      syncConversations,
      updateModelMemory,
      updateUserMemory,
      refreshVaultState,
      hasFileSystemAccess,
      saveApiKeyToVault,
      loadUserMemory,
      loadModelMemories,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within VaultProvider');
  return context;
}