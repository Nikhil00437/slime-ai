/**
 * Skill Quick Access Bar
 * Phase 2: Enhanced UI/UX
 * Quick-access icon bar for pinning favorite skills above chat input
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Zap, X } from 'lucide-react';
import type { Skill } from '../types';
import { RANK_META } from '../slime/types';

interface SkillQuickAccessBarProps {
  skills: Skill[];
  activeSkillId: string | null;
  onSkillToggle: (skillId: string | null) => void;
  pinnedSkillIds?: string[];
  maxVisible?: number;
}

export const SkillQuickAccessBar: React.FC<SkillQuickAccessBarProps> = ({
  skills,
  activeSkillId,
  onSkillToggle,
  pinnedSkillIds = [],
  maxVisible = 5,
}) => {
  const [scrollIndex, setScrollIndex] = useState(0);

  // Filter to pinned skills or all enabled skills
  const displaySkills = pinnedSkillIds.length > 0
    ? skills.filter(s => pinnedSkillIds.includes(s.id) && s.enabled)
    : skills.filter(s => s.enabled);

  const visibleSkills = displaySkills.slice(scrollIndex, scrollIndex + maxVisible);
  const canScrollLeft = scrollIndex > 0;
  const canScrollRight = scrollIndex + maxVisible < displaySkills.length;

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setScrollIndex(Math.max(0, scrollIndex - 1));
    } else {
      setScrollIndex(Math.min(displaySkills.length - maxVisible, scrollIndex + 1));
    }
  };

  const handleSkillClick = (skill: Skill) => {
    // Toggle: if same skill is active, deactivate; otherwise activate
    if (activeSkillId === skill.id) {
      onSkillToggle(null);
    } else {
      onSkillToggle(skill.id);
    }
  };

  if (displaySkills.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/50 border-b border-gray-800">
      {/* Scroll left button */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          title="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Skill icons */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {visibleSkills.map((skill) => {
          const isActive = activeSkillId === skill.id;
          const rankMeta = RANK_META[skill.rank || 'normal'];

          return (
            <button
              key={skill.id}
              onClick={() => handleSkillClick(skill)}
              className={`
                relative group flex items-center justify-center w-9 h-9 rounded-lg
                transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-gray-700 ring-2'
                  : 'bg-gray-800/50 hover:bg-gray-700 hover:scale-105'
                }
              `}
              style={{
                boxShadow: isActive ? `0 0 12px ${rankMeta.glow}` : undefined,
                borderColor: isActive ? rankMeta.color : 'transparent',
              }}
              title={skill.name}
            >
              {/* Skill icon */}
              <span className={`text-lg ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`}>
                {skill.icon}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: rankMeta.color }}
                />
              )}

              {/* Rank badge on hover (could be moved to tooltip) */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 transition-opacity
                           pointer-events-none bottom-full left-1/2 -translate-x-1/2 mb-1
                           bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10"
              >
                {skill.name}
                {isActive && <span className="ml-1 text-green-400">(active)</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scroll right button */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          title="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Active skill indicator */}
      {activeSkillId && (
        <div className="ml-2 flex items-center gap-1 text-xs text-gray-400">
          <Zap size={12} className="text-yellow-400" />
          <span className="hidden sm:inline">
            {skills.find(s => s.id === activeSkillId)?.name}
          </span>
          <button
            onClick={() => onSkillToggle(null)}
            className="ml-1 p-0.5 hover:bg-gray-700 rounded"
            title="Deactivate skill"
          >
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Get pinned skill IDs from localStorage
 */
export function getPinnedSkillIds(): string[] {
  try {
    const stored = localStorage.getItem('pinnedSkillIds');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save pinned skill IDs to localStorage
 */
export function savePinnedSkillIds(ids: string[]): void {
  localStorage.setItem('pinnedSkillIds', JSON.stringify(ids));
}

export default SkillQuickAccessBar;