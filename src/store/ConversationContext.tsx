import React, { createContext, useContext, useState, useCallback } from 'react';
import { Conversation, ChatMessage } from '../types';
import { Attachment } from '../components/AttachmentInput';

export interface ConversationContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  createConversation: (modelId?: string, provider?: string) => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  clearConversationMessages: (id: string) => void;
  togglePinConversation: (id: string) => void;
  duplicateConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  branchConversation: (messageId: string) => void;
  searchConversation: (query: string) => string[];
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children, initialConversations }: { children: React.ReactNode; initialConversations?: Conversation[] }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations || []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const createConversation = useCallback((modelId?: string, provider?: string): string => {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newConv: Conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: modelId || '',
      provider: (provider || 'ollama') as any,
      isPinned: false,
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(id);
    return id;
  }, []);

  const setActiveConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(conversations.find(c => c.id !== id)?.id || null);
    }
  }, [activeConversationId, conversations]);

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  const clearConversationMessages = useCallback((id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c));
  }, []);

  const togglePinConversation = useCallback((id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  }, []);

  const duplicateConversation = useCallback((id: string) => {
    const original = conversations.find(c => c.id === id);
    if (!original) return;
    const newId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duplicate: Conversation = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      messages: [...original.messages],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => [duplicate, ...prev]);
  }, [conversations]);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c));
  }, []);

  const branchConversation = useCallback((messageId: string) => {
    const parent = conversations.find(c => c.messages.some(m => m.id === messageId));
    if (!parent) return;
    const branchIndex = parent.messages.findIndex(m => m.id === messageId);
    const newId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const branched: Conversation = {
      id: newId,
      title: `${parent.title} (Branch)`,
      messages: parent.messages.slice(0, branchIndex + 1),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: parent.modelId,
      provider: parent.provider,
      isPinned: false,
    };
    setConversations(prev => [branched, ...prev]);
    setActiveConversationId(newId);
  }, [conversations]);

  const searchConversation = useCallback((query: string): string[] => {
    const results: string[] = [];
    conversations.forEach(c => {
      c.messages.forEach(m => {
        if (m.content.toLowerCase().includes(query.toLowerCase())) {
          results.push(`${c.title}: ${m.content.slice(0, 100)}...`);
        }
      });
    });
    return results;
  }, [conversations]);

  const addMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId 
        ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() } 
        : c
    ));
  }, []);

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<ChatMessage>) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId 
        ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, ...updates } : m), updatedAt: Date.now() } 
        : c
    ));
  }, []);

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversationId,
      activeConversation,
      createConversation,
      setActiveConversation,
      deleteConversation,
      clearAllConversations,
      clearConversationMessages,
      togglePinConversation,
      duplicateConversation,
      renameConversation,
      branchConversation,
      searchConversation,
      addMessage,
      updateMessage,
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error('useConversations must be used within ConversationProvider');
  return context;
}