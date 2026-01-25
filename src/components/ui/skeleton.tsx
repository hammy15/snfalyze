"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular" | "rounded"
  width?: string | number
  height?: string | number
  animation?: "pulse" | "wave" | "none"
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "wave"
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-xl"
  }

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "skeleton-wave",
    none: ""
  }

  return (
    <div
      className={cn(
        "bg-surface-200 dark:bg-surface-700",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height
      }}
    />
  )
}

// Pre-built skeleton patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("neu-card space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height={12} />
        <Skeleton height={12} />
        <Skeleton width="80%" height={12} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-surface-200 dark:border-surface-700">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={`${100 / columns}%`}
              height={14}
              className={colIndex === 0 ? "w-3/4" : ""}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={12} />
          </div>
          <Skeleton variant="rounded" width={60} height={28} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="neu-card">
          <Skeleton width={80} height={12} className="mb-2" />
          <Skeleton width={100} height={28} className="mb-3" />
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton width={60} height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={120} height={20} />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={60} height={28} />
          <Skeleton variant="rounded" width={60} height={28} />
        </div>
      </div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end gap-2 pb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-surface-200 dark:bg-surface-700 rounded-t skeleton-wave"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width={30} height={12} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="neu-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton width={100} height={14} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton width={80} height={32} className="mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton width={40} height={16} />
        <Skeleton width={60} height={12} />
      </div>
    </div>
  )
}
