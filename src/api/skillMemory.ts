/**
 * Skill-Specific Memory
 * Phase 5: Skill Memory Integration
 * Each skill can have its own knowledge base that's injected when active
 */

import { saveSkillsToVault, loadSkillsFromVault } from './vault';
import type { Skill } from '../types';

/**
 * Knowledge base entry for a skill
 */
export interface SkillKnowledgeBase {
  skillId: string;
  preferences: string; // User's coding style, preferences
  projectContext: string; // Current project context
  learnedPatterns: string[]; // Patterns learned from analytics
  updatedAt: number;
}

/**
 * Get skill-specific knowledge base
 * Loads from vault if connected, otherwise uses in-memory cache
 */
const knowledgeBaseCache: Map<string, SkillKnowledgeBase> = new Map();

export async function getSkillKnowledgeBase(skillId: string): Promise<SkillKnowledgeBase | null> {
  // Check cache first
  if (knowledgeBaseCache.has(skillId)) {
    return knowledgeBaseCache.get(skillId)!;
  }

  // Try to load from vault
  try {
    const skills = await loadSkillsFromVault();
    const skillKnowledgeBase = skills.find((s: { id: string }) => s.id === `${skillId}-knowledge`);
    
    if (skillKnowledgeBase) {
      const kb: SkillKnowledgeBase = {
        skillId,
        preferences: skillKnowledgeBase.preferences || '',
        projectContext: skillKnowledgeBase.projectContext || '',
        learnedPatterns: skillKnowledgeBase.learnedPatterns || [],
        updatedAt: skillKnowledgeBase.updatedAt || Date.now(),
      };
      knowledgeBaseCache.set(skillId, kb);
      return kb;
    }
  } catch {
    // Vault not available, continue with empty
  }

  return null;
}

/**
 * Update skill knowledge base
 */
export async function updateSkillKnowledgeBase(
  skillId: string,
  updates: Partial<Omit<SkillKnowledgeBase, 'skillId' | 'updatedAt'>>
): Promise<void> {
  const existing = await getSkillKnowledgeBase(skillId);
  
  const kb: SkillKnowledgeBase = {
    skillId,
    preferences: updates.preferences ?? existing?.preferences ?? '',
    projectContext: updates.projectContext ?? existing?.projectContext ?? '',
    learnedPatterns: updates.learnedPatterns ?? existing?.learnedPatterns ?? [],
    updatedAt: Date.now(),
  };

  knowledgeBaseCache.set(skillId, kb);

  // Save to vault
  try {
    await saveSkillsToVault([{
      id: `${skillId}-knowledge`,
      name: `${skillId} Knowledge`,
      description: 'Automated knowledge base',
      systemPrompt: '',
      icon: '📚',
      rank: 'normal',
      rankReason: 'Knowledge base',
      abilities: [],
      limitations: [],
      createdAt: kb.updatedAt,
      level: 1,
      thumbsUp: 0,
      thumbsDown: 0,
      isDefault: true,
      enabled: true,
      builtIn: true,
      preferences: kb.preferences,
      projectContext: kb.projectContext,
      learnedPatterns: kb.learnedPatterns,
    }]);
  } catch {
    console.warn('[SkillMemory] Failed to save to vault, using cache only');
  }
}

/**
 * Learn a pattern from skill usage
 */
export async function learnPattern(skillId: string, pattern: string): Promise<void> {
  const kb = await getSkillKnowledgeBase(skillId);
  const patterns = kb?.learnedPatterns || [];

  // Don't add duplicates
  if (patterns.includes(pattern)) return;

  // Keep max 10 patterns
  const newPatterns = [...patterns, pattern].slice(-10);

  await updateSkillKnowledgeBase(skillId, {
    learnedPatterns: newPatterns,
  });
}

/**
 * Build enhanced system prompt with skill knowledge
 */
export async function getEnhancedSystemPrompt(skill: Skill): Promise<string> {
  let prompt = skill.systemPrompt;
  
  const kb = await getSkillKnowledgeBase(skill.id);
  if (!kb) return prompt;

  const additions: string[] = [];

  // Add preferences
  if (kb.preferences) {
    additions.push(`User preferences:\n${kb.preferences}`);
  }

  // Add project context
  if (kb.projectContext) {
    additions.push(`Current project context:\n${kb.projectContext}`);
  }

  // Add learned patterns
  if (kb.learnedPatterns.length > 0) {
    additions.push(`Observed patterns:\n${kb.learnedPatterns.map(p => `- ${p}`).join('\n')}`);
  }

  if (additions.length > 0) {
    prompt += `\n\n${additions.join('\n\n')}`;
  }

  return prompt;
}

/**
 * Infer and save user preferences from conversation
 */
export async function inferPreference(
  skillId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  // Coding preferences
  if (skillId === 'code-expert') {
    const prefPatterns: Array<{ pattern: string; trigger: RegExp }> = [
      { pattern: 'Prefers functional components', trigger: /hooks|functional component/i },
      { pattern: 'Uses TypeScript', trigger: /typescript|type\s+[A-Z]/i },
      { pattern: 'Prefers early returns', trigger: /early return|guard clause/i },
      { pattern: 'Uses async\/await', trigger: /async|await|Promise/i },
      { pattern: 'Uses arrow functions', trigger: /arrow function|\(.*\)\s*=>/i },
    ];

    for (const { pattern, trigger } of prefPatterns) {
      if (trigger.test(userMessage) || trigger.test(assistantResponse)) {
        await learnPattern(skillId, pattern);
      }
    }
  }
}

/**
 * Clear skill knowledge base
 */
export async function clearSkillKnowledgeBase(skillId: string): Promise<void> {
  knowledgeBaseCache.delete(skillId);
  
  try {
    // Clear from vault
    await saveSkillsToVault([]);
  } catch {
    // Ignore errors
  }
}