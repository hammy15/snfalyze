'use client';

import { cn } from '@/lib/utils';
import {
  FileText,
  Cpu,
  HelpCircle,
  Building2,
  Brain,
  Wrench,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import type { PipelinePhase } from '@/lib/pipeline/types';

const PHASE_CONFIG: Array<{
  key: PipelinePhase;
  label: string;
  icon: typeof FileText;
}> = [
  { key: 'ingest', label: 'Ingest', icon: FileText },
  { key: 'extract', label: 'Extract', icon: Cpu },
  { key: 'clarify', label: 'Clarify', icon: HelpCircle },
  { key: 'assemble', label: 'Assemble', icon: Building2 },
  { key: 'analyze', label: 'Analyze', icon: Brain },
  { key: 'tools', label: 'Tools', icon: Wrench },
  { key: 'synthesize', label: 'Synthesize', icon: Sparkles },
];

interface PipelineTimelineProps {
  currentPhase: PipelinePhase;
  completedPhases: Set<PipelinePhase>;
  phaseProgress: number;
  isPaused: boolean;
}

export function PipelineTimeline({
  currentPhase,
  completedPhases,
  phaseProgress,
  isPaused,
}: PipelineTimelineProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      {PHASE_CONFIG.map((phase, index) => {
        const isCompleted = completedPhases.has(phase.key);
        const isCurrent = currentPhase === phase.key;
        const isPending = !isCompleted && !isCurrent;
        const Icon = phase.icon;

        return (
          <div key={phase.key} className="flex items-center">
            {/* Phase dot */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500',
                  isCompleted && 'bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40',
                  isCurrent && !isPaused && 'bg-primary-100 border border-primary-300 shadow-md shadow-primary-200/50 animate-pulse-soft dark:bg-primary-500/20 dark:border-primary-500/40 dark:shadow-glow-primary',
                  isCurrent && isPaused && 'bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40',
                  isPending && 'bg-surface-100 border border-surface-200 dark:bg-surface-800/50 dark:border-surface-700/30'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent && !isPaused ? (
                  <Loader2 className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400 animate-spin" />
                ) : (
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5',
                      isCurrent && isPaused ? 'text-amber-600 dark:text-amber-400' : isPending ? 'text-surface-400 dark:text-surface-600' : 'text-primary-600 dark:text-primary-400'
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium tracking-wide',
                  isCompleted && 'text-emerald-600 dark:text-emerald-400',
                  isCurrent && 'text-primary-600 dark:text-primary-300',
                  isPending && 'text-surface-400 dark:text-surface-600'
                )}
              >
                {phase.label}
              </span>
              {isCurrent && !isPaused && phaseProgress > 0 && (
                <div className="w-10 h-0.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Connector line */}
            {index < PHASE_CONFIG.length - 1 && (
              <div
                className={cn(
                  'w-8 h-px mx-1 transition-colors duration-500',
                  isCompleted ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-surface-200 dark:bg-surface-700/50'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
