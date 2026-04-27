/**
 * Context-Aware Quick-Reply Chips
 * Day 23: Suggest next questions based on response content
 */

export interface QuickReply {
  id: string;
  text: string;
  category: 'followup' | 'clarify' | 'expand' | 'action';
}

// Patterns to extract topics for quick replies
const TOPIC_PATTERNS = [
  /(?:explain|describe|tell me about)\s+([^,.;]+)/i,
  /(?:what is|what are)\s+([^?.]+)/i,
  /(?:how to|how do)\s+([^?.]+)/i,
  /(?:why|when|where)\s+(?:is|are|does|do|did|can|could|would|will)\s+([^?.]+)/i,
];

// Generate quick reply suggestions based on message content
export function generateQuickReplies(content: string, lastUserQuery?: string): QuickReply[] {
  const replies: QuickReply[] = [];
  const lowerContent = content.toLowerCase();

  // Extract potential topics
  let topic = '';
  for (const pattern of TOPIC_PATTERNS) {
    const match = lastUserQuery?.match(pattern);
    if (match) {
      topic = match[1].trim().slice(0, 50);
      break;
    }
  }

  // Follow-up questions based on content patterns
  if (lowerContent.includes('step') || lowerContent.includes('1.') || lowerContent.includes('first')) {
    replies.push({
      id: 'followup-next',
      text: topic ? `What comes after ${topic}?` : 'What are the next steps?',
      category: 'followup',
    });
  }

  if (lowerContent.includes('example') || lowerContent.includes('for instance')) {
    replies.push({
      id: 'followup-example',
      text: 'Can you give another example?',
      category: 'expand',
    });
  }

  if (lowerContent.includes('advantage') || lowerContent.includes('benefit') || lowerContent.includes('pro')) {
    replies.push({
      id: 'followup-cons',
      text: 'What are the drawbacks?',
      category: 'clarify',
    });
  }

  if (lowerContent.includes('code') || lowerContent.includes('function') || lowerContent.includes('class')) {
    replies.push({
      id: 'followup-optimize',
      text: 'How can I optimize this?',
      category: 'action',
    });
    replies.push({
      id: 'followup-explain',
      text: 'Explain this code line by line',
      category: 'clarify',
    });
  }

  if (lowerContent.includes('error') || lowerContent.includes('bug') || lowerContent.includes('issue')) {
    replies.push({
      id: 'followup-fix',
      text: 'How do I fix this?',
      category: 'action',
    });
  }

  if (lowerContent.includes('compare') || lowerContent.includes('versus') || lowerContent.includes('vs')) {
    replies.push({
      id: 'followup-difference',
      text: 'Which one should I choose?',
      category: 'clarify',
    });
  }

  // Default follow-ups
  if (replies.length === 0) {
    replies.push(
      { id: 'default-more', text: 'Tell me more', category: 'expand' },
      { id: 'default-example', text: 'Give me an example', category: 'expand' },
      { id: 'default-summary', text: 'Summarize this', category: 'clarify' }
    );
  }

  return replies.slice(0, 4);
}

/**
 * Get quick reply chips for a conversation
 */
export function getQuickRepliesForMessage(
  assistantContent: string,
  userQuery?: string
): QuickReply[] {
  return generateQuickReplies(assistantContent, userQuery);
}
