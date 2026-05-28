import React, { createContext, useContext, useState, useCallback } from 'react';
import { LoopConfig, LoopState, LoopHistoryEntry, LoopStatus } from '../types';

export interface LoopContextType {
  loopState: LoopState | null;
  loopPaused: boolean;
  startLoop: (prompt: string, config: LoopConfig) => void;
  pauseLoop: () => void;
  resumeLoop: () => void;
  cancelLoop: () => void;
  completeLoopIteration: (input: string, output: string, toolCalls?: string[], toolResults?: string[]) => void;
  resetLoop: () => void;
  setLoopState: React.Dispatch<React.SetStateAction<LoopState | null>>;
  setLoopPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoopContext = createContext<LoopContextType | null>(null);

let loopCounter = 0;

function checkStopCondition(config: LoopConfig, iterations: number, output: string): boolean {
  switch (config.stopCondition) {
    case 'keyword':
      return config.stopKeyword ? output.includes(config.stopKeyword) : false;
    case 'threshold':
      return iterations >= config.maxIterations;
    case 'manual':
      return false;
    case 'maxIterations':
      return iterations >= config.maxIterations;
    default:
      return false;
  }
}

export function LoopProvider({ children }: { children: React.ReactNode }) {
  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [loopPaused, setLoopPaused] = useState(false);

  const startLoop = useCallback((prompt: string, config: LoopConfig) => {
    loopCounter += 1;
    const initialState: LoopState = {
      id: `loop-${Date.now()}-${loopCounter}`,
      status: 'running',
      currentIteration: 0,
      maxIterations: config.maxIterations,
      startTime: Date.now(),
      lastIterationTime: Date.now(),
      history: [],
    };
    setLoopState(initialState);
    setLoopPaused(false);
  }, []);

  const pauseLoop = useCallback(() => {
    setLoopPaused(true);
    setLoopState(prev => prev ? { ...prev, status: 'paused' as LoopStatus } : null);
  }, []);

  const resumeLoop = useCallback(() => {
    setLoopPaused(false);
    setLoopState(prev => prev ? { ...prev, status: 'running' as LoopStatus } : null);
  }, []);

  const cancelLoop = useCallback(() => {
    setLoopState(prev => prev ? { ...prev, status: 'cancelled' as LoopStatus } : null);
    setLoopPaused(false);
  }, []);

  const completeLoopIteration = useCallback((input: string, output: string, toolCalls?: string[], toolResults?: string[]) => {
    setLoopState(prev => {
      if (!prev) return null;
      const newIteration = prev.currentIteration + 1;
      const entry: LoopHistoryEntry = {
        iteration: newIteration,
        input,
        output,
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
        timestamp: Date.now(),
        duration: Date.now() - prev.lastIterationTime,
        status: 'success',
      };
      const shouldStop = newIteration >= prev.maxIterations;
      return {
        ...prev,
        currentIteration: newIteration,
        lastIterationTime: Date.now(),
        history: [...prev.history, entry],
        status: (shouldStop ? 'completed' : 'running') as LoopStatus,
      };
    });
  }, []);

  const resetLoop = useCallback(() => {
    setLoopState(null);
    setLoopPaused(false);
  }, []);

  return (
    <LoopContext.Provider value={{
      loopState,
      loopPaused,
      startLoop,
      pauseLoop,
      resumeLoop,
      cancelLoop,
      completeLoopIteration,
      resetLoop,
      setLoopState,
      setLoopPaused,
    }}>
      {children}
    </LoopContext.Provider>
  );
}

export function useLoop() {
  const context = useContext(LoopContext);
  if (!context) throw new Error('useLoop must be used within LoopProvider');
  return context;
}
