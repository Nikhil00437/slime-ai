/**
 * Tool Leveling API
 * Phase 5: Tool Usage Tracking
 */

import { ToolLevel, getToolRankFromLevel, getToolNextLevelThreshold } from '../types';

/**
 * Calculate the new level based on total calls
 */
export function calculateToolLevel(totalCalls: number): number {
  // Simple formula: level grows with log of calls
  // Level 1: 0-9 calls
  // Level 2: 10-24 calls
  // Level 3: 25-49 calls
  // Level 4: 50-99 calls
  // Level 5: 100-249 calls
  // etc.
  for (let level = 10; level >= 1; level--) {
    const threshold = getToolNextLevelThreshold(level);
    if (totalCalls >= threshold) {
      return level + 1;
    }
  }
  return 1;
}

/**
 * Create a new tool level entry
 */
export function createToolLevel(toolId: string): ToolLevel {
  return {
    toolId,
    rank: 'basic',
    level: 1,
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    thumbsUp: 0,
    thumbsDown: 0,
    masteryPoints: 0,
  };
}

/**
 * Update tool level after a tool call
 */
export function updateToolLevelAfterCall(
  currentLevel: ToolLevel,
  success: boolean,
  durationMs: number
): ToolLevel {
  const newTotalCalls = currentLevel.totalCalls + 1;
  const newSuccessfulCalls = currentLevel.successfulCalls + (success ? 1 : 0);
  const newFailedCalls = currentLevel.failedCalls + (success ? 0 : 1);
  const newMasteryPoints = currentLevel.masteryPoints + (success ? 10 : 1);
  const newLevel = calculateToolLevel(newTotalCalls);
  const newRank = getToolRankFromLevel(newLevel);

  return {
    ...currentLevel,
    totalCalls: newTotalCalls,
    successfulCalls: newSuccessfulCalls,
    failedCalls: newFailedCalls,
    lastUsed: Date.now(),
    level: newLevel,
    rank: newRank,
    masteryPoints: newMasteryPoints,
  };
}

/**
 * Get rank color for CSS
 */
export function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    basic: '#7B8FA1',
    advanced: '#63B3ED',
    expert: '#B794F4',
    master: '#FBD38D',
    legendary: '#F56565',
  };
  return colors[rank] || colors.basic;
}

/**
 * Calculate success rate percentage
 */
export function getSuccessRate(level: ToolLevel): number {
  if (level.totalCalls === 0) return 0;
  return Math.round((level.successfulCalls / level.totalCalls) * 100);
}

/**
 * Get progress to next level (0-100)
 */
export function getLevelProgress(level: ToolLevel): number {
  const nextThreshold = getToolNextLevelThreshold(level.level);
  if (nextThreshold === 0) return 100;
  return Math.min(100, (level.totalCalls / nextThreshold) * 100);
}