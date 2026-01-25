'use client';

import { Skeleton, SkeletonCard, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton';

export function FacilityPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] dark:bg-surface-900">
      {/* Header */}
      <div className="bg-white dark:bg-surface-800 border-b border-[var(--color-border-default)] dark:border-surface-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Skeleton width={40} height={14} />
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Skeleton width={80} height={14} />
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Skeleton width={60} height={14} />
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Skeleton width={120} height={14} />
          </div>

          {/* Page header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Skeleton variant="rounded" width={40} height={40} />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton width={200} height={24} />
                  <Skeleton variant="rounded" width={48} height={22} />
                  <Skeleton width={40} height={16} />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton width={100} height={14} />
                  <Skeleton width={80} height={14} />
                  <Skeleton width={120} height={14} />
                </div>
              </div>
            </div>
            <Skeleton variant="rounded" width={160} height={36} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex gap-2">
            <Skeleton variant="rounded" width={80} height={36} />
            <Skeleton variant="rounded" width={80} height={36} />
            <Skeleton variant="rounded" width={80} height={36} />
            <Skeleton variant="rounded" width={80} height={36} />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Key Metrics */}
          <SkeletonStats />

          {/* Main Card */}
          <SkeletonCard className="p-6" />

          {/* Table */}
          <div className="neu-card p-6">
            <Skeleton width={150} height={20} className="mb-4" />
            <SkeletonTable rows={5} columns={5} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="neu-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton width={80} height={12} />
      </div>
      <Skeleton width={100} height={28} className="mt-2" />
    </div>
  );
}

export function ProformaSkeleton() {
  return (
    <div className="space-y-6">
      {/* Scenario Tabs */}
      <div className="flex gap-2 mb-4">
        <Skeleton variant="rounded" width={120} height={36} />
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={32} height={36} />
      </div>

      {/* Assumptions Drawer */}
      <div className="neu-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton width={120} height={18} />
          <Skeleton variant="rounded" width={80} height={28} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton width={100} height={12} className="mb-2" />
              <Skeleton width={80} height={32} />
            </div>
          ))}
        </div>
      </div>

      {/* Proforma Table */}
      <div className="neu-card p-4">
        <SkeletonTable rows={10} columns={7} />
      </div>
    </div>
  );
}

export function ValuationSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="neu-card p-4">
            <Skeleton width={100} height={12} className="mb-2" />
            <Skeleton width={120} height={28} />
          </div>
        ))}
      </div>

      {/* Valuation Methods */}
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonCard className="p-6" />
        <SkeletonCard className="p-6" />
      </div>

      {/* Comparables Table */}
      <div className="neu-card p-6">
        <Skeleton width={180} height={20} className="mb-4" />
        <SkeletonTable rows={4} columns={6} />
      </div>
    </div>
  );
}

export function CMSDataSkeleton() {
  return (
    <div className="space-y-6">
      {/* Provider Header */}
      <div className="neu-card p-6">
        <div className="flex items-start gap-4">
          <Skeleton variant="circular" width={64} height={64} />
          <div className="flex-1">
            <Skeleton width={200} height={24} className="mb-2" />
            <Skeleton width={150} height={14} className="mb-4" />
            <div className="flex gap-2">
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="rounded" width={80} height={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Ratings */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="neu-card p-6">
          <Skeleton width={100} height={18} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton width={120} height={14} />
                <Skeleton width={80} height={20} />
              </div>
            ))}
          </div>
        </div>
        <div className="neu-card p-6">
          <Skeleton width={100} height={18} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton width={120} height={14} />
                <Skeleton width={80} height={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
