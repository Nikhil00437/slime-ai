/**
 * ToolLevelCard - Displays tool level progression
 * Phase 4: Tool Leveling UI
 */

import React from 'react';
import { ToolLevel, getToolNextLevelThreshold, TOOL_RANK_META, ToolRank } from '../types';
import { ThumbsUp, ThumbsDown, TrendingUp, Clock } from 'lucide-react';

interface ToolLevelCardProps {
  toolId: string;
  toolName: string;
  level: ToolLevel;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  compact?: boolean;
}

const RankIcon: React.FC<{ rank: ToolRank; size?: number }> = ({ rank, size = 14 }) => {
  const meta = TOOL_RANK_META[rank];
  return (
    <span style={{ fontSize: size }} role="img" aria-label={meta.label}>
      {meta.icon}
    </span>
  );
};

export const ToolLevelCard: React.FC<ToolLevelCardProps> = ({
  toolId,
  toolName,
  level,
  onThumbsUp,
  onThumbsDown,
  compact = false,
}) => {
  const meta = TOOL_RANK_META[level.rank];
  const nextThreshold = getToolNextLevelThreshold(level.level);
  const progress = level.totalCalls > 0 
    ? Math.min(100, (level.totalCalls / nextThreshold) * 100)
    : 0;

  const successRate = level.totalCalls > 0
    ? Math.round((level.successfulCalls / level.totalCalls) * 100)
    : 0;

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: meta.badge,
          borderRadius: 8,
          border: `1px solid ${meta.border}`,
        }}
      >
        <RankIcon rank={level.rank} size={16} />
        <span style={{ color: meta.color, fontWeight: 600, fontSize: 13 }}>
          {toolName}
        </span>
        <span style={{ color: meta.badgeText, fontSize: 11 }}>
          Lv.{level.level}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${meta.badge} 0%, rgba(30,30,40,1) 100%)`,
        border: `1px solid ${meta.color}44`,
        borderRadius: 12,
        padding: 16,
        boxShadow: `0 0 20px ${meta.glow}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RankIcon rank={level.rank} size={24} />
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, color: meta.color }}>
              {toolName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span
                style={{
                  background: meta.color,
                  color: meta.badge,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {meta.label}
              </span>
              <span style={{ color: meta.badgeText, fontSize: 12 }}>
                Level {level.level}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: meta.badgeText }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{level.totalCalls}</div>
            <div style={{ opacity: 0.7 }}>calls</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#68D391' }}>{successRate}%</div>
            <div style={{ opacity: 0.7 }}>success</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: meta.badgeText }}>
            <TrendingUp size={12} />
            Progress to Lv.{level.level + 1}
          </span>
          <span style={{ color: 'rgba(200,200,220,0.5)' }}>
            {level.totalCalls} / {nextThreshold} calls
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 6,
            background: meta.border,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${meta.border}, ${meta.color})`,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Mastery points */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTop: `1px solid ${meta.border}44`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: meta.badgeText }}>
          <span style={{ color: meta.color, fontWeight: 600 }}>{level.masteryPoints}</span>
          mastery points
        </div>

        {/* Last used */}
        {level.lastUsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(200,200,220,0.5)' }}>
            <Clock size={10} />
            {new Date(level.lastUsed).toLocaleDateString()}
          </div>
        )}

        {/* Thumbs buttons */}
        {(onThumbsUp || onThumbsDown) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onThumbsUp && (
              <button
                onClick={onThumbsUp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(72,187,120,0.15)',
                  border: '1px solid rgba(72,187,120,0.3)',
                  color: '#68D391',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ThumbsUp size={12} />
                {level.thumbsUp}
              </button>
            )}
            {onThumbsDown && (
              <button
                onClick={onThumbsDown}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(245,101,101,0.15)',
                  border: '1px solid rgba(245,101,101,0.3)',
                  color: '#FC8181',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ThumbsDown size={12} />
                {level.thumbsDown}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolLevelCard;