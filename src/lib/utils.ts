import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Format currency
export function formatCurrency(
  num: number,
  compactOrCurrency: boolean | string = 'USD'
): string {
  const currency = typeof compactOrCurrency === 'string' ? compactOrCurrency : 'USD'
  const useCompact = typeof compactOrCurrency === 'boolean' ? compactOrCurrency : num >= 1000000

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: useCompact ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: useCompact ? 1 : 0,
  }).format(num)
}

// Format percentage
export function formatPercent(num: number, decimals = 1): string {
  return `${num.toFixed(decimals)}%`
}

// Format date
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(d)
}

// Truncate text
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Sleep/delay
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate random ID
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

// Get confidence color based on score
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-emerald-600 dark:text-emerald-400'
  if (confidence >= 0.7) return 'text-sky-600 dark:text-sky-400'
  if (confidence >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// Get confidence label based on score
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'High'
  if (confidence >= 0.7) return 'Medium'
  if (confidence >= 0.5) return 'Low'
  return 'Very Low'
}

// Get asset type label
export function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    snf: 'Skilled Nursing',
    alf: 'Assisted Living',
    ilf: 'Independent Living',
    ccrc: 'CCRC',
    memory_care: 'Memory Care',
    mixed: 'Mixed Use',
  }
  return labels[type?.toLowerCase()] || type || 'Unknown'
}

// Get deal status label
export function getDealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    analyzing: 'Analyzing',
    reviewed: 'Reviewed',
    under_loi: 'Under LOI',
    due_diligence: 'Due Diligence',
    closed: 'Closed',
    passed: 'Passed',
  }
  return labels[status?.toLowerCase()] || status || 'Unknown'
}

// Calculate confidence decay based on age of data
export function calculateConfidenceDecay(
  baseConfidence: number,
  dataDate: Date | string,
  halfLifeDays = 90
): number {
  const now = new Date()
  const date = typeof dataDate === 'string' ? new Date(dataDate) : dataDate
  const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

  // Exponential decay formula
  const decay = Math.pow(0.5, ageInDays / halfLifeDays)
  return Math.max(0.1, baseConfidence * decay) // Never go below 10%
}
