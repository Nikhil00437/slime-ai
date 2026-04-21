import React, { useState, useEffect } from 'react';
import {
  categorizeError,
  getErrorDisplayInfo,
  ErrorInfo,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '../api/errorHandling';
import {
  AlertTriangle,
  RefreshCw,
  X,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';

interface ErrorState {
  error: ErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  showFallbacks: boolean;
}

interface ErrorPanelProps {
  error: any;
  onRetry: () => void;
  onSkip: () => void;
  onFallback?: (model: string) => void;
  retryConfig?: RetryConfig;
  fallbackModels?: string[];
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  error,
  onRetry,
  onSkip,
  onFallback,
  retryConfig = DEFAULT_RETRY_CONFIG,
  fallbackModels = [],
}) => {
  const [state, setState] = useState<ErrorState>({
    error: error ? categorizeError(error) : null,
    isRetrying: false,
    retryCount: 0,
    showFallbacks: false,
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (error) {
      setState(prev => ({
        ...prev,
        error: categorizeError(error),
      }));
    }
  }, [error]);

  // Auto-countdown for rate limits
  useEffect(() => {
    if (state.error?.retryAfter && !state.isRetrying) {
      setCountdown(state.error.retryAfter);
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c === null || c <= 1) {
            clearInterval(timer);
            return null;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state.error?.retryAfter, state.isRetrying]);

  const handleRetry = async () => {
    setState(prev => ({ ...prev, isRetrying: true, retryCount: prev.retryCount + 1 }));
    
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setState(prev => ({ ...prev, isRetrying: false }));
    onRetry();
  };

  const handleSkip = () => {
    setState(prev => ({ ...prev, error: null }));
    onSkip();
  };

  const handleFallback = (model: string) => {
    setState(prev => ({ ...prev, error: null, showFallbacks: false }));
    onFallback?.(model);
  };

  if (!state.error) return null;

  const displayInfo = getErrorDisplayInfo(state.error);
  const canRetry = state.error.recoverable && state.retryCount < retryConfig.maxRetries;
  const canFallback = fallbackModels.length > 0 && onFallback;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[480px] max-w-[90vw] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              displayInfo.color === 'red' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}>
              <span className="text-2xl">{displayInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {displayInfo.color === 'red' ? 'Error' : 'Issue Detected'}
              </h3>
              <p className="text-xs text-gray-400 capitalize">
                {state.error.category.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Message */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-300 font-mono">
            {state.error.message.slice(0, 200)}
            {state.error.message.length > 200 && '...'}
          </p>
        </div>

        {/* Countdown if rate limited */}
        {countdown !== null && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2">
            <Clock size={16} className="text-orange-400" />
            <p className="text-sm text-orange-400">
              Rate limited. Retrying in {countdown}s...
            </p>
          </div>
        )}

        {/* Circuit breaker warning */}
        {state.error.category === 'server' && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
            <Zap size={16} className="text-yellow-400 mt-0.5" />
            <p className="text-xs text-yellow-400">
              Server experiencing issues. Will use circuit breaker if failures continue.
            </p>
          </div>
        )}

        {/* Retry status */}
        {state.retryCount > 0 && (
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw size={12} className="animate-spin" />
            Retry attempt {state.retryCount} of {retryConfig.maxRetries}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Retry Button */}
          {canRetry && !countdown && (
            <button
              onClick={handleRetry}
              disabled={state.isRetrying}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {state.isRetrying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Retry {displayInfo.action}
                </>
              )}
            </button>
          )}

          {/* Auto-retry countdown */}
          {countdown !== null && state.isRetrying && (
            <div className="w-full py-3 bg-yellow-500/50 text-black font-medium rounded-lg flex items-center justify-center gap-2">
              <Clock size={16} />
              Retrying in {countdown}s...
            </div>
          )}

          {/* Fallback models */}
          {canFallback && (
            <>
              <button
                onClick={() => setState(prev => ({ ...prev, showFallbacks: !prev.showFallbacks }))}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                Try Fallback Model ({fallbackModels.length})
              </button>

              {state.showFallbacks && (
                <div className="bg-gray-800/50 rounded-lg p-2 space-y-1">
                  {fallbackModels.map((model, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFallback(model)}
                      className="w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm text-left flex items-center justify-between"
                    >
                      <span>{model}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Skip / Continue */}
          <button
            onClick={handleSkip}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg"
          >
            Skip / Continue
          </button>
        </div>

        {/* Retry info */}
        {state.error.recoverable && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Shield size={10} />
              Auto-retry enabled
            </span>
            <span>
              {retryConfig.maxRetries - state.retryCount} attempts left
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorPanel;