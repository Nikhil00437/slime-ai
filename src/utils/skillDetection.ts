/**
 * Enhanced skill detection utilities with confidence scoring
 * Phase 1: Smart Auto-Detection
 */

import type { Skill } from '../types';

/** Confidence threshold for auto-activating a skill */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Minimum confidence to show suggestion banner */
export const SUGGESTION_THRESHOLD = 0.5;

/** Maximum suggestions to track per query */
export const MAX_MATCHES = 3;

/**
 * Calculate the confidence score for a skill based on query content
 */
export function calculateSkillConfidence(
  skill: Skill,
  query: string,
  attachmentType?: string
): { confidence: number; matchedKeywords: string[]; matchedTriggers: string[] } {
  const lowerQuery = query.toLowerCase();
  const matchedKeywords: string[] = [];
  const matchedTriggers: string[] = [];
  let score = 0;

  // Check keywords (weighted scoring)
  const keywords = skill.keywords || [];
  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase();
    if (lowerQuery.includes(lowerKw)) {
      matchedKeywords.push(kw);
      // Base weight: 1.0 per keyword
      // Additional weight for multi-word matches (more specific)
      const weight = kw.includes(' ') ? 1.5 : 1.0;
      score += weight;
    }
  }

  // Check memory triggers (these get bonus weight)
  const triggers = skill.memoryTriggers || [];
  for (const trigger of triggers) {
    const lowerTrigger = trigger.toLowerCase();
    if (lowerQuery.includes(lowerTrigger)) {
      matchedTriggers.push(trigger);
      // Triggers are strong signals - higher weight
      score += 2.0;
    }
  }

  // Attachment-aware activation (if attachment present)
  const attachmentScore = calculateAttachmentConfidence(skill, attachmentType);
  score += attachmentScore * 10; // Scale to 4 points max

  // Normalize score to 0-1 range
  // More keywords = higher confidence, but with diminishing returns
  const maxExpectedScore = 10; // Expect around 10 significant keywords
  const confidence = Math.min(1, score / maxExpectedScore);

  return {
    confidence,
    matchedKeywords,
    matchedTriggers,
  };
}

/**
 * Detect skill(s) from query with confidence scoring
 */
export function detectSkillFromQuery(
  query: string,
  skills: Skill[],
  attachmentType?: string
): {
  skill: Skill | null;
  confidence: number;
  matchedKeywords: string[];
  matchedTriggers: string[];
  allMatches: Array<{
    skill: Skill;
    confidence: number;
    matchedKeywords: string[];
    matchedTriggers: string[];
  }>;
} {
  if (!query.trim() || skills.length === 0) {
    return {
      skill: null,
      confidence: 0,
      matchedKeywords: [],
      matchedTriggers: [],
      allMatches: [],
    };
  }

  const matches: Array<{
    skill: Skill;
    confidence: number;
    matchedKeywords: string[];
    matchedTriggers: string[];
  }> = [];

  for (const skill of skills) {
    if (!skill.enabled) continue;

    const { confidence, matchedKeywords, matchedTriggers } = calculateSkillConfidence(
      skill,
      query,
      attachmentType
    );

    if (confidence > 0) {
      matches.push({
        skill,
        confidence,
        matchedKeywords,
        matchedTriggers,
      });
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  // Return top match above threshold
  const topMatch = matches.find(m => m.confidence >= CONFIDENCE_THRESHOLD);

  return {
    skill: topMatch?.skill ?? null,
    confidence: topMatch?.confidence ?? 0,
    matchedKeywords: topMatch?.matchedKeywords ?? [],
    matchedTriggers: topMatch?.matchedTriggers ?? [],
    allMatches: matches.slice(0, MAX_MATCHES),
  };
}

/**
 * Check if we should show a suggestion banner
 */
export function shouldShowSuggestion(
  query: string,
  skills: Skill[],
  attachmentType?: string
): boolean {
  const result = detectSkillFromQuery(query, skills, attachmentType);
  return (
    result.confidence >= SUGGESTION_THRESHOLD &&
    result.confidence < CONFIDENCE_THRESHOLD
  );
}

/**
 * Get skill suggestions for the current query
 * Returns skills that might be relevant but don't meet auto-activation threshold
 */
export function getSkillSuggestions(
  query: string,
  skills: Skill[],
  attachmentType?: string
): Array<{
  skill: Skill;
  confidence: number;
  reason: string;
}> {
  const result = detectSkillFromQuery(query, skills, attachmentType);
  const suggestions: Array<{
    skill: Skill;
    confidence: number;
    reason: string;
  }> = [];

  // Add matches below threshold
  for (const match of result.allMatches) {
    if (match.confidence < CONFIDENCE_THRESHOLD && match.confidence >= 0.1) {
      let reason = '';
      if (match.matchedTriggers.length > 0) {
        reason = `Matches: ${match.matchedTriggers.slice(0, 2).join(', ')}`;
      } else if (match.matchedKeywords.length > 0) {
        reason = `Matches: ${match.matchedKeywords.slice(0, 3).join(', ')}`;
      }

      suggestions.push({
        skill: match.skill,
        confidence: match.confidence,
        reason,
      });
    }
  }

  // Include attachment-based suggestions
  if (attachmentType === 'image') {
    const visionSkills = skills.filter(
      s => s.keywords?.some(kw => kw.toLowerCase().includes('image'))
    );
    for (const skill of visionSkills) {
      if (!suggestions.find(s => s.skill.id === skill.id)) {
        suggestions.push({
          skill,
          confidence: 0.8,
          reason: 'Image attachment detected',
        });
      }
    }
  }

  return suggestions.slice(0, MAX_MATCHES);
}

/**
 * Determine conversation type from query content
 */
export type ConversationType = 'coding' | 'writing' | 'analysis' | 'creative' | 'general';

const CONVERSATION_TYPE_KEYWORDS: Record<ConversationType, string[]> = {
  coding: [
    'code',
    'function',
    'class',
    'debug',
    'api',
    'bug',
    'error',
    'import',
    'export',
    'type',
    'interface',
    'react',
    'python',
    'javascript',
    'typescript',
    'sql',
    'database',
  ],
  writing: [
    'write',
    'story',
    'poem',
    'essay',
    'article',
    'blog',
    'script',
    'fiction',
    'creative',
    'narrative',
  ],
  analysis: [
    'analyze',
    'research',
    'data',
    'report',
    'compare',
    'explain',
    'why',
    'how',
    'breakdown',
  ],
  creative: [
    'idea',
    'brainstorm',
    'design',
    'create',
    'imagine',
    'innovate',
    'concept',
  ],
  general: [],
};

export function detectConversationType(query: string): ConversationType {
  const lowerQuery = query.toLowerCase();

  let bestType: ConversationType = 'general';
  let maxScore = 0;

  for (const [convType, keywords] of Object.entries(CONVERSATION_TYPE_KEYWORDS)) {
    if (convType === 'general') continue;

    const score = keywords.filter(kw => lowerQuery.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      bestType = convType as ConversationType;
    }
  }

  return bestType;
}

/**
 * Get default skill for a conversation type
 */
export function getDefaultSkillForType(
  type: ConversationType,
  skills: Skill[]
): Skill | null {
  const typeToSkill: Record<ConversationType, string> = {
    coding: 'code-expert',
    writing: 'creative-writer',
    analysis: 'research-analyst',
    creative: 'creative-writer',
    general: 'teacher',
  };

  const skillId = typeToSkill[type];
  return skills.find(s => s.id === skillId && s.enabled) ?? null;
}

// Re-export skill type for convenience
export type { Skill };

/**
 * Get the primary attachment type from a list of attachments
 */
export function getAttachmentTypeFromList(
  attachments: Array<{ type: string }>
): string | undefined {
  if (attachments.length === 0) return undefined;

  // Prioritize image > audio > video > file
  const priority = ['image', 'audio', 'video', 'file'];
  for (const type of priority) {
    if (attachments.some(a => a.type === type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * Check if a skill supports a given attachment type
 * This is a simple heuristic - can be enhanced with actual model capabilities
 */
export function skillSupportsAttachmentType(
  skill: Skill,
  attachmentType: string
): boolean {
  // Define attachment type support per category/keyword
  const categorySupports: Record<string, string[]> = {
    coding: ['image', 'file'], // Code experts can handle images (UI review) and files
    analysis: ['image', 'file', 'data'],
    writing: ['image', 'file'],
    creative: ['image', 'audio', 'video', 'file'],
  };

  const supported = categorySupports[skill.category || 'general'] || [];
  return supported.includes(attachmentType);
}

/**
 * Boost confidence score when skill supports the attachment type
 */
export function calculateAttachmentConfidence(
  skill: Skill,
  attachmentType: string | undefined
): number {
  if (!attachmentType) return 0;

  if (skillSupportsAttachmentType(skill, attachmentType)) {
    // Strong boost for attachment-type match
    return 0.4;
  }

  return 0;
}