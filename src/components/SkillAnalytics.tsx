import React from 'react';

interface SkillUsageData {
  skillId: string;
  skillName: string;
  count: number;
  percentage: number;
  lastUsed?: number;
}

interface SkillHeatmapProps {
  data: SkillUsageData[];
  maxValue?: number;
}

export function SkillHeatmap({ data, maxValue }: SkillHeatmapProps) {
  const max = maxValue || Math.max(...data.map(d => d.count), 1);

  const getHeatLevel = (count: number): number => {
    const ratio = count / max;
    if (ratio === 0) return 0;
    if (ratio <= 0.2) return 1;
    if (ratio <= 0.4) return 2;
    if (ratio <= 0.6) return 3;
    if (ratio <= 0.8) return 4;
    return 5;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No skill usage data yet</p>
        <p className="text-xs mt-1">Start using skills to see usage statistics</p>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      {data
        .sort((a, b) => b.count - a.count)
        .map((item) => (
          <div key={item.skillId} className="heatmap-row">
            <span className="heatmap-label" title={item.skillName}>
              {item.skillName}
            </span>
            <div className="heatmap-bar-container">
              <div
                className={`heatmap-bar level-${getHeatLevel(item.count)}`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="heatmap-value">{item.count}</span>
          </div>
        ))}
    </div>
  );
}

interface SkillStatisticsProps {
  totalActivations: number;
  uniqueSkills: number;
  mostUsedSkill: string | null;
  averagePerDay: number;
  streakDays: number;
}

export function SkillStatistics({
  totalActivations,
  uniqueSkills,
  mostUsedSkill,
  averagePerDay,
  streakDays,
}: SkillStatisticsProps) {
  const stats = [
    { value: totalActivations, label: 'Total Activations' },
    { value: uniqueSkills, label: 'Unique Skills' },
    { value: averagePerDay.toFixed(1), label: 'Avg/Day' },
    { value: streakDays, label: 'Day Streak' },
  ];

  return (
    <div className="skill-stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="skill-stat-card">
          <div className="skill-stat-value">{stat.value}</div>
          <div className="skill-stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

interface SkillUsageTimelineProps {
  data: { date: string; count: number }[];
  height?: number;
}

export function SkillUsageTimeline({ data, height = 100 }: SkillUsageTimelineProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        No timeline data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 rounded-t transition-colors group relative"
          style={{ height: `${(item.count / maxCount) * 100}%` }}
          title={`${item.date}: ${item.count} uses`}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {item.date}: {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}