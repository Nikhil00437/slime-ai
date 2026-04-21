export type SkillRank = 'normal' | 'rare' | 'unique' | 'ultimate' | 'terminal';

export interface SlimeSkill {
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
  level: number;
  thumbsUp: number;
  thumbsDown: number;
  lastUsed?: number;
  isDefault?: boolean;
  enabled: boolean;
  builtIn: boolean;
  category?: 'coding' | 'writing' | 'analysis' | 'creative' | 'custom';
}

export interface SkillGenerationResult {
  skill: SlimeSkill;
  generationLog: string;
}

export interface CompatibilityResult {
  skillId: string;
  score: number;
  reason: string;
}

export const LEVEL_THRESHOLDS = [0, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

/** Exponential growth factor for levels beyond 10 */
const EXPONENTIAL_GROWTH_FACTOR = 1.5;

/** Base threshold for exponential calculation (level 10 threshold) */
const EXPONENTIAL_BASE = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]; // 10000

/** Maximum predefined level index */
const MAX_PREDEFINED_LEVEL = LEVEL_THRESHOLDS.length; // 10

/**
 * Get the thumbsUp threshold for a given level.
 * Levels 1-10 use predefined thresholds.
 * Levels 11+ use exponential formula: 10000 * 1.5^(level - 10)
 */
export function getThumbsUpForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= MAX_PREDEFINED_LEVEL) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  // Exponential growth beyond level 10
  return Math.floor(EXPONENTIAL_BASE * Math.pow(EXPONENTIAL_GROWTH_FACTOR, level - MAX_PREDEFINED_LEVEL));
}

/**
 * Get the level from a given thumbsUp count.
 * Handles both predefined thresholds (1-10) and exponential growth (11+).
 */
export function getLevelFromThumbsUp(thumbsUp: number): number {
  // Check predefined thresholds first
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (thumbsUp >= LEVEL_THRESHOLDS[i]) {
      const baseLevel = i + 1;
      if (baseLevel < MAX_PREDEFINED_LEVEL) return baseLevel;
      // thumbsUp >= 10000, check exponential levels
      break;
    }
  }

  // If below first threshold
  if (thumbsUp < LEVEL_THRESHOLDS[0]) return 1;

  // Check exponential levels beyond 10
  let level = MAX_PREDEFINED_LEVEL;
  while (thumbsUp >= getThumbsUpForLevel(level + 1)) {
    level++;
    // Safety cap to prevent infinite loops
    if (level > 1000) break;
  }
  return level;
}

/**
 * Get the thumbsUp threshold needed to reach the NEXT level after the current one.
 * Useful for progress bar calculations.
 */
export function getNextLevelThreshold(currentLevel: number): number {
  return getThumbsUpForLevel(currentLevel + 1);
}

export const RANK_GENERATION_RATES = {
  normal: 0.55,
  rare: 0.40,
  unique: 0.05,
  ultimate: 0,
  terminal: 0,
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

export const DEFAULT_GLUTTONY_SKILL: SlimeSkill = {
  id: 'gluttony-skill',
  name: 'Gluttony',
  description: 'The ability to merge two or more compatible skills together into a single powerful skill. Requires 0.95+ compatibility between skills.',
  systemPrompt: 'You have the Gluttony skill - the power to merge compatible skills. When asked to merge skills, analyze their compatibility and create a new merged skill that combines their abilities.',
  icon: '👁️',
  rank: 'unique',
  rankReason: 'Default unique skill - the power to consume and combine other skills.',
  abilities: ['Merge 2+ compatible skills', 'Analyze skill compatibility', 'Create combined skill abilities'],
  limitations: ['Requires 0.95+ compatibility', 'Cannot merge with itself', 'Merged skill inherits highest rank'],
  createdAt: 0,
  level: 1,
  thumbsUp: 0,
  thumbsDown: 0,
  isDefault: true,
  enabled: true,
  builtIn: true,
};

export type MemoryCategory = 'perpetually' | 'periodically' | 'ephemerally';

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: number;
  lastAccessed: number;
  chatId?: string;
}
