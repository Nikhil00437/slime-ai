import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderProvider, useProviders } from '../store/ProviderContext';
import { Provider } from '../types';

// Mock provider API functions
vi.mock('../api/providers', () => ({
  detectOllamaModels: vi.fn().mockResolvedValue([
    { id: 'llama3:latest', name: 'Llama 3', provider: 'ollama' },
  ]),
  detectLMStudioModels: vi.fn().mockResolvedValue([]),
  detectOpenRouterModels: vi.fn().mockRejectedValue(new Error('No API key')),
  detectOpenAIModels: vi.fn().mockRejectedValue(new Error('No API key')),
  detectAnthropicModels: vi.fn().mockResolvedValue([]),
  detectGeminiModels: vi.fn().mockResolvedValue([]),
  detectGrokModels: vi.fn().mockResolvedValue([]),
}));

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    enabled: true,
    models: [],
    status: 'checking',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234',
    enabled: false,
    models: [],
    status: 'disconnected',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    models: [],
    status: 'disconnected',
    requiresVault: true,
  },
];

function TestComponent() {
  const { providers, activeModel, updateProvider, detectModels, toggleFavoriteModel } = useProviders();

  return (
    <div>
      <span data-testid="providerCount">{providers.length}</span>
      <span data-testid="activeModel">{activeModel?.id || 'none'}</span>
      {providers.map(p => (
        <div key={p.id}>
          <span data-testid={`provider-${p.id}-status`}>{p.status}</span>
          <span data-testid={`provider-${p.id}-enabled`}>{p.enabled ? 'true' : 'false'}</span>
          <span data-testid={`provider-${p.id}-models`}>{p.models.length}</span>
        </div>
      ))}
      <button onClick={() => updateProvider('ollama', { enabled: false })}>Disable Ollama</button>
      <button onClick={() => detectModels('ollama')}>Detect Ollama</button>
      <button onClick={() => detectModels('openrouter')}>Detect OpenRouter</button>
      <button onClick={() => toggleFavoriteModel('llama3:latest')}>Toggle Favorite</button>
    </div>
  );
}

describe('ProviderContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with provided providers', () => {
    render(
      <ProviderProvider initialProviders={MOCK_PROVIDERS}>
        <TestComponent />
      </ProviderProvider>
    );

    expect(screen.getByTestId('providerCount').textContent).toBe('3');
    expect(screen.getByTestId('activeModel').textContent).toBe('none');
    expect(screen.getByTestId('provider-ollama-status').textContent).toBe('checking');
    expect(screen.getByTestId('provider-ollama-enabled').textContent).toBe('true');
  });

  it('initializes with default providers when none provided', () => {
    render(
      <ProviderProvider>
        <TestComponent />
      </ProviderProvider>
    );

    expect(screen.getByTestId('providerCount').textContent).toBe('0');
  });

  it('updates provider state', async () => {
    const user = userEvent.setup();
    render(
      <ProviderProvider initialProviders={MOCK_PROVIDERS}>
        <TestComponent />
      </ProviderProvider>
    );

    expect(screen.getByTestId('provider-ollama-enabled').textContent).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Disable Ollama' }));
    expect(screen.getByTestId('provider-ollama-enabled').textContent).toBe('false');
  });

  it('detects models and updates provider status on success', async () => {
    const user = userEvent.setup();
    render(
      <ProviderProvider initialProviders={MOCK_PROVIDERS}>
        <TestComponent />
      </ProviderProvider>
    );

    expect(screen.getByTestId('provider-ollama-models').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'Detect Ollama' }));

    await waitFor(() => {
      expect(screen.getByTestId('provider-ollama-models').textContent).toBe('1');
    });
  });

  it('handles model detection errors gracefully', async () => {
    const user = userEvent.setup();
    render(
      <ProviderProvider initialProviders={MOCK_PROVIDERS}>
        <TestComponent />
      </ProviderProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Detect OpenRouter' }));

    await waitFor(() => {
      expect(screen.getByTestId('provider-openrouter-status').textContent).toBe('error');
    });
  });

  it('throws when useProviders is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useProviders must be used within ProviderProvider');
  });
});
