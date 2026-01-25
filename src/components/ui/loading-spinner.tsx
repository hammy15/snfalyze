'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const variantClasses = {
  default: 'text-surface-500 dark:text-surface-400',
  primary: 'text-primary-500',
  white: 'text-white',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {text && (
        <p
          className={cn(
            'text-sm font-medium',
            variant === 'white' ? 'text-white' : 'text-surface-600 dark:text-surface-400'
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-100/80 dark:bg-surface-900/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline loading state for buttons
export function ButtonSpinner({
  size = 'sm',
  variant = 'white',
  className,
}: Pick<LoadingSpinnerProps, 'size' | 'variant' | 'className'>) {
  return (
    <Loader2
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}

// Overlay loading state
export function LoadingOverlay({
  text = 'Loading...',
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center',
        'bg-surface-100/90 dark:bg-surface-900/90 backdrop-blur-sm',
        'rounded-inherit',
        className
      )}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Page loading state
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} variant="primary" />
    </div>
  );
}

// Circular progress indicator
interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 4,
  className,
  showText = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        className="absolute transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-200 dark:text-surface-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary-500 transition-all duration-300 ease-out"
        />
      </svg>
      {showText && (
        <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

// Pulsing dot indicator
export function PulsingDot({
  size = 'md',
  variant = 'primary',
  className,
}: Pick<LoadingSpinnerProps, 'size' | 'variant' | 'className'>) {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6',
  };

  const dotVariants = {
    default: 'bg-surface-400',
    primary: 'bg-primary-500',
    white: 'bg-white',
  };

  return (
    <span className={cn('relative flex', className)}>
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          dotVariants[variant]
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full',
          dotSizes[size],
          dotVariants[variant]
        )}
      />
    </span>
  );
}

// Three dot loading animation
export function ThreeDots({
  size = 'md',
  variant = 'default',
  className,
}: Pick<LoadingSpinnerProps, 'size' | 'variant' | 'className'>) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const dotVariants = {
    default: 'bg-surface-400 dark:bg-surface-500',
    primary: 'bg-primary-500',
    white: 'bg-white',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'rounded-full animate-bounce',
            dotSizes[size],
            dotVariants[variant]
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}
