import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToolLevel, TOOL_SETTINGS } from '../types';

interface ToolSettingsState {
  enabledTools: Record<string, boolean>;
}

interface ToolLevelsState {
  levels: Record<string, ToolLevel>;
}

export interface ToolContextType {
  toolSettings: ToolSettingsState;
  toolLevels: ToolLevelsState;
  isExecutingTool: boolean;
  activeTools: string[];
  toolApprovalState: Record<string, 'pending' | 'approved' | 'denied'>;
  toggleTool: (toolName: string) => void;
  resetToolSettings: () => void;
  getToolLevel: (toolId: string) => ToolLevel;
  recordToolCall: (toolId: string, success: boolean, durationMs: number) => void;
  thumbsUpTool: (toolId: string) => void;
  thumbsDownTool: (toolId: string) => void;
  setToolApproval: (toolName: string, state: 'pending' | 'approved' | 'denied') => void;
  setIsExecutingTool: (executing: boolean) => void;
}

const ToolContext = createContext<ToolContextType | null>(null);

const DEFAULT_TOOL_SETTINGS: ToolSettingsState = {
  enabledTools: Object.keys(TOOL_SETTINGS).reduce((acc, key) => {
    acc[key] = TOOL_SETTINGS[key as keyof typeof TOOL_SETTINGS]?.enabled ?? true;
    return acc;
  }, {} as Record<string, boolean>),
};

const DEFAULT_TOOL_LEVELS: ToolLevelsState = {
  levels: {},
};

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [toolSettings, setToolSettings] = useState<ToolSettingsState>(DEFAULT_TOOL_SETTINGS);
  const [toolLevels, setToolLevels] = useState<ToolLevelsState>(DEFAULT_TOOL_LEVELS);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [activeTools] = useState<string[]>([]);
  const [toolApprovalState, setToolApprovalState] = useState<Record<string, 'pending' | 'approved' | 'denied'>>({});

  const toggleTool = useCallback((toolName: string) => {
    setToolSettings(prev => ({
      ...prev,
      enabledTools: { ...prev.enabledTools, [toolName]: !prev.enabledTools[toolName] },
    }));
  }, []);

  const resetToolSettings = useCallback(() => {
    setToolSettings(DEFAULT_TOOL_SETTINGS);
  }, []);

  const getToolLevel = useCallback((toolId: string): ToolLevel => {
    return toolLevels.levels[toolId] || {
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
  }, [toolLevels]);

  const calculateLevel = (calls: number, thumbsUp: number): { rank: string; level: number; masteryPoints: number } => {
    const masteryPoints = calls + (thumbsUp * 5);
    let rank = 'basic';
    let level = 1;
    if (calls >= 5000) { rank = 'legendary'; level = 10; }
    else if (calls >= 2500) { rank = 'master'; level = 9; }
    else if (calls >= 1000) { rank = 'master'; level = 8; }
    else if (calls >= 500) { rank = 'master'; level = 7; }
    else if (calls >= 250) { rank = 'expert'; level = 6; }
    else if (calls >= 100) { rank = 'expert'; level = 5; }
    else if (calls >= 50) { rank = 'expert'; level = 4; }
    else if (calls >= 25) { rank = 'advanced'; level = 3; }
    else if (calls >= 10) { rank = 'advanced'; level = 2; }
    return { rank, level, masteryPoints };
  };

  const recordToolCall = useCallback((toolId: string, success: boolean, _durationMs: number) => {
    setToolLevels(prev => {
      const current = prev.levels[toolId] || {
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
      const newTotalCalls = current.totalCalls + 1;
      const newSuccessfulCalls = success ? current.successfulCalls + 1 : current.successfulCalls;
      const newFailedCalls = !success ? current.failedCalls + 1 : current.failedCalls;
      const { rank, level, masteryPoints } = calculateLevel(newTotalCalls, current.thumbsUp);
      return {
        ...prev,
        levels: {
          ...prev.levels,
          [toolId]: {
            ...current,
            totalCalls: newTotalCalls,
            successfulCalls: newSuccessfulCalls,
            failedCalls: newFailedCalls,
            rank: rank as any,
            level,
            masteryPoints,
            lastUsed: Date.now(),
          },
        },
      };
    });
  }, []);

  const thumbsUpTool = useCallback((toolId: string) => {
    setToolLevels(prev => {
      const current = prev.levels[toolId] || { toolId, rank: 'basic', level: 1, totalCalls: 0, successfulCalls: 0, failedCalls: 0, thumbsUp: 0, thumbsDown: 0, masteryPoints: 0 };
      const { rank, level, masteryPoints } = calculateLevel(current.totalCalls, current.thumbsUp + 1);
      return {
        ...prev,
        levels: {
          ...prev.levels,
          [toolId]: { ...current, thumbsUp: current.thumbsUp + 1, rank: rank as any, level, masteryPoints },
        },
      };
    });
  }, []);

  const thumbsDownTool = useCallback((toolId: string) => {
    setToolLevels(prev => {
      const current = prev.levels[toolId] || { toolId, rank: 'basic', level: 1, totalCalls: 0, successfulCalls: 0, failedCalls: 0, thumbsUp: 0, thumbsDown: 0, masteryPoints: 0 };
      return {
        ...prev,
        levels: {
          ...prev.levels,
          [toolId]: { ...current, thumbsDown: current.thumbsDown + 1 },
        },
      };
    });
  }, []);

  const setToolApproval = useCallback((toolName: string, state: 'pending' | 'approved' | 'denied') => {
    setToolApprovalState(prev => ({ ...prev, [toolName]: state }));
  }, []);

  return (
    <ToolContext.Provider value={{
      toolSettings,
      toolLevels,
      isExecutingTool,
      activeTools,
      toolApprovalState,
      toggleTool,
      resetToolSettings,
      getToolLevel,
      recordToolCall,
      thumbsUpTool,
      thumbsDownTool,
      setToolApproval,
      setIsExecutingTool,
    }}>
      {children}
    </ToolContext.Provider>
  );
}

export function useTools() {
  const context = useContext(ToolContext);
  if (!context) throw new Error('useTools must be used within ToolProvider');
  return context;
}