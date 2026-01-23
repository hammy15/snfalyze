'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'critical' | 'unknown';

export interface ConfidenceBadgeProps {
  confidence: number | null | undefined;
  showValue?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getConfidenceLevel(confidence: number | null | undefined): ConfidenceLevel {
  if (confidence === null || confidence === undefined) return 'unknown';
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  if (confidence >= 50) return 'low';
  return 'critical';
}

function getConfidenceConfig(level: ConfidenceLevel) {
  switch (level) {
    case 'high':
      return {
        bgClass: 'bg-emerald-500/20',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-500/30',
        Icon: CheckCircle,
        label: 'High Confidence',
      };
    case 'medium':
      return {
        bgClass: 'bg-amber-500/20',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-500/30',
        Icon: AlertTriangle,
        label: 'Medium Confidence',
      };
    case 'low':
      return {
        bgClass: 'bg-orange-500/20',
        textClass: 'text-orange-700 dark:text-orange-300',
        borderClass: 'border-orange-500/30',
        Icon: AlertCircle,
        label: 'Low Confidence',
      };
    case 'critical':
      return {
        bgClass: 'bg-rose-500/20',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-500/30',
        Icon: AlertCircle,
        label: 'Review Required',
      };
    case 'unknown':
    default:
      return {
        bgClass: 'bg-slate-500/20',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-500/30',
        Icon: HelpCircle,
        label: 'Unknown',
      };
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfidenceBadge({
  confidence,
  showValue = true,
  showIcon = true,
  size = 'md',
  className,
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence);
  const config = getConfidenceConfig(level);

  const sizes = {
    sm: {
      padding: 'px-2 py-0.5',
      text: 'text-xs',
      icon: 'h-3 w-3',
      gap: 'gap-1',
    },
    md: {
      padding: 'px-2.5 py-1',
      text: 'text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-1.5',
    },
    lg: {
      padding: 'px-3 py-1.5',
      text: 'text-base',
      icon: 'h-5 w-5',
      gap: 'gap-2',
    },
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizes[size].padding,
        sizes[size].text,
        sizes[size].gap,
        className
      )}
    >
      {showIcon && <config.Icon className={sizes[size].icon} />}
      {showValue && confidence !== null && confidence !== undefined ? (
        <span className="tabular-nums">{confidence}%</span>
      ) : (
        <span>{config.label}</span>
      )}
    </span>
  );
}

// ============================================================================
// Clarification Type Badge
// ============================================================================

export type ClarificationType =
  | 'low_confidence'
  | 'out_of_range'
  | 'conflict'
  | 'missing'
  | 'validation_error';

export interface ClarificationTypeBadgeProps {
  type: ClarificationType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getClarificationTypeConfig(type: ClarificationType) {
  switch (type) {
    case 'low_confidence':
      return {
        bgClass: 'bg-amber-500/20',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-500/30',
        label: 'Low Confidence',
      };
    case 'out_of_range':
      return {
        bgClass: 'bg-purple-500/20',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-500/30',
        label: 'Out of Range',
      };
    case 'conflict':
      return {
        bgClass: 'bg-rose-500/20',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-500/30',
        label: 'Conflict',
      };
    case 'missing':
      return {
        bgClass: 'bg-slate-500/20',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-500/30',
        label: 'Missing',
      };
    case 'validation_error':
      return {
        bgClass: 'bg-red-500/20',
        textClass: 'text-red-700 dark:text-red-300',
        borderClass: 'border-red-500/30',
        label: 'Validation Error',
      };
    default:
      return {
        bgClass: 'bg-slate-500/20',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-500/30',
        label: 'Unknown',
      };
  }
}

export function ClarificationTypeBadge({
  type,
  size = 'sm',
  className,
}: ClarificationTypeBadgeProps) {
  const config = getClarificationTypeConfig(type);

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizes[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// Priority Badge
// ============================================================================

export interface PriorityBadgeProps {
  priority: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriorityBadge({ priority, size = 'sm', className }: PriorityBadgeProps) {
  const config =
    priority >= 8
      ? {
          bgClass: 'bg-rose-500/20',
          textClass: 'text-rose-700 dark:text-rose-300',
          borderClass: 'border-rose-500/30',
          label: 'Critical',
        }
      : priority >= 5
        ? {
            bgClass: 'bg-amber-500/20',
            textClass: 'text-amber-700 dark:text-amber-300',
            borderClass: 'border-amber-500/30',
            label: 'Important',
          }
        : {
            bgClass: 'bg-sky-500/20',
            textClass: 'text-sky-700 dark:text-sky-300',
            borderClass: 'border-sky-500/30',
            label: 'Low',
          };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizes[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

export default ConfidenceBadge;
