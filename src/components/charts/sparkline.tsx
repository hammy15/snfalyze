'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDot?: boolean;
  showArea?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#14B8A6',
  fillOpacity = 0.2,
  showDot = true,
  showArea = true,
  className,
}: SparklineProps) {
  const { path, areaPath, lastPoint } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', lastPoint: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`
      : '';

    return {
      path: pathD,
      areaPath: areaD,
      lastPoint: points[points.length - 1],
    };
  }, [data, width, height]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    return data[data.length - 1] >= data[0] ? 'up' : 'down';
  }, [data]);

  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : color;

  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-surface-400 text-xs', className)}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={trendColor}
          fillOpacity={fillOpacity}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill={trendColor}
        />
      )}
    </svg>
  );
}

interface SparklineWithValueProps extends SparklineProps {
  value: string | number;
  label: string;
  change?: number;
  changeLabel?: string;
}

export function SparklineCard({
  data,
  value,
  label,
  change,
  changeLabel,
  ...sparklineProps
}: SparklineWithValueProps) {
  const isPositive = change !== undefined ? change >= 0 : true;

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold text-surface-900 dark:text-white">
          {value}
        </div>
        <div className="text-xs text-surface-500 truncate">{label}</div>
        {change !== undefined && (
          <div className={cn(
            'text-xs font-medium',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {isPositive ? '+' : ''}{change}%
            {changeLabel && <span className="text-surface-400 ml-1">{changeLabel}</span>}
          </div>
        )}
      </div>
      <Sparkline data={data} {...sparklineProps} />
    </div>
  );
}
