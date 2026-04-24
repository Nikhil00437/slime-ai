import React, { createContext, useContext, useMemo } from 'react';
import { QuickReplyChip } from '../components/MarkdownRenderer';

interface QuickReplyContextValue {
  generateSuggestions: (message: string, context: 'code' | 'explanation' | 'question' | 'general') => QuickReplyChip[];
}

const QuickReplyContext = createContext<QuickReplyContextValue | null>(null);

export function useQuickReplies() {
  const ctx = useContext(QuickReplyContext);
  if (!ctx) throw new Error('useQuickReplies must be used within QuickReplyProvider');
  return ctx;
}

const SUGGESTION_TEMPLATES: Record<string, { keywords: string[]; chips: Omit<QuickReplyChip, 'id'>[] }> = {
  code: {
    keywords: ['code', 'function', 'class', 'implement', 'algorithm', 'write', 'create', 'build', 'generate'],
    chips: [
      { text: 'Explain this code' },
      { text: 'How does it work?' },
      { text: 'Optimize this' },
      { text: 'Add error handling' },
      { text: 'Write tests' },
    ],
  },
  explanation: {
    keywords: ['explain', 'what is', 'how does', 'why', 'understand', 'describe', 'tell me about'],
    chips: [
      { text: 'Give an example' },
      { text: 'Can you elaborate?' },
      { text: 'Why is this important?' },
      { text: 'Related concepts?' },
      { text: 'More details' },
    ],
  },
  question: {
    keywords: ['?', 'ask', 'question', 'query', 'wonder', 'curious', 'would it be possible'],
    chips: [
      { text: 'Yes, continue' },
      { text: 'No, explain alternatives' },
      { text: 'Show more options' },
      { text: 'What about edge cases?' },
    ],
  },
  comparison: {
    keywords: ['vs', 'versus', 'compare', 'difference', 'better', 'alternative', 'or', 'which'],
    chips: [
      { text: 'Pros and cons' },
      { text: 'When to use each' },
      { text: 'Performance comparison' },
      { text: 'Show me examples' },
    ],
  },
  tutorial: {
    keywords: ['tutorial', 'learn', 'guide', 'step', 'how to', 'beginner', 'introduction'],
    chips: [
      { text: 'Show me the code' },
      { text: 'Skip to implementation' },
      { text: 'Common pitfalls?' },
      { text: 'Next steps' },
    ],
  },
};

const ID_COUNTER = { value: 0 };
function generateId(): string {
  return `qr-${++ID_COUNTER.value}-${Date.now()}`;
}

export function QuickReplyProvider({ children }: { children: React.ReactNode }) {
  const generateSuggestions = useMemo(() => {
    return (message: string, context: 'code' | 'explanation' | 'question' | 'general' = 'general'): QuickReplyChip[] => {
      const lowerMessage = message.toLowerCase();
      const detectedTypes: string[] = [context];

      // Detect content type based on keywords
      for (const [type, config] of Object.entries(SUGGESTION_TEMPLATES)) {
        if (config.keywords.some(kw => lowerMessage.includes(kw))) {
          if (!detectedTypes.includes(type)) {
            detectedTypes.push(type);
          }
        }
      }

      // Collect unique chips
      const chipSet = new Set<string>();
      const result: QuickReplyChip[] = [];

      for (const type of detectedTypes) {
        const template = SUGGESTION_TEMPLATES[type];
        if (template) {
          for (const chip of template.chips) {
            if (!chipSet.has(chip.text)) {
              chipSet.add(chip.text);
              result.push({ id: generateId(), ...chip });
            }
          }
        }
      }

      return result.slice(0, 4);
    };
  }, []);

  return (
    <QuickReplyContext.Provider value={{ generateSuggestions }}>
      {children}
    </QuickReplyContext.Provider>
  );
}

// Simple keyword-based suggestion generator
export function getQuickReplySuggestions(message: string): QuickReplyChip[] {
  const lowerMessage = message.toLowerCase();
  const chips: QuickReplyChip[] = [];
  const id = generateId();

  // Context detection
  if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('implement')) {
    chips.push(
      { id: `${id}-1`, text: 'Explain this code' },
      { id: `${id}-2`, text: 'Optimize it' },
      { id: `${id}-3`, text: 'Add comments' }
    );
  } else if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('why')) {
    chips.push(
      { id: `${id}-1`, text: 'Give an example' },
      { id: `${id}-2`, text: 'More details' },
      { id: `${id}-3`, text: 'Why is this important?' }
    );
  } else if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('fix')) {
    chips.push(
      { id: `${id}-1`, text: 'Show me the fix' },
      { id: `${id}-2`, text: 'What caused it?' },
      { id: `${id}-3`, text: 'Preventive measures?' }
    );
  } else if (lowerMessage.includes('best') || lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
    chips.push(
      { id: `${id}-1`, text: 'Show alternatives' },
      { id: `${id}-2`, text: 'Pros and cons' },
      { id: `${id}-3`, text: 'When to use this' }
    );
  } else {
    // Default suggestions
    chips.push(
      { id: `${id}-1`, text: 'Continue' },
      { id: `${id}-2`, text: 'More details' },
      { id: `${id}-3`, text: 'Give an example' }
    );
  }

  return chips;
}