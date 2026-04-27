/**
 * Skill Chaining Engine
 * Phase 6: Advanced Features
 * Auto-switch skills based on triggers
 */

import type { Skill } from '../types';

export interface SkillChainRule {
  id: string;
  name: string;
  triggerSkillId: string;
  triggerCondition: 'contains' | 'startsWith' | 'regex';
  triggerValue: string;
  targetSkillId: string;
  confidence: number; // 0-1, minimum confidence to trigger
  enabled: boolean;
}

// Predefined chain rules
export const DEFAULT_CHAIN_RULES: SkillChainRule[] = [
  {
    id: 'code-explains',
    name: 'Code + Explain → Teacher',
    triggerSkillId: 'code-expert',
    triggerCondition: 'contains',
    triggerValue: 'explain',
    targetSkillId: 'teacher',
    confidence: 0.8,
    enabled: true,
  },
  {
    id: 'writer-analyzes',
    name: 'Writer + Analyze → Research',
    triggerSkillId: 'creative-writer',
    triggerCondition: 'contains',
    triggerValue: 'analyze',
    targetSkillId: 'research-analyst',
    confidence: 0.8,
    enabled: true,
  },
  {
    id: 'research-writes',
    name: 'Research + Write → Writer',
    triggerSkillId: 'research-analyst',
    triggerCondition: 'contains',
    triggerValue: 'write',
    targetSkillId: 'creative-writer',
    confidence: 0.8,
    enabled: true,
  },
  {
    id: 'teacher-debate',
    name: 'Teacher + Argue → Debate',
    triggerSkillId: 'teacher',
    triggerCondition: 'contains',
    triggerValue: 'disagree',
    targetSkillId: 'debate-partner',
    confidence: 0.8,
    enabled: true,
  },
];

// Storage
let chainRules: SkillChainRule[] = [...DEFAULT_CHAIN_RULES];

// LocalStorage key
const STORAGE_KEY = 'skill-chain-rules';

/**
 * Load chain rules from localStorage
 */
export function loadChainRules(): SkillChainRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      chainRules = parsed.length > 0 ? parsed : DEFAULT_CHAIN_RULES;
    }
  } catch {
    chainRules = DEFAULT_CHAIN_RULES;
  }
  return chainRules;
}

/**
 * Save chain rules to localStorage
 */
export function saveChainRules(rules: SkillChainRule[]): void {
  chainRules = rules;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// Recursion guard state
const chainDepthMap = new Map<string, number>();
const MAX_CHAIN_DEPTH = 3;
const CHAIN_WINDOW_MS = 30000; // 30 seconds

/**
 * Check recursion depth for a conversation
 */
function checkRecursionDepth(conversationId: string): boolean {
  const now = Date.now();
  const depth = chainDepthMap.get(conversationId) || 0;
  return depth < MAX_CHAIN_DEPTH;
}

/**
 * Increment chain depth
 */
function incrementChainDepth(conversationId: string): void {
  const depth = chainDepthMap.get(conversationId) || 0;
  chainDepthMap.set(conversationId, depth + 1);
  // Auto-reset after window
  setTimeout(() => {
    const current = chainDepthMap.get(conversationId) || 0;
    if (current > 0) {
      chainDepthMap.set(conversationId, current - 1);
    }
  }, CHAIN_WINDOW_MS);
}

/**
 * Reset chain depth for a conversation
 */
export function resetChainDepth(conversationId: string): void {
  chainDepthMap.delete(conversationId);
}

/**
 * Check if a skill chain should trigger
 */
export function checkSkillChain(
  currentSkillId: string | null,
  query: string,
  skills: Skill[],
  conversationId?: string
): { skill: Skill | null; reason: string } | null {
  if (!currentSkillId) return null;

  // Recursion guard
  if (conversationId && !checkRecursionDepth(conversationId)) {
    console.warn('[SkillChain] Recursion depth limit reached for conversation:', conversationId);
    return null;
  }

  const activeRules = chainRules.filter(r => r.enabled && r.triggerSkillId === currentSkillId);

  for (const rule of activeRules) {
    let shouldTrigger = false;

    switch (rule.triggerCondition) {
      case 'contains':
        shouldTrigger = query.toLowerCase().includes(rule.triggerValue.toLowerCase());
        break;
      case 'startsWith':
        shouldTrigger = query.toLowerCase().startsWith(rule.triggerValue.toLowerCase());
        break;
      case 'regex':
        try {
          const regex = new RegExp(rule.triggerValue, 'i');
          shouldTrigger = regex.test(query);
        } catch {
          shouldTrigger = false;
        }
        break;
    }

    if (shouldTrigger) {
      // Check confidence threshold
      if (rule.confidence >= 0.7) {
        const targetSkill = skills.find(s => s.id === rule.targetSkillId && s.enabled);
        if (targetSkill) {
          // Increment recursion depth if conversation ID provided
          if (conversationId) {
            incrementChainDepth(conversationId);
          }
          return {
            skill: targetSkill,
            reason: `Chain: "${rule.name}" triggered`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Add a new chain rule
 */
export function addChainRule(rule: Omit<SkillChainRule, 'id'>): void {
  const newRule: SkillChainRule = {
    ...rule,
    id: `chain-${Date.now()}`,
  };
  chainRules.push(newRule);
  saveChainRules(chainRules);
}

/**
 * Remove a chain rule
 */
export function removeChainRule(ruleId: string): void {
  chainRules = chainRules.filter(r => r.id !== ruleId);
  saveChainRules(chainRules);
}

/**
 * Toggle chain rule enabled state
 */
export function toggleChainRule(ruleId: string): void {
  const rule = chainRules.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    saveChainRules(chainRules);
  }
}

/**
 * Get all chain rules
 */
export function getAllChainRules(): SkillChainRule[] {
  return chainRules;
}

/**
 * Reset to default chain rules
 */
export function resetChainRules(): void {
  chainRules = [...DEFAULT_CHAIN_RULES];
  saveChainRules(chainRules);
}