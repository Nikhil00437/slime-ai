/**
 * Skill Templates
 * Phase 3: Templates & Presets
 * Pre-built skill bundles for common workflows
 */

import type { Skill } from '../types';

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  skillIds: string[]; // Skills to merge via Gluttony
  recommendedModel?: string;
  category: 'coding' | 'writing' | 'analysis' | 'creative' | 'custom';
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Combined code analysis and research capabilities for thorough code reviews',
    icon: '🔍',
    skillIds: ['code-expert', 'research-analyst'],
    recommendedModel: 'claude-sonnet-4-20250514',
    category: 'coding',
  },
  {
    id: 'creative-copywriter',
    name: 'Creative Copywriter',
    description: 'Creative writing enhanced with teaching capabilities for engaging content',
    icon: '📝',
    skillIds: ['creative-writer', 'teacher'],
    category: 'writing',
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    description: 'Code expertise combined with creative writing for clear documentation',
    icon: '📚',
    skillIds: ['code-expert', 'creative-writer'],
    category: 'coding',
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Research and analysis skills combined with coding for data work',
    icon: '📊',
    skillIds: ['research-analyst', 'code-expert'],
    category: 'analysis',
  },
  {
    id: 'debate-coach',
    name: 'Debate Coach',
    description: 'Debate skills enhanced with teaching for learning discussions',
    icon: '🎓',
    skillIds: ['debate-partner', 'teacher'],
    category: 'analysis',
  },
];

export const INDUSTRY_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSkills: string[];
  recommendedModels: string[];
  basePrompt: string;
}> = [
  {
    id: 'web-dev',
    name: 'Web Developer',
    description: 'Full-stack web development focus',
    icon: '🌐',
    defaultSkills: ['code-expert'],
    recommendedModels: ['claude-sonnet-4-20250514', 'gpt-4o'],
    basePrompt: 'You are an expert web developer specializing in modern JavaScript frameworks.',
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Data analysis and machine learning',
    icon: '🤖',
    defaultSkills: ['research-analyst', 'code-expert'],
    recommendedModels: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    basePrompt: 'You are a data scientist with expertise in machine learning and statistical analysis.',
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Writing and creative content generation',
    icon: '🎨',
    defaultSkills: ['creative-writer'],
    recommendedModels: ['gpt-4o', 'claude-sonnet-4-20250514'],
    basePrompt: 'You are a creative content writer specializing in engaging marketing copy.',
  },
  {
    id: 'student',
    name: 'Student',
    description: 'Learning and research assistance',
    icon: '📖',
    defaultSkills: ['teacher', 'research-analyst'],
    recommendedModels: ['claude-sonnet-4-20250514'],
    basePrompt: 'You are a patient tutor helping students understand complex topics.',
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Research and communication for product work',
    icon: '📦',
    defaultSkills: ['research-analyst', 'creative-writer'],
    recommendedModels: ['gpt-4o'],
    basePrompt: 'You are a product manager focused on user needs and data-driven decisions.',
  },
];

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: string): SkillTemplate[] {
  if (category === 'all') return SKILL_TEMPLATES;
  return SKILL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find(t => t.id === id);
}

/**
 * Check if Gluttony is available for a template
 */
export function canUseTemplate(template: SkillTemplate, existingSkills: Skill[]): boolean {
  return template.skillIds.every(skillId =>
    existingSkills.some(s => s.id === skillId && s.enabled)
  );
}