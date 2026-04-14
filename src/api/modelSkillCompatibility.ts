import { ModelInfo, ModelCapabilities } from '../types';
import { SlimeSkill } from '../slime/types';
import { Skill } from '../types';

export interface SkillModelCompatibility {
  skillId: string;
  requiredCapabilities: (keyof ModelCapabilities)[];
  recommendedProviders: string[];
  reason: string;
}

export const SKILL_MODEL_COMPATIBILITY: SkillModelCompatibility[] = [
  {
    skillId: 'code-expert',
    requiredCapabilities: ['text'],
    recommendedProviders: ['ollama', 'lmstudio', 'openai', 'anthropic', 'openrouter'],
    reason: 'Code Expert works best with models that have strong reasoning capabilities',
  },
  {
    skillId: 'creative-writer',
    requiredCapabilities: ['text'],
    recommendedProviders: ['ollama', 'lmstudio', 'openai', 'anthropic', 'openrouter', 'gemini', 'grok'],
    reason: 'Creative Writer works with any text-capable model',
  },
  {
    skillId: 'research-analyst',
    requiredCapabilities: ['text'],
    recommendedProviders: ['openai', 'anthropic', 'openrouter'],
    reason: 'Research Analyst works best with models optimized for analysis and citations',
  },
  {
    skillId: 'teacher',
    requiredCapabilities: ['text'],
    recommendedProviders: ['ollama', 'lmstudio', 'openai', 'anthropic', 'openrouter', 'gemini'],
    reason: 'Teacher works with any text-capable model',
  },
  {
    skillId: 'debate-partner',
    requiredCapabilities: ['text'],
    recommendedProviders: ['openai', 'anthropic', 'openrouter', 'grok'],
    reason: 'Debate Partner works best with reasoning-focused models',
  },
  {
    skillId: 'gluttony-skill',
    requiredCapabilities: ['text'],
    recommendedProviders: ['openai', 'anthropic', 'openrouter'],
    reason: 'Gluttony skill works best with models that support complex prompt engineering',
  },
];

export function getSkillCompatibility(skillId: string): SkillModelCompatibility | undefined {
  return SKILL_MODEL_COMPATIBILITY.find(c => c.skillId === skillId);
}

export function isModelCompatibleWithSkill(
  model: ModelInfo,
  skill: SlimeSkill | Skill | null
): { compatible: boolean; reason: string } {
  if (!skill) {
    return { compatible: true, reason: '' };
  }

  const skillId = skill.id;
  const compatibility = getSkillCompatibility(skillId);
  if (!compatibility) {
    return { compatible: true, reason: '' };
  }

  if (compatibility.recommendedProviders.length > 0) {
    if (!compatibility.recommendedProviders.includes(model.provider)) {
      return {
        compatible: false,
        reason: `${skill.name} may not work optimally with ${model.provider.toUpperCase()} models`,
      };
    }
  }

  const caps = model.capabilities;
  if (caps) {
    for (const required of compatibility.requiredCapabilities) {
      if (!caps[required]) {
        return {
          compatible: false,
          reason: `${skill.name} requires ${required} capability which this model doesn't support`,
        };
      }
    }
  }

  return { compatible: true, reason: '' };
}

export function filterModelsBySkill(
  models: ModelInfo[],
  skill: SlimeSkill | Skill | null
): ModelInfo[] {
  if (!skill) {
    return models;
  }

  return models.filter(model => {
    const { compatible } = isModelCompatibleWithSkill(model, skill);
    return compatible;
  });
}

export function getIncompatibleModels(
  models: ModelInfo[],
  skill: SlimeSkill | Skill | null
): Array<{ model: ModelInfo; reason: string }> {
  if (!skill) {
    return [];
  }

  return models
    .map(model => {
      const { compatible, reason } = isModelCompatibleWithSkill(model, skill);
      return { model, compatible, reason };
    })
    .filter(item => !item.compatible)
    .map(item => ({ model: item.model, reason: item.reason }));
}
