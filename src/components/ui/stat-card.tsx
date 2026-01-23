"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./card"

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  label?: string // alias for title
  value: string | number
  change?: {
    value: number
    label?: string
  }
  delta?: {
    value: number
    direction?: "up" | "down" | "neutral"
    label?: string
  }
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  size?: "sm" | "md" | "lg"
  format?: "number" | "currency" | "percent" | "text"
}

function formatValue(value: string | number, format?: "number" | "currency" | "percent" | "text"): string {
  if (typeof value === "string") return value

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: value >= 1000000 ? "compact" : "standard",
        maximumFractionDigits: 0,
      }).format(value)
    case "percent":
      return `${value.toFixed(1)}%`
    case "number":
      return new Intl.NumberFormat("en-US").format(value)
    default:
      return String(value)
  }
}

export function StatCard({
  title,
  label,
  value,
  change,
  delta,
  icon,
  trend,
  size = "md",
  format,
  className,
  ...props
}: StatCardProps) {
  const displayTitle = title || label || ""
  const displayValue = formatValue(value, format)

  // Merge change and delta (delta takes precedence if both provided)
  const displayChange = delta ? {
    value: delta.value,
    label: delta.label,
  } : change

  const displayTrend = trend || delta?.direction

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  }

  const valueSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  }
  const trendColors = {
    up: "text-emerald-500",
    down: "text-rose-500",
    neutral: "text-surface-400",
  }

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  }

  return (
    <Card className={cn("relative overflow-hidden", sizeClasses[size], className)} {...props}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
            {displayTitle}
          </p>
          <p className={cn("font-bold text-surface-900 dark:text-surface-50", valueSizes[size])}>
            {displayValue}
          </p>
          {displayChange && (
            <div className={cn("flex items-center gap-1 text-sm", displayTrend && trendColors[displayTrend])}>
              {displayTrend && trendIcons[displayTrend]}
              <span>{displayChange.value > 0 ? "+" : ""}{displayChange.value}%</span>
              {displayChange.label && (
                <span className="text-surface-400 dark:text-surface-500">
                  {displayChange.label}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-primary-500/10 text-primary-500">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
