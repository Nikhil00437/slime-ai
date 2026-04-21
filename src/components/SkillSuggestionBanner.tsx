/**
 * SkillSuggestionBanner - Shows suggestions when detecting skills
 * Phase 1: Smart Auto-Detection
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, X, Zap } from 'lucide-react';
import type { Skill } from '../types';
import { RANK_META } from '../slime/types';

interface SkillSuggestionBannerProps {
  skill: Skill;
  confidence: number;
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
  autoHideDelay?: number; // ms, default 10000
}

export const SkillSuggestionBanner: React.FC<SkillSuggestionBannerProps> = ({
  skill,
  confidence,
  reason,
  onAccept,
  onDismiss,
  autoHideDelay = 10000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-hide after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHideDelay]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 200); // Wait for exit animation
  };

  if (!isVisible) return null;

  const rankMeta = RANK_META[skill.rank || 'normal'];

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border mb-2 transition-all duration-200
        ${isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
      style={{
        background: 'rgba(30, 58, 95, 0.6)',
        borderColor: 'rgba(99, 179, 237, 0.3)',
        boxShadow: `0 0 20px ${rankMeta.glow}`,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          boxShadow: `inset 0 0 15px ${rankMeta.glow}`,
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        {/* Content */}
        <div className="flex items-center gap-3">
          {/* Sparkle icon with animation */}
          <div className="relative">
            <Sparkles
              size={20}
              className="text-yellow-400 animate-pulse"
            />
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                background: rankMeta.color,
                opacity: 0.3,
              }}
            />
          </div>

          {/* Skill info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{skill.icon}</span>
              <span className="text-white font-medium truncate">
                {skill.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: rankMeta.badge,
                  color: rankMeta.badgeText,
                }}
              >
                {rankMeta.label}
              </span>
            </div>

            {reason && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {reason}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Confidence indicator */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Zap size={12} className="text-yellow-400" />
            <span>{Math.round(confidence * 100)}%</span>
          </div>

          {/* Accept button */}
          <button
            onClick={onAccept}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
          >
            Enable
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Determine display reason from skill match results
 */
export function getSuggestionReason(
  matchedKeywords: string[],
  matchedTriggers: string[],
  attachmentType?: string
): string {
  if (attachmentType) {
    return `${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)} attachment detected`;
  }

  if (matchedTriggers.length > 0) {
    return `Matches: ${matchedTriggers.slice(0, 2).join(', ')}`;
  }

  if (matchedKeywords.length > 0) {
    return `Matches: ${matchedKeywords.slice(0, 3).join(', ')}`;
  }

  return 'Based on your typing pattern';
}

export default SkillSuggestionBanner;