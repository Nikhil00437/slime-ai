import React, { createContext, useContext, useState, useCallback } from 'react';
import { Provider, ProviderType, ModelInfo } from '../types';
import { detectOllamaModels, detectLMStudioModels, detectOpenRouterModels, detectOpenAIModels, detectAnthropicModels, detectGeminiModels, detectGrokModels } from '../api/providers';

export interface ProviderContextType {
  providers: Provider[];
  activeModel: ModelInfo | null;
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
  setActiveModel: React.Dispatch<React.SetStateAction<ModelInfo | null>>;
  updateProvider: (id: ProviderType, updates: Partial<Provider>) => void;
  detectModels: (providerId: ProviderType) => Promise<void>;
  toggleFavoriteModel: (modelId: string) => void;
}

const ProviderContext = createContext<ProviderContextType | null>(null);

export function ProviderProvider({ children, initialProviders }: { children: React.ReactNode; initialProviders?: Provider[] }) {
  const [providers, setProviders] = useState<Provider[]>(initialProviders || []);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);

  const updateProvider = useCallback((id: ProviderType, updates: Partial<Provider>) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const detectModels = useCallback(async (providerId: ProviderType) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    let models: ModelInfo[] = [];
    try {
      switch (providerId) {
        case 'ollama':
          models = await detectOllamaModels(provider.baseUrl || 'http://localhost:11434');
          break;
        case 'lmstudio':
          models = await detectLMStudioModels(provider.baseUrl || 'http://localhost:1234');
          break;
        case 'openrouter':
          models = await detectOpenRouterModels(provider.apiKey || '');
          break;
        case 'openai':
          models = await detectOpenAIModels(provider.apiKey || '');
          break;
        case 'anthropic':
          models = await detectAnthropicModels(provider.apiKey || '');
          break;
        case 'gemini':
          models = await detectGeminiModels(provider.apiKey || '');
          break;
        case 'grok':
          models = await detectGrokModels(provider.apiKey || '');
          break;
        default:
          return;
      }
      updateProvider(providerId, { models, status: models.length > 0 ? 'connected' : 'disconnected' });
    } catch {
      updateProvider(providerId, { status: 'error' });
    }
  }, [providers, updateProvider]);

  const toggleFavoriteModel = useCallback((modelId: string) => {
    setProviders(prev => prev.map(p => ({
      ...p,
      models: p.models.map(m => m.id === modelId ? { ...m, isFavorite: !m.isFavorite } : m)
    })));
  }, []);

  return (
    <ProviderContext.Provider value={{ providers, activeModel, setProviders, setActiveModel, updateProvider, detectModels, toggleFavoriteModel }}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProviders() {
  const context = useContext(ProviderContext);
  if (!context) throw new Error('useProviders must be used within ProviderProvider');
  return context;
}