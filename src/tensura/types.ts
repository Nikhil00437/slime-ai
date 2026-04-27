export type SkillRank = 'normal' | 'rare' | 'unique' | 'ultimate' | 'terminal';

export interface TensuraSkill {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  rank: SkillRank;
  rankReason: string;
  abilities: string[];
  limitations: string[];
  compatibleModels?: string[];
  createdAt: number;
  sourceFile?: string;
  isMerged?: boolean;
  mergedFrom?: string[];
  compatibilityScore?: number;
}

export interface SkillGenerationResult {
  skill: TensuraSkill;
  generationLog: string;
}

export interface CompatibilityResult {
  skillId: string;
  score: number;
  reason: string;
}

export const RANK_GENERATION_RATES = {
  normal: 0.55,
  rare: 0.40,
  unique: 0.05,
  ultimate: 0,
  terminal: 0.0000001,
} as const;

export const RANK_META = {
  normal: {
    label: 'Normal',
    color: '#7B8FA1',
    glow: 'rgba(123,143,161,0.3)',
    border: '#4A5568',
    bg: 'linear-gradient(135deg, #1a2030 0%, #232d3f 100%)',
    badge: '#2D3748',
    badgeText: '#A0ADB8',
    aura: 'rgba(100,120,150,0.15)',
  },
  rare: {
    label: 'Rare',
    color: '#63B3ED',
    glow: 'rgba(99,179,237,0.4)',
    border: '#2B6CB0',
    bg: 'linear-gradient(135deg, #0d1b2e 0%, #1a2d4a 100%)',
    badge: '#2A4365',
    badgeText: '#90CDF4',
    aura: 'rgba(66,153,225,0.18)',
  },
  unique: {
    label: 'Unique',
    color: '#B794F4',
    glow: 'rgba(183,148,244,0.5)',
    border: '#6B46C1',
    bg: 'linear-gradient(135deg, #1a0d2e 0%, #2d1b4a 100%)',
    badge: '#44337A',
    badgeText: '#D6BCFA',
    aura: 'rgba(159,122,234,0.22)',
  },
  ultimate: {
    label: 'Ultimate',
    color: '#FBD38D',
    glow: 'rgba(251,211,141,0.6)',
    border: '#B7791F',
    bg: 'linear-gradient(135deg, #2d1a00 0%, #4a2d08 100%)',
    badge: '#744210',
    badgeText: '#FAF089',
    aura: 'rgba(236,201,75,0.25)',
  },
  terminal: {
    label: 'Terminal',
    color: '#000000',
    glow: 'rgba(0,0,0,0.8)',
    border: '#1a1a1a',
    bg: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
    badge: '#000000',
    badgeText: '#ffffff',
    aura: 'rgba(0,0,0,0.5)',
  },
} as const;
