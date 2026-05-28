import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ChatMessage } from '../types'

type AppState = {
  // Chat state
  messages: ChatMessage[]
  isStreaming: boolean
  selectedModel: string
  // App state
  error: string | null
  isLoading: boolean
  pendingWebSearch: string | null
  // Actions
  addMessage: (msg: ChatMessage) => void
  setStreaming: (v: boolean) => void
  setModel: (id: string) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setPendingWebSearch: (query: string | null) => void
  clearMessages: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      messages: [],
      isStreaming: false,
      selectedModel: 'gpt-4o-mini',
      error: null,
      isLoading: false,
      pendingWebSearch: null,
      // Actions
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setStreaming: (v) => set({ isStreaming: v }),
      setModel: (id) => set({ selectedModel: id }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setPendingWebSearch: (query) => set({ pendingWebSearch: query }),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'slime-ai-store', storage: createJSONStorage(() => localStorage) }
  )
)