import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationProvider, useConversations } from '../store/ConversationContext';
import { Conversation } from '../types';

function TestComponent() {
  const {
    conversations,
    createConversation,
    deleteConversation,
    clearAllConversations,
    clearConversationMessages,
    togglePinConversation,
    duplicateConversation,
    renameConversation,
    branchConversation,
    searchConversation,
    activeConversationId,
    activeConversation,
  } = useConversations();

  return (
    <div>
      <span data-testid="count">{conversations.length}</span>
      <span data-testid="active">{activeConversationId || 'none'}</span>
      <span data-testid="activeTitle">{activeConversation?.title || 'none'}</span>
      {conversations.map(c => (
        <div key={c.id} data-testid={`conv-${c.id}`}>
          <span>{c.title}</span>
          <span data-testid={`pinned-${c.id}`}>{c.isPinned ? 'true' : 'false'}</span>
        </div>
      ))}
      <button onClick={() => createConversation()}>Create</button>
      <button onClick={() => createConversation('gpt-4', 'openai')}>Create with Model</button>
      <button onClick={() => deleteConversation(conversations[0]?.id || '')}>Delete First</button>
      <button onClick={() => clearAllConversations()}>Clear All</button>
      <button onClick={() => clearConversationMessages(conversations[0]?.id || '')}>Clear Messages</button>
      <button onClick={() => togglePinConversation(conversations[0]?.id || '')}>Toggle Pin</button>
      <button onClick={() => duplicateConversation(conversations[0]?.id || '')}>Duplicate</button>
      <button onClick={() => renameConversation(conversations[0]?.id || '', 'Renamed')}>Rename</button>
      <button onClick={() => branchConversation('msg-1')}>Branch</button>
      <button onClick={() => {
        const results = searchConversation('test');
        return results;
      }}>Search</button>
    </div>
  );
}

function TestComponentWithInitial() {
  const { conversations, activeConversationId } = useConversations();
  return (
    <div>
      <span data-testid="count">{conversations.length}</span>
      <span data-testid="active">{activeConversationId || 'none'}</span>
    </div>
  );
}

describe('ConversationContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides initial empty state', () => {
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('creates new conversation', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('active')).toBeTruthy();
  });

  it('creates conversation with model and provider', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: /Create with Model/i }));
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('deletes a conversation', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByTestId('count').textContent).toBe('2');

    await user.click(screen.getByRole('button', { name: 'Delete First' }));
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('clears all conversations', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByTestId('count').textContent).toBe('2');

    await user.click(screen.getByRole('button', { name: 'Clear All' }));
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('toggles conversation pin', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));

    // Find the pinned span by querying the container directly
    const getPinnedEl = () => container.querySelector<HTMLSpanElement>('[data-testid^="pinned-"]');
    expect(getPinnedEl()?.textContent).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Toggle Pin' }));
    expect(getPinnedEl()?.textContent).toBe('true');
  });

  it('renames a conversation', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    expect(screen.getByTestId('activeTitle').textContent).toBe('Renamed');
  });

  it('duplicates a conversation', async () => {
    const user = userEvent.setup();
    render(
      <ConversationProvider>
        <TestComponent />
      </ConversationProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('initializes with provided conversations', () => {
    const initialConvs: Conversation[] = [
      {
        id: 'existing-1',
        title: 'Existing Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: 'gpt-4',
        provider: 'openai',
        isPinned: true,
      },
    ];

    render(
      <ConversationProvider initialConversations={initialConvs}>
        <TestComponentWithInitial />
      </ConversationProvider>
    );

    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('throws when useConversations is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useConversations must be used within ConversationProvider');
  });
});
