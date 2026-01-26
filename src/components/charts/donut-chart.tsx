'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

export function DonutChart({
  data,
  size = 120,
  strokeWidth = 20,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return data.map((segment) => {
      const percentage = total > 0 ? segment.value / total : 0;
      const segmentLength = percentage * circumference;
      const offset = currentOffset;
      currentOffset += segmentLength;
      return {
        ...segment,
        percentage,
        length: segmentLength,
        offset,
      };
    });
  }, [data, total, circumference]);

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-100 dark:text-surface-800"
        />
        {/* Segments */}
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.length} ${circumference}`}
            strokeDashoffset={-segment.offset}
            className="transition-all duration-500"
          />
        ))}
      </svg>

      {/* Center content */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-lg font-bold text-surface-900 dark:text-white">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">
              {centerLabel}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-[10px] text-surface-600 dark:text-surface-400">
              {segment.label} ({Math.round(segment.percentage * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
