import React, { useState, useEffect } from 'react';
import {
  ProcessingBlock,
  ProcessingStep,
} from '../types';
import {
  Cpu,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  Activity,
  Zap,
  Terminal,
  Database,
  FileCode,
  Network,
} from 'lucide-react';

interface ProcessingSidebarProps {
  content: ProcessingBlock;
  compact?: boolean;
}

interface StepProgress {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export function ProcessingSidebar({ content, compact = false }: ProcessingSidebarProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>(content.steps);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<StepProgress[]>([]);
  const [copied, setCopied] = useState(false);

  // Initialize step progress tracking
  useEffect(() => {
    const initialProgress: StepProgress[] = content.steps.map(step => ({
      stepId: step.id,
      status: step.status,
      startTime: step.startTime,
      endTime: step.endTime,
      duration: step.endTime && step.startTime 
        ? step.endTime - step.startTime 
        : undefined,
    }));
    setProgress(initialProgress);
  }, [content.steps]);

  // Update step progress when steps change
  useEffect(() => {
    setSteps(content.steps);
  }, [content.steps]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const isExpanded = (stepId: string) => expandedSteps.has(stepId);

  const getStepIcon = (step: ProcessingStep) => {
    const name = step.name.toLowerCase();
    if (name.includes('fetch') || name.includes('http') || name.includes('api')) {
      return <Network className="w-4 h-4" />;
    }
    if (name.includes('db') || name.includes('database') || name.includes('sql')) {
      return <Database className="w-4 h-4" />;
    }
    if (name.includes('code') || name.includes('file') || name.includes('write')) {
      return <FileCode className="w-4 h-4" />;
    }
    if (name.includes('shell') || name.includes('exec') || name.includes('run')) {
      return <Terminal className="w-4 h-4" />;
    }
    
    switch (step.status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-dark-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStepColor = (step: ProcessingStep) => {
    switch (step.status) {
      case 'pending':
        return 'text-dark-400';
      case 'running':
        return 'text-cyan-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  const getStepBgColor = (step: ProcessingStep) => {
    switch (step.status) {
      case 'pending':
        return 'bg-dark-800/40 border-dark-700/50';
      case 'running':
        return 'bg-cyan-500/10 border-cyan-500/30';
      case 'completed':
        return 'bg-green-500/10 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  const handleCopy = async () => {
    const summary = steps.map(step => {
      return `[${step.status.toUpperCase()}] ${step.name}`;
    }).join('\n');
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const runningSteps = steps.filter(s => s.status === 'running');
  const errorCount = steps.filter(s => s.status === 'error').length;

  if (compact) {
    return (
      <div className="processing-sidebar-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-cyan-400">Processing</span>
            {content.isStreaming && (
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400 ml-auto" />
            )}
          </div>
          {runningSteps.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-cyan-400">
              <Zap className="w-3 h-3 animate-pulse" />
              {runningSteps.map(step => step.startTime && (
                <span key={step.id} className="font-mono">
                  {Math.floor((Date.now() - step.startTime) / 1000)}s
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar with gradient */}
        <div className="flex items-center gap-2 text-xs text-dark-500 mb-3">
          <span className="font-medium">{completedCount}/{totalCount}</span>
          <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {steps.slice(0, 3).map(step => (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${getStepBgColor(step)}`}
            >
              <div className={`flex-shrink-0 ${getStepColor(step)}`}>
                {getStepIcon(step)}
              </div>
              <span className={`text-xs font-medium flex-1 truncate ${getStepColor(step)}`}>
                {step.name}
              </span>
              {step.status === 'running' && step.startTime && (
                <span className="text-xs text-cyan-500 font-mono ml-auto">
                  {Math.floor((Date.now() - step.startTime) / 1000)}s
                </span>
              )}
              {step.status === 'completed' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
              )}
            </button>
          ))}
          {steps.length > 3 && (
            <div className="text-xs text-dark-500 text-center py-2 bg-dark-800/30 rounded-lg">
              +{steps.length - 3} more steps
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="processing-sidebar-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-cyan-400">Processing</span>
            {content.isStreaming && (
              <span className="text-xs text-cyan-500/70 ml-2 animate-pulse">Running...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-700/80 hover:bg-dark-600/80 border border-dark-600/50 text-dark-200 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Enhanced progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-dark-500 mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-medium">Progress</span>
          </div>
          <span>{completedCount}/{totalCount} steps</span>
        </div>
        <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-green-400 transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
        {errorCount > 0 && (
          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorCount} step(s) failed
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`processing-step rounded-xl border transition-all ${
              isExpanded(step.id) 
                ? `${getStepBgColor(step)} shadow-lg` 
                : 'bg-dark-800/40 border-dark-700/50 hover:border-dark-600'
            }`}
          >
            <button
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getStepBgColor(step)}`}>
                <span className={`text-xs font-bold ${getStepColor(step)}`}>
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${getStepColor(step)}`}>
                  {step.name}
                </div>
                {step.status === 'running' && step.startTime && (
                  <div className="text-xs text-cyan-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{Math.floor((Date.now() - step.startTime) / 1000)}s</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                )}
                {step.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                {isExpanded(step.id) ? (
                  <ChevronDown className="w-4 h-4 text-dark-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-dark-500" />
                )}
              </div>
            </button>

            {isExpanded(step.id) && (
              <div className="px-4 pb-4 border-t border-dark-700/50 pt-3 mt-2">
                {step.input && (
                  <div className="mb-3">
                    <div className="text-xs text-dark-500 mb-2 flex items-center gap-1">
                      <span className="font-medium">Input</span>
                    </div>
                    <pre className="text-xs bg-dark-900/80 rounded-lg p-3 overflow-x-auto text-cyan-400 font-mono border border-dark-700/50">
                      {formatJson(step.input)}
                    </pre>
                  </div>
                )}
                
                {step.output && (
                  <div className="mb-3">
                    <div className="text-xs text-dark-500 mb-2 flex items-center gap-1">
                      <span className="font-medium">Output</span>
                    </div>
                    <pre className="text-xs bg-dark-900/80 rounded-lg p-3 overflow-x-auto text-green-400 font-mono border border-dark-700/50 max-h-40 overflow-y-auto">
                      {formatJson(step.output)}
                    </pre>
                  </div>
                )}
                
                {step.error && (
                  <div className="mb-3">
                    <div className="text-xs text-red-400 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-medium">Error</span>
                    </div>
                    <pre className="text-xs bg-red-900/20 rounded-lg p-3 overflow-x-auto text-red-300 font-mono border border-red-500/30">
                      {step.error}
                    </pre>
                  </div>
                )}

                {step.startTime && step.endTime && (
                  <div className="flex items-center gap-2 text-xs text-dark-500">
                    <Clock className="w-3 h-3" />
                    <span>Duration:</span>
                    <span className="text-cyan-400 font-mono">{step.endTime - step.startTime}ms</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {steps.length > 0 && (
        <div className="pt-4 border-t border-dark-700/50 mt-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-dark-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-dark-500" />
                Pending: {steps.filter(s => s.status === 'pending').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                Running: {runningSteps.length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Done: {completedCount}
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  Failed: {errorCount}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}