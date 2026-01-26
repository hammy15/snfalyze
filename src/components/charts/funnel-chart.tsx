'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface FunnelStage {
  label: string;
  value: number;
  secondaryValue?: number | string;
  color: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  height?: number;
  showPercentage?: boolean;
  showConversion?: boolean;
  className?: string;
  onStageClick?: (stage: string) => void;
}

export function FunnelChart({
  data,
  height = 240,
  showPercentage = true,
  showConversion = true,
  className,
  onStageClick,
}: FunnelChartProps) {
  const { stages, maxValue } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const stagesWithCalc = data.map((stage, i) => {
      const percentage = (stage.value / max) * 100;
      const prevValue = i > 0 ? data[i - 1].value : stage.value;
      const conversion = prevValue > 0 ? (stage.value / prevValue) * 100 : 100;
      return {
        ...stage,
        percentage,
        conversion,
      };
    });
    return { stages: stagesWithCalc, maxValue: max };
  }, [data]);

  const stageHeight = height / data.length;

  return (
    <div className={cn('relative', className)}>
      {/* Funnel visualization */}
      <div className="relative" style={{ height }}>
        {stages.map((stage, i) => {
          const widthPercent = Math.max(stage.percentage, 20);
          const leftMargin = (100 - widthPercent) / 2;

          return (
            <div
              key={stage.label}
              className="absolute w-full transition-all duration-300"
              style={{
                top: i * stageHeight,
                height: stageHeight,
              }}
            >
              {/* Funnel bar */}
              <div
                className={cn(
                  'absolute h-[calc(100%-4px)] rounded transition-all duration-300',
                  onStageClick && 'cursor-pointer hover:opacity-80'
                )}
                style={{
                  left: `${leftMargin}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: stage.color,
                }}
                onClick={() => onStageClick?.(stage.label)}
              >
                {/* Stage content */}
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-white text-sm font-medium truncate">
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">
                      {stage.value}
                    </span>
                    {stage.secondaryValue && (
                      <span className="text-white/70 text-xs">
                        {stage.secondaryValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversion arrow */}
              {showConversion && i > 0 && (
                <div
                  className="absolute -top-1 right-2 text-[10px] text-surface-500 bg-white dark:bg-surface-900 px-1 rounded"
                >
                  ↓ {Math.round(stage.conversion)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall conversion */}
      {showConversion && stages.length > 1 && (
        <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 flex items-center justify-center gap-4 text-xs">
          <div className="text-surface-500">
            Overall conversion:
          </div>
          <div className="font-bold text-primary-600">
            {stages[0].value > 0
              ? Math.round((stages[stages.length - 1].value / stages[0].value) * 100)
              : 0}%
          </div>
        </div>
      )}
    </div>
  );
}

interface HorizontalFunnelProps {
  data: FunnelStage[];
  className?: string;
  onStageClick?: (stage: string) => void;
}

export function HorizontalFunnel({
  data,
  className,
  onStageClick,
}: HorizontalFunnelProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((stage, i) => {
        const percentage = (stage.value / maxValue) * 100;
        const prevValue = i > 0 ? data[i - 1].value : stage.value;
        const conversion = prevValue > 0 ? (stage.value / prevValue) * 100 : 100;

        return (
          <div key={stage.label} className="group">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                  {stage.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-surface-900 dark:text-white">
                  {stage.value}
                </span>
                {i > 0 && (
                  <span className="text-surface-400">
                    ({Math.round(conversion)}%)
                  </span>
                )}
                {stage.secondaryValue && (
                  <span className="text-surface-500 w-16 text-right">
                    {stage.secondaryValue}
                  </span>
                )}
              </div>
            </div>
            <div
              className={cn(
                'h-5 bg-surface-100 dark:bg-surface-800 rounded overflow-hidden',
                onStageClick && 'cursor-pointer'
              )}
              onClick={() => onStageClick?.(stage.label)}
            >
              <div
                className="h-full transition-all duration-500 rounded flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(percentage, stage.value > 0 ? 8 : 0)}%`,
                  backgroundColor: stage.color,
                }}
              >
                {percentage > 15 && (
                  <span className="text-[10px] font-medium text-white">
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
