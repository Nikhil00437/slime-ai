import React from 'react';
import { SlimeSkill, RANK_META, getNextLevelThreshold } from './types';
import { Zap, Star, Crown, Flame, Trash2, CheckCircle, TrendingUp } from 'lucide-react';

interface SkillCardProps {
  skill: SlimeSkill;
  isSelected?: boolean;
  compatScore?: number;
  onSelect?: () => void;
  onDelete?: () => void;
  showCompat?: boolean;
  compact?: boolean;
}

const RankIcon: React.FC<{ rank: SlimeSkill['rank']; size?: number }> = ({ rank, size = 14 }) => {
  const props = { size, strokeWidth: 1.5 };
  if (rank === 'normal') return <Zap {...props} />;
  if (rank === 'rare') return <Star {...props} />;
  if (rank === 'unique') return <Crown {...props} />;
  return <Flame {...props} />;
};

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  isSelected,
  compatScore,
  onSelect,
  onDelete,
  showCompat,
  compact,
}) => {
  const meta = RANK_META[skill.rank];
  const canMerge = showCompat && compatScore !== undefined && compatScore >= 0.95;
  const compatColor =
    compatScore === undefined
      ? meta.color
      : compatScore >= 0.95
      ? '#68D391'
      : compatScore >= 0.5
      ? '#F6AD55'
      : '#FC8181';

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        background: meta.bg,
        border: `1px solid ${isSelected ? meta.color : meta.border}`,
        borderRadius: 12,
        padding: compact ? '10px 12px' : '14px 16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 0 2px ${meta.color}44, inset 0 0 20px ${meta.aura}` : `inset 0 0 12px ${meta.aura}`,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Rank shimmer strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
          opacity: skill.rank === 'ultimate' ? 1 : 0.6,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon */}
        <div
          style={{
            width: compact ? 32 : 38,
            height: compact ? 32 : 38,
            borderRadius: 8,
            background: meta.badge,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 16 : 20,
            flexShrink: 0,
            border: `1px solid ${meta.border}`,
          }}
        >
          {skill.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: 600,
                color: meta.color,
                letterSpacing: '0.01em',
              }}
            >
              {skill.name}
            </span>

            {/* Rank badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                background: meta.badge,
                color: meta.badgeText,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '2px 7px',
                borderRadius: 20,
                textTransform: 'uppercase',
                border: `1px solid ${meta.border}`,
              }}
            >
              <RankIcon rank={skill.rank} size={10} />
              {meta.label}
            </span>

            {skill.isMerged && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(68,51,122,0.5)',
                  color: '#D6BCFA',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '2px 7px',
                  borderRadius: 20,
                  border: '1px solid #6B46C1',
                  textTransform: 'uppercase',
                }}
              >
                ∞ Merged
              </span>
            )}
          </div>

          {!compact && (
            <p
              style={{
                fontSize: 12,
                color: 'rgba(200,210,220,0.7)',
                margin: '4px 0 0',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {skill.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {showCompat && compatScore !== undefined && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                borderRadius: 8,
                background: canMerge ? 'rgba(72,187,120,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${compatColor}44`,
                minWidth: 44,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: compatColor }}>
                {(compatScore * 100).toFixed(0)}%
              </span>
              {canMerge && <CheckCircle size={10} color="#68D391" style={{ marginTop: 2 }} />}
            </div>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(200,100,100,0.5)',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,100,100,0.5)')}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Abilities preview */}
      {!compact && skill.abilities.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {skill.abilities.slice(0, 3).map((ab, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: meta.badgeText,
                background: meta.badge,
                padding: '2px 8px',
                borderRadius: 10,
                border: `1px solid ${meta.border}`,
              }}
            >
              {ab}
            </span>
          ))}
          {skill.abilities.length > 3 && (
            <span style={{ fontSize: 11, color: 'rgba(200,200,220,0.4)' }}>
              +{skill.abilities.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Level progress bar */}
      {!compact && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} style={{ color: meta.color }} />
              <span style={{ fontSize: 11, color: meta.badgeText, fontWeight: 600 }}>
                Lv.{skill.level}
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(200,200,220,0.4)' }}>
              {skill.thumbsUp} / {getNextLevelThreshold(skill.level)} 👍
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 4,
              background: meta.badge,
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${meta.border}`,
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, (skill.thumbsUp / getNextLevelThreshold(skill.level)) * 100))}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${meta.border}, ${meta.color})`,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Compatible models (unique/ultimate) */}
      {!compact && skill.compatibleModels && skill.compatibleModels.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(200,200,220,0.5)' }}>
          <span style={{ color: meta.color, marginRight: 4 }}>Compatible:</span>
          {skill.compatibleModels.join(', ')}
        </div>
      )}
    </div>
  );
};
