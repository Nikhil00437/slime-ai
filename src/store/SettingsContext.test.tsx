import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider, useSettings } from '../store/SettingsContext';

function TestComponent() {
  const {
    settings,
    isLoading,
    error,
    isSidebarOpen,
    showSettings,
    quickPrompts,
    setError,
    setIsLoading,
    setIsSidebarOpen,
    setShowSettings,
    addQuickPrompt,
    removeQuickPrompt,
  } = useSettings();

  return (
    <div>
      <span data-testid="temperature">{settings.temperature}</span>
      <span data-testid="maxTokens">{settings.maxTokens}</span>
      <span data-testid="isLoading">{isLoading ? 'true' : 'false'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="sidebarOpen">{isSidebarOpen ? 'true' : 'false'}</span>
      <span data-testid="showSettings">{showSettings ? 'true' : 'false'}</span>
      <span data-testid="quickPromptCount">{quickPrompts.length}</span>

      <button onClick={() => setIsLoading(true)}>Set Loading</button>
      <button onClick={() => setError('test error')}>Set Error</button>
      <button onClick={() => setIsSidebarOpen(false)}>Close Sidebar</button>
      <button onClick={() => setShowSettings(true)}>Show Settings</button>
      <button onClick={() => addQuickPrompt('Test', 'Hello world')}>Add Quick Prompt</button>
      <button onClick={() => removeQuickPrompt('first')}>Remove Quick Prompt</button>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default settings values', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('temperature').textContent).toBe('0.7');
    expect(screen.getByTestId('maxTokens').textContent).toBe('4096');
    expect(screen.getByTestId('isLoading').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('none');
    expect(screen.getByTestId('sidebarOpen').textContent).toBe('true');
    expect(screen.getByTestId('showSettings').textContent).toBe('false');
    expect(screen.getByTestId('quickPromptCount').textContent).toBe('0');
  });

  it('updates loading state', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('isLoading').textContent).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Set Loading' }));
    expect(screen.getByTestId('isLoading').textContent).toBe('true');
  });

  it('updates error state', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('error').textContent).toBe('none');

    await user.click(screen.getByRole('button', { name: 'Set Error' }));
    expect(screen.getByTestId('error').textContent).toBe('test error');
  });

  it('toggles sidebar', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('sidebarOpen').textContent).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Close Sidebar' }));
    expect(screen.getByTestId('sidebarOpen').textContent).toBe('false');
  });

  it('toggles settings panel', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('showSettings').textContent).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Show Settings' }));
    expect(screen.getByTestId('showSettings').textContent).toBe('true');
  });

  it('manages quick prompts', async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('quickPromptCount').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'Add Quick Prompt' }));
    expect(screen.getByTestId('quickPromptCount').textContent).toBe('1');
  });

  it('throws when useSettings is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSettings must be used within SettingsProvider');
  });
});
