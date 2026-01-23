'use client';

import { cn } from '@/lib/utils';
import type { FacilityData } from './facility-list';

interface FacilityTypeBreakdownProps {
  facilities: FacilityData[];
  metric?: 'count' | 'beds';
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TYPE_CONFIG = {
  SNF: {
    label: 'Skilled Nursing',
    shortLabel: 'SNF',
    color: '#3B82F6', // blue-500
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
  },
  ALF: {
    label: 'Assisted Living',
    shortLabel: 'ALF',
    color: '#8B5CF6', // purple-500
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500',
  },
  ILF: {
    label: 'Independent Living',
    shortLabel: 'ILF',
    color: '#22C55E', // green-500
    bgClass: 'bg-green-500',
    textClass: 'text-green-500',
  },
};

function calculateBreakdown(facilities: FacilityData[], metric: 'count' | 'beds') {
  const breakdown = {
    SNF: 0,
    ALF: 0,
    ILF: 0,
  };

  for (const facility of facilities) {
    if (metric === 'count') {
      breakdown[facility.assetType] += 1;
    } else {
      breakdown[facility.assetType] += facility.licensedBeds || 0;
    }
  }

  const total = breakdown.SNF + breakdown.ALF + breakdown.ILF;

  return {
    breakdown,
    total,
    percentages: {
      SNF: total > 0 ? (breakdown.SNF / total) * 100 : 0,
      ALF: total > 0 ? (breakdown.ALF / total) * 100 : 0,
      ILF: total > 0 ? (breakdown.ILF / total) * 100 : 0,
    },
  };
}

// SVG Donut Chart
function DonutChart({
  percentages,
  size,
}: {
  percentages: { SNF: number; ALF: number; ILF: number };
  size: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const center = size / 2;

  // Calculate stroke-dasharray for each segment
  const segments: { type: 'SNF' | 'ALF' | 'ILF'; value: number; offset: number }[] = [];
  let currentOffset = 0;

  for (const type of ['SNF', 'ALF', 'ILF'] as const) {
    if (percentages[type] > 0) {
      segments.push({
        type,
        value: percentages[type],
        offset: currentOffset,
      });
      currentOffset += percentages[type];
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--gray-100)"
        strokeWidth={strokeWidth}
      />

      {/* Segments */}
      {segments.map((segment) => {
        const dashLength = (segment.value / 100) * circumference;
        const dashOffset = ((100 - segment.offset) / 100) * circumference;

        return (
          <circle
            key={segment.type}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={TYPE_CONFIG[segment.type].color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

export function FacilityTypeBreakdown({
  facilities,
  metric = 'beds',
  showLegend = true,
  size = 'md',
  className,
}: FacilityTypeBreakdownProps) {
  const { breakdown, total, percentages } = calculateBreakdown(facilities, metric);

  const chartSize = size === 'sm' ? 80 : size === 'md' ? 120 : 160;

  if (facilities.length === 0) {
    return null;
  }

  const activeTypes = (['SNF', 'ALF', 'ILF'] as const).filter(
    (type) => breakdown[type] > 0
  );

  return (
    <div className={cn('flex items-center gap-6', className)}>
      {/* Chart */}
      <div className="relative">
        <DonutChart percentages={percentages} size={chartSize} />
        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ top: 0, left: 0 }}
        >
          <span
            className={cn(
              'font-bold text-[var(--color-text-primary)]',
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
            )}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {metric === 'beds' ? 'beds' : 'facilities'}
          </span>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="space-y-2">
          {activeTypes.map((type) => (
            <div key={type} className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', TYPE_CONFIG[type].bgClass)} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {TYPE_CONFIG[type].shortLabel}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {percentages[type].toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  {breakdown[type].toLocaleString()} {metric === 'beds' ? 'beds' : 'facilities'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Horizontal bar version
export function FacilityTypeBar({
  facilities,
  metric = 'beds',
  className,
}: {
  facilities: FacilityData[];
  metric?: 'count' | 'beds';
  className?: string;
}) {
  const { breakdown, total, percentages } = calculateBreakdown(facilities, metric);

  if (facilities.length === 0 || total === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Bar */}
      <div className="h-3 bg-[var(--gray-100)] rounded-full overflow-hidden flex">
        {percentages.SNF > 0 && (
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${percentages.SNF}%` }}
          />
        )}
        {percentages.ALF > 0 && (
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${percentages.ALF}%` }}
          />
        )}
        {percentages.ILF > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${percentages.ILF}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-4 text-xs">
        {breakdown.SNF > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[var(--color-text-secondary)]">
              SNF {breakdown.SNF.toLocaleString()}
            </span>
          </div>
        )}
        {breakdown.ALF > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[var(--color-text-secondary)]">
              ALF {breakdown.ALF.toLocaleString()}
            </span>
          </div>
        )}
        {breakdown.ILF > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[var(--color-text-secondary)]">
              ILF {breakdown.ILF.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
