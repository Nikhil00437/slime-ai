import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import { LoopConfig, LoopState, LoopHistoryEntry } from '../types';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History,
  Terminal,
} from 'lucide-react';

interface LoopControlPanelProps {
  initialPrompt?: string;
  onStartLoop?: (prompt: string, config: LoopConfig) => void;
  onPauseLoop?: () => void;
  onResumeLoop?: () => void;
  onCancelLoop?: () => void;
  isCompact?: boolean;
}

export const LoopControlPanel: React.FC<LoopControlPanelProps> = ({
  initialPrompt = '',
  onStartLoop,
  onPauseLoop,
  onResumeLoop,
  onCancelLoop,
  isCompact = false,
}) => {
  const { settings, setSettings, isLoading, stopStreaming } = useAppContext();

  // Local loop state
  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [loopConfig, setLoopConfig] = useState<LoopConfig>(
    settings.loopConfig || DEFAULT_LOOP_CONFIG
  );
  const [loopEnabled, setLoopEnabled] = useState(settings.loopEnabled);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [showHistory, setShowHistory] = useState(false);

  // Sync with settings
  useEffect(() => {
    setLoopConfig(settings.loopConfig || DEFAULT_LOOP_CONFIG);
    setLoopEnabled(settings.loopEnabled);
  }, [settings.loopConfig, settings.loopEnabled]);

  // Update settings when config changes
  const handleConfigChange = useCallback((updates: Partial<LoopConfig>) => {
    setLoopConfig(prev => {
      const newConfig = { ...prev, ...updates };
      setSettings(prevSettings => ({
        ...prevSettings,
        loopConfig: newConfig,
      }));
      return newConfig;
    });
  }, [setSettings]);

  const toggleLoopEnabled = useCallback(() => {
    const newEnabled = !loopEnabled;
    setLoopEnabled(newEnabled);
    setSettings(prev => ({
      ...prev,
      loopEnabled: newEnabled,
    }));
  }, [loopEnabled, setSettings]);

  // Calculate progress
  const progress = loopState
    ? (loopState.currentIteration / loopState.maxIterations) * 100
    : 0;

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getStatusIcon = () => {
    if (!loopState) return null;
    switch (loopState.status) {
      case 'running':
        return <Play className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (): string => {
    if (!loopEnabled) return 'Loop Disabled';
    if (!loopState) return 'Ready';
    return loopState.status.charAt(0).toUpperCase() + loopState.status.slice(1);
  };

  // Compact view
  if (isCompact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={toggleLoopEnabled}
          className={`p-1.5 rounded ${
            loopEnabled
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
          title={loopEnabled ? 'Loop enabled' : 'Loop disabled'}
        >
          <Terminal className="w-4 h-4" />
        </button>

        {loopEnabled && loopState && (
          <>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {loopState.currentIteration}/{loopState.maxIterations}
            </span>
            <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {getStatusIcon()}
            <button
              onClick={() => loopState.status === 'paused' ? onResumeLoop?.() : onPauseLoop?.()}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={loopState.status === 'paused' ? 'Resume' : 'Pause'}
            >
              {loopState.status === 'paused' ? (
                <Play className="w-3 h-3" />
              ) : (
                <Pause className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={onCancelLoop}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
              title="Cancel loop"
            >
              <Square className="w-3 h-3" />
            </button>
          </>
        )}

        {loopEnabled && !loopState && (
          <span className="text-xs text-gray-500">Ready</span>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLoopEnabled}
            className={`p-2 rounded-lg transition-colors ${
              loopEnabled
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Loop Execution
              </span>
              {getStatusIcon()}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  loopState?.status === 'running'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : loopState?.status === 'error'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {getStatusLabel()}
              </span>
            </div>
            {loopState && (
              <div className="text-xs text-gray-500 mt-0.5">
                Iteration {loopState.currentIteration} of {loopState.maxIterations}
                {loopState.lastIterationTime > 0 && (
                  <> · Last: {formatDuration(loopState.lastIterationTime)}</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loopState && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Loop history"
            >
              <History className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {loopState && (
        <div className="h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Initial Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Enter the prompt to loop..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
              rows={3}
              disabled={!!loopState && loopState.status === 'running'}
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Iterations
              </label>
              <input
                type="number"
                value={loopConfig.maxIterations}
                onChange={e =>
                  handleConfigChange({ maxIterations: Math.max(1, parseInt(e.target.value) || 1) })
                }
                min={1}
                max={100}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={!!loopState && loopState.status === 'running'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Iteration Timeout (s)
              </label>
              <input
                type="number"
                value={loopConfig.iterationTimeout / 1000}
                onChange={e =>
                  handleConfigChange({
                    iterationTimeout: Math.max(1000, (parseInt(e.target.value) || 30) * 1000),
                  })
                }
                min={1}
                max={300}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={!!loopState && loopState.status === 'running'}
              />
            </div>
          </div>

          {/* Stop condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stop Condition
            </label>
            <select
              value={loopConfig.stopCondition}
              onChange={e =>
                handleConfigChange({
                  stopCondition: e.target.value as LoopConfig['stopCondition'],
                })
              }
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={!!loopState && loopState.status === 'running'}
            >
              <option value="manual">Manual (click stop)</option>
              <option value="maxIterations">Max Iterations</option>
              <option value="keyword">Keyword Detection</option>
              <option value="threshold">Threshold</option>
            </select>
          </div>

          {/* Conditional fields */}
          {loopConfig.stopCondition === 'keyword' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stop Keyword
              </label>
              <input
                type="text"
                value={loopConfig.stopKeyword || ''}
                onChange={e => handleConfigChange({ stopKeyword: e.target.value })}
                placeholder="e.g., DONE, COMPLETE, STOP"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={!!loopState && loopState.status === 'running'}
              />
            </div>
          )}

          {loopConfig.stopCondition === 'threshold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stop Threshold (tool results count)
              </label>
              <input
                type="number"
                value={loopConfig.stopThreshold || 0}
                onChange={e =>
                  handleConfigChange({ stopThreshold: Math.max(0, parseInt(e.target.value) || 0) })
                }
                min={0}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={!!loopState && loopState.status === 'running'}
              />
            </div>
          )}

          {/* Auto-continue and exit strategy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoContinue"
                checked={loopConfig.autoContinueOnToolResult}
                onChange={e =>
                  handleConfigChange({ autoContinueOnToolResult: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
                disabled={!!loopState && loopState.status === 'running'}
              />
              <label
                htmlFor="autoContinue"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Auto-continue on tool result
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exit Strategy
              </label>
              <select
                value={loopConfig.exitStrategy}
                onChange={e =>
                  handleConfigChange({
                    exitStrategy: e.target.value as LoopConfig['exitStrategy'],
                  })
                }
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={!!loopState && loopState.status === 'running'}
              >
                <option value="immediate">Immediate</option>
                <option value="afterToolResult">After Tool Result</option>
                <option value="onResponse">On Response</option>
              </select>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 pt-2">
            {!loopState || loopState.status === 'idle' ? (
              <button
                onClick={() => onStartLoop?.(prompt, loopConfig)}
                disabled={!loopEnabled || !prompt.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Start Loop
              </button>
            ) : loopState.status === 'running' ? (
              <>
                <button
                  onClick={onPauseLoop}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={onCancelLoop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : loopState.status === 'paused' ? (
              <>
                <button
                  onClick={onResumeLoop}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  onClick={onCancelLoop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setLoopState(null);
                  setPrompt('');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}

            {loopState && (
              <button
                onClick={() => setLoopState(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* History panel */}
          {showHistory && loopState && loopState.history.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Loop History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loopState.history.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Iteration {entry.iteration}
                      </span>
                      <span
                        className={`text-xs ${
                          entry.status === 'success'
                            ? 'text-green-600'
                            : entry.status === 'error'
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {entry.status} · {formatDuration(entry.duration)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                      {entry.input.slice(0, 100)}
                      {entry.input.length > 100 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export hook for using loop in context
export function useLoop() {
  const { settings, setSettings } = useAppContext();

  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const startLoop = useCallback(
    (initialPrompt: string, config: LoopConfig) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      setLoopState({
        id,
        status: 'running',
        currentIteration: 0,
        maxIterations: config.maxIterations,
        startTime: Date.now(),
        lastIterationTime: 0,
        history: [],
      });
      setIsPaused(false);
    },
    []
  );

  const pauseLoop = useCallback(() => {
    setIsPaused(true);
    setLoopState(prev =>
      prev ? { ...prev, status: 'paused' } : null
    );
  }, []);

  const resumeLoop = useCallback(() => {
    setIsPaused(false);
    setLoopState(prev =>
      prev ? { ...prev, status: 'running' } : null
    );
  }, []);

  const cancelLoop = useCallback(() => {
    setLoopState(prev =>
      prev ? { ...prev, status: 'cancelled' } : null
    );
    setIsPaused(false);
  }, []);

  const completeIteration = useCallback(
    (input: string, output: string, toolCalls: string[] = [], toolResults: string[] = []) => {
      setLoopState(prev => {
        if (!prev) return null;
        const duration = Date.now() - prev.startTime;
        const newEntry: LoopHistoryEntry = {
          iteration: prev.currentIteration,
          timestamp: Date.now(),
          input,
          output,
          toolCalls,
          toolResults,
          duration,
          status: 'success',
        };
        return {
          ...prev,
          currentIteration: prev.currentIteration + 1,
          lastIterationTime: duration,
          history: [...prev.history, newEntry],
          status: prev.currentIteration + 1 >= prev.maxIterations ? 'completed' : 'running',
        };
      });
    },
    []
  );

  const resetLoop = useCallback(() => {
    setLoopState(null);
    setIsPaused(false);
  }, []);

  return {
    loopState,
    isPaused,
    startLoop,
    pauseLoop,
    resumeLoop,
    cancelLoop,
    completeIteration,
    resetLoop,
    setLoopState,
  };
}

export default LoopControlPanel;