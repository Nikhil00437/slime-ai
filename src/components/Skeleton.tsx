import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'button';
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = 'text',
  className = ''
}: SkeletonProps) {
  const baseClasses = 'skeleton';
  const variantClasses: Record<string, string> = {
    text: 'skeleton-text',
    circular: 'skeleton-circle',
    rectangular: '',
    button: 'skeleton-button',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'circular' ? 40 : '100%'),
    height: height ?? (variant === 'text' ? '1em' : (variant === 'circular' ? 40 : 20)),
  };

  if (variant === 'button') {
    delete style.height;
    style.width = width ?? 100;
    style.height = height ?? 36;
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={style} />
  );
}

// Preset skeleton components for common use cases
export function MessageSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-4">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1">
        <Skeleton width="30%" height="1em" className="mb-2" />
        <Skeleton width="100%" height="1em" className="mb-1" />
        <Skeleton width="80%" height="1em" className="mb-1" />
        <Skeleton width="60%" height="1em" />
      </div>
    </div>
  );
}

export function ModelItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Skeleton variant="circular" width={24} height={24} />
      <div className="flex-1">
        <Skeleton width="70%" height="0.875em" />
      </div>
    </div>
  );
}

export function SkillCardSkeleton() {
  return (
    <div
      style={{
        background: 'rgba(55, 65, 81, 0.3)',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="rectangular" width={38} height={38} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton width="40%" height="1em" />
            <Skeleton width={60} height={20} />
          </div>
          <Skeleton width="90%" height="0.75em" className="mb-1" />
          <Skeleton width="70%" height="0.75em" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton width={60} height={22} />
        <Skeleton width={80} height={22} />
        <Skeleton width={50} height={22} />
      </div>
      <div className="mt-3">
        <Skeleton width="100%" height={4} />
      </div>
    </div>
  );
}

export function ConversationItemSkeleton() {
  return (
    <div className="flex items-start gap-2 mx-2 px-3 py-3">
      <Skeleton variant="circular" width={24} height={24} />
      <div className="flex-1">
        <Skeleton width="60%" height="0.875em" className="mb-2" />
        <Skeleton width="80%" height="0.75em" className="mb-1" />
        <Skeleton width="40%" height="0.625em" />
      </div>
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
      <Skeleton variant="circular" width={36} height={36} />
      <div className="flex-1">
        <Skeleton width="50%" height="1em" className="mb-1" />
        <Skeleton width="30%" height="0.75em" />
      </div>
      <Skeleton width={100} height={32} variant="button" />
    </div>
  );
}

// Full-page loading state
export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Chat messages loading state with skeletons
export function ChatMessagesSkeleton() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton />
    </div>
  );
}