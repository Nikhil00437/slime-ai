/**
 * Personality Selector - Rotating lineup of AI personas
 * Shows above the message input
 */

import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PERSONALITY_PRESETS, Skill } from '../types';

interface PersonalitySelectorProps {
  activePersonalityId: string | null;
  onPersonalitySelect: (personalityId: string | null) => void;
}

export const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({
  activePersonalityId,
  onPersonalitySelect,
}) => {
  const [scrollIndex, setScrollIndex] = useState(0);
  const maxVisible = 6;

  const displayPersonalities = PERSONALITY_PRESETS.filter(p => p.enabled);
  const visiblePersonalities = displayPersonalities.slice(scrollIndex, scrollIndex + maxVisible);
  const canScrollLeft = scrollIndex > 0;
  const canScrollRight = scrollIndex + maxVisible < displayPersonalities.length;

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setScrollIndex(Math.max(0, scrollIndex - 1));
    } else {
      setScrollIndex(Math.min(displayPersonalities.length - maxVisible, scrollIndex + 1));
    }
  };

  const handlePersonalityClick = (personality: Skill) => {
    if (activePersonalityId === personality.id) {
      onPersonalitySelect(null);
    } else {
      onPersonalitySelect(personality.id);
    }
  };

  if (displayPersonalities.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-2 bg-gradient-to-r from-dark-900/90 via-dark-800/90 to-dark-900/90 border-b border-dark-700/30 backdrop-blur-sm">
      {/* Label */}
      <div className="flex items-center gap-1.5 px-2 text-xs text-dark-500 shrink-0">
        <Sparkles size={12} className="text-purple-400" />
        <span className="hidden sm:inline font-medium">Personas</span>
      </div>

      {/* Scroll left */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="p-1 text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 rounded transition-colors shrink-0"
          title="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Personality icons */}
      <div className="flex items-center gap-1.5 flex-1 justify-start overflow-x-auto scrollbar-hide">
        {visiblePersonalities.map((personality) => {
          const isActive = activePersonalityId === personality.id;

          return (
            <button
              key={personality.id}
              onClick={() => handlePersonalityClick(personality)}
              className={`
                relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                transition-all duration-200 cursor-pointer shrink-0
                ${isActive
                  ? 'bg-purple-500/20 border border-purple-500/40'
                  : 'bg-dark-800/50 border border-transparent hover:bg-dark-700/50 hover:border-dark-600/30'
                }
              `}
              title={personality.name}
            >
              {/* Icon */}
              <span className={`text-base ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}>
                {personality.icon}
              </span>

              {/* Name - show on larger screens when active */}
              <span className={`text-xs hidden sm:inline ${isActive ? 'text-purple-300' : 'text-dark-400 group-hover:text-dark-300'}`}>
                {personality.name}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll right */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className="p-1 text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 rounded transition-colors shrink-0"
          title="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Active personality indicator */}
      {activePersonalityId && (
        <div className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg shrink-0">
          <span className="text-xs text-purple-400">
            {PERSONALITY_PRESETS.find(p => p.id === activePersonalityId)?.icon}
          </span>
          <span className="text-xs text-purple-300 hidden sm:inline">
            {PERSONALITY_PRESETS.find(p => p.id === activePersonalityId)?.name}
          </span>
          <button
            onClick={() => onPersonalitySelect(null)}
            className="ml-0.5 p-0.5 hover:bg-purple-500/20 rounded text-purple-400 hover:text-purple-300"
            title="Clear personality"
          >
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Get personality by ID
 */
export function getPersonalityById(id: string): Skill | undefined {
  return PERSONALITY_PRESETS.find(p => p.id === id);
}

export default PersonalitySelector;