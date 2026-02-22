'use client';

import { cn } from '@/lib/utils';
import {
  ClipboardList,
  BarChart3,
  Calculator,
  ShieldAlert,
  FileText,
  Check,
  CircleDot,
  Lock,
} from 'lucide-react';
import type { WorkspaceStageType, WorkspaceStageRecord } from '@/types/workspace';
import { WORKSPACE_STAGES } from '@/types/workspace';

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList,
  BarChart3,
  Calculator,
  ShieldAlert,
  FileText,
};

interface WorkspaceStageRailProps {
  currentStage: WorkspaceStageType;
  stages: WorkspaceStageRecord[];
  onStageClick: (stage: WorkspaceStageType) => void;
  isStageAccessible: (stage: WorkspaceStageType) => boolean;
}

export function WorkspaceStageRail({
  currentStage,
  stages,
  onStageClick,
  isStageAccessible,
}: WorkspaceStageRailProps) {
  return (
    <nav className="flex flex-col gap-1 py-4">
      <div className="px-4 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Workspace
        </h3>
      </div>

      {WORKSPACE_STAGES.map((config, index) => {
        const record = stages.find(s => s.stage === config.id);
        const isCurrent = currentStage === config.id;
        const isCompleted = record?.status === 'completed';
        const isAccessible = isStageAccessible(config.id);
        const isInProgress = record?.status === 'in_progress';
        const completionScore = record?.completionScore || 0;
        const IconComponent = ICON_MAP[config.icon] || FileText;

        return (
          <div key={config.id}>
            <button
              onClick={() => isAccessible && onStageClick(config.id)}
              disabled={!isAccessible}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 rounded-lg mx-2',
                isCurrent
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                  : isAccessible
                  ? 'hover:bg-surface-100 dark:hover:bg-surface-800'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Stage indicator */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all',
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-primary-500 text-white'
                    : isInProgress
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-400 text-primary-600'
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : !isAccessible ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <IconComponent className="w-4 h-4" />
                )}
              </div>

              {/* Stage text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-sm font-medium truncate',
                      isCurrent
                        ? 'text-primary-700 dark:text-primary-300'
                        : isCompleted
                        ? 'text-surface-800 dark:text-surface-200'
                        : 'text-surface-600 dark:text-surface-400'
                    )}
                  >
                    {config.label}
                  </span>
                  {isCompleted && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 ml-1">
                      Done
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-surface-500 dark:text-surface-400 truncate block">
                  {config.description}
                </span>

                {/* Completion bar (only for current or in-progress) */}
                {(isCurrent || isInProgress) && completionScore > 0 && (
                  <div className="mt-1.5 w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1">
                    <div
                      className="bg-primary-500 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(completionScore, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </button>

            {/* Connector line */}
            {index < WORKSPACE_STAGES.length - 1 && (
              <div className="flex justify-start pl-[2.1rem] py-0.5">
                <div
                  className={cn(
                    'w-0.5 h-3',
                    isCompleted
                      ? 'bg-emerald-300 dark:bg-emerald-700'
                      : 'bg-surface-200 dark:bg-surface-700'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
