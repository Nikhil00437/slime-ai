/**
 * Analytics Dashboard
 * Phase 4: Analytics & Learning
 * Usage statistics and skill performance tracking
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { getSkillUsageStats, getSkillSuccessRates } from '../api/skillContextLearning';
import type { ConversationType } from '../utils/skillDetection';

interface UsageStats {
  totalUsages: number;
  bySkill: Record<string, number>;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
}

interface SuccessRates {
  coding: Record<string, { success: number; total: number; rate: number }>;
  writing: Record<string, { success: number; total: number; rate: number }>;
  analysis: Record<string, { success: number; total: number; rate: number }>;
  creative: Record<string, { success: number; total: number; rate: number }>;
  general: Record<string, { success: number; total: number; rate: number }>;
}

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [rates, setRates] = useState<SuccessRates | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usageStats, successRates] = await Promise.all([
        getSkillUsageStats(),
        getSkillSuccessRates(),
      ]);
      setStats(usageStats);
      setRates(successRates);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportCSV = () => {
    if (!stats) return;

    const rows = [['Skill', 'Usage Count', 'Percentage']];
    const total = stats.totalUsages || 1;

    for (const [skill, count] of Object.entries(stats.bySkill)) {
      rows.push([skill, count.toString(), ((count / total) * 100).toFixed(1) + '%']);
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skill-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get top skills for pie chart
  const topSkills = stats
    ? Object.entries(stats.bySkill)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const totalUsage = stats?.totalUsages || 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-400" />
          <h3 className="text-white font-medium">Skill Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportCSV}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Export CSV"
          >
            <Download size={14} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading analytics...
        </div>
      ) : totalUsage === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <BarChart3 size={32} className="opacity-30 mb-2" />
          <p>No usage data yet</p>
          <p className="text-xs mt-1">Use skills to see analytics</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Total Uses</div>
              <div className="text-xl font-bold text-white">{totalUsage}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Skills Used</div>
              <div className="text-xl font-bold text-white">{Object.keys(stats?.bySkill || {}).length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Success Rate</div>
              <div className="text-xl font-bold text-green-400">
                {stats?.byOutcome?.success
                  ? Math.round((stats.byOutcome.success / totalUsage) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          {/* By skill chart */}
          <div>
            <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
              <PieChart size={14} /> Usage by Skill
            </h4>
            <div className="space-y-2">
              {topSkills.map(([skill, count], idx) => {
                const percentage = (count / totalUsage) * 100;
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];

                return (
                  <div key={skill} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 truncate">{skill}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${colors[idx]} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By conversation type */}
          <div>
            <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-1">
              <TrendingUp size={14} /> Success by Type
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {(['coding', 'writing', 'analysis', 'creative'] as ConversationType[]).map(type => {
                const typeStats = rates?.[type];
                if (!typeStats) return null;

                const total = Object.values(typeStats).reduce((sum, s) => sum + s.total, 0);
                const success = Object.values(typeStats).reduce((sum, s) => sum + s.success, 0);
                const rate = total > 0 ? (success / total) * 100 : 0;

                return (
                  <div key={type} className="bg-gray-800/30 rounded p-2">
                    <div className="text-xs text-gray-400 capitalize">{type}</div>
                    <div className="text-sm font-medium text-white">{total} uses</div>
                    <div className="text-xs" style={{ color: rate >= 70 ? '#4ade80' : rate >= 50 ? '#facc15' : '#f87171' }}>
                      {rate.toFixed(0)}% success
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;