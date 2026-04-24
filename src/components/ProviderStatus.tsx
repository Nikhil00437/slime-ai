import React from 'react';

interface ProviderStatusProps {
  name: string;
  status: 'connected' | 'disconnected' | 'checking' | 'error';
  latency?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProviderStatusIndicator({
  name,
  status,
  latency,
  showLabel = false,
  size = 'md',
}: ProviderStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const statusColors = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    checking: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500 animate-pulse',
  };

  const statusLabels = {
    connected: 'Online',
    disconnected: 'Offline',
    checking: 'Checking...',
    error: 'Error',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full ${statusColors[status]}`} />
        {status === 'connected' && latency && (
          <div
            className="absolute inset-0 rounded-full bg-green-500 opacity-50 animate-ping"
            style={{ animationDuration: `${Math.min(latency / 10, 2)}s` }}
          />
        )}
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs text-gray-300">{name}</span>
          <span className="text-[10px] text-gray-500">
            {statusLabels[status]}
            {status === 'connected' && latency && ` • ${latency}ms`}
          </span>
        </div>
      )}
    </div>
  );
}

interface ProviderStatusBadgeProps {
  provider: {
    name: string;
    status: 'connected' | 'disconnected' | 'checking' | 'error';
    latency?: number;
  };
}

export function ProviderStatusBadge({ provider }: ProviderStatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
      <ProviderStatusIndicator
        name={provider.name}
        status={provider.status}
        latency={provider.latency}
        showLabel
      />
      {provider.status === 'connected' && provider.latency && (
        <span className="text-xs text-green-400 font-mono">
          {provider.latency}ms
        </span>
      )}
    </div>
  );
}