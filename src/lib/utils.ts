import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function getConfidenceColor(score: number): string {
  if (score >= 80) return 'bg-status-success';
  if (score >= 60) return 'bg-accent';
  if (score >= 40) return 'bg-status-warning';
  return 'bg-status-error';
}

export function getConfidenceLabel(score: number): string {
  if (score >= 80) return 'High Confidence';
  if (score >= 60) return 'Moderate Confidence';
  if (score >= 40) return 'Low Confidence';
  return 'Very Low Confidence';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    analyzing: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-green-100 text-green-700',
    under_loi: 'bg-purple-100 text-purple-700',
    due_diligence: 'bg-orange-100 text-orange-700',
    closed: 'bg-emerald-100 text-emerald-700',
    passed: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SNF: 'Skilled Nursing',
    ALF: 'Assisted Living',
    ILF: 'Independent Living',
  };
  return labels[type] || type;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateConfidenceDecay(assumptions: { category: string }[]): number {
  let decay = 0;
  const decayRates: Record<string, number> = {
    minor: 3,
    census: 5,
    labor: 5,
    regulatory: 7,
  };

  for (const assumption of assumptions) {
    decay += decayRates[assumption.category] || 3;
  }

  return Math.min(decay, 50); // Cap at 50% decay
}

export function calculateFinalConfidence(
  baseConfidence: number,
  assumptions: { category: string }[]
): number {
  const decay = calculateConfidenceDecay(assumptions);
  return Math.max(baseConfidence - decay, 10); // Minimum 10%
}
