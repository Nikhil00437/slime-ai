/**
 * Skill Tooltip - Preview on hover
 * Phase 2: Enhanced UI/UX
 * Shows skill system prompt preview when hovering
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Skill } from '../types';
import { RANK_META } from '../slime/types';

interface SkillTooltipProps {
  skill: Skill;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
}

export const SkillTooltip: React.FC<SkillTooltipProps> = ({
  skill,
  children,
  position = 'bottom',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const rankMeta = RANK_META[skill.rank || 'normal'];

  // Preview the first ~120 chars of system prompt
  const promptPreview = skill.systemPrompt.length > 120
    ? skill.systemPrompt.slice(0, 120) + '...'
    : skill.systemPrompt;

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
    }, 150);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 w-72 p-3 rounded-lg border shadow-xl
            transition-all duration-150
            ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}
            left-1/2 -translate-x-1/2
          `}
          style={{
            background: 'rgba(26, 32, 44, 0.98)',
            borderColor: rankMeta.border,
            boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 10px ${rankMeta.glow}`,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{skill.icon}</span>
            <span className="text-white font-medium">{skill.name}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-auto"
              style={{
                background: rankMeta.badge,
                color: rankMeta.badgeText,
              }}
            >
              {rankMeta.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-400 mb-2">{skill.description}</p>

          {/* System prompt preview */}
          <div className="text-xs text-gray-300 bg-gray-800/50 rounded p-2 mb-2 max-h-24 overflow-y-auto">
            <span className="text-gray-500 text-xs block mb-1">System Prompt:</span>
            {promptPreview}
          </div>

          {/* Keywords if available */}
          {skill.keywords && skill.keywords.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-500">Triggers:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {skill.keywords.slice(0, 6).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Click hint */}
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
            Click to activate • Press Esc to close
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Simple tooltip without the skill content
 * For generic use
 */
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs bg-gray-900 text-gray-200 rounded border border-gray-700 whitespace-nowrap ${positionClasses[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default SkillTooltip;