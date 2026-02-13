'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileSearch,
  Calculator,
  Activity,
  AlertTriangle,
  DollarSign,
  Scale,
  Sparkles,
  CheckCircle,
  Clock,
  Lock,
  ChevronRight,
  Loader2,
  Zap,
  Play,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type AnalysisStage =
  | 'document_understanding'
  | 'financial_reconstruction'
  | 'operating_reality'
  | 'risk_constraints'
  | 'valuation'
  | 'synthesis';

type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

interface StageInfo {
  id: AnalysisStage;
  label: string;
  description: string;
  icon: typeof FileSearch;
  aiCapability: string;
  aiAction: string;
}

interface AnalysisProgressCardProps {
  currentStage: AnalysisStage;
  stageProgress: Array<{
    stage: AnalysisStage;
    status: StageStatus;
    started_at?: Date;
    completed_at?: Date;
    blockers?: string[];
  }>;
  onStageStart: (stage: AnalysisStage) => void;
  onStageClick: (stage: AnalysisStage) => void;
  onAIAnalyze?: (stage: AnalysisStage) => void;
  documentCount: number;
  hasFinancials: boolean;
}

// =============================================================================
// STAGE DEFINITIONS
// =============================================================================

const STAGES: StageInfo[] = [
  {
    id: 'document_understanding',
    label: 'Document Understanding',
    description: 'Review materials & identify gaps',
    icon: FileSearch,
    aiCapability: 'AI can classify, extract, and summarize your documents',
    aiAction: 'Auto-Analyze Docs',
  },
  {
    id: 'financial_reconstruction',
    label: 'Financial Reconstruction',
    description: 'Normalize T12 & spot distortions',
    icon: Calculator,
    aiCapability: 'AI can build normalized financials from uploaded P&Ls',
    aiAction: 'Build T12',
  },
  {
    id: 'operating_reality',
    label: 'Operating Reality',
    description: 'Assess performance trajectory',
    icon: Activity,
    aiCapability: 'AI can assess occupancy trends, staffing, and payer mix',
    aiAction: 'Assess Operations',
  },
  {
    id: 'risk_constraints',
    label: 'Risk & Constraints',
    description: 'Identify deal-breakers & key risks',
    icon: AlertTriangle,
    aiCapability: 'AI can identify risks from docs, CMS data, and market conditions',
    aiAction: 'Identify Risks',
  },
  {
    id: 'valuation',
    label: 'Valuation',
    description: 'Determine pricing & structure',
    icon: DollarSign,
    aiCapability: 'AI can run 6 valuation methods with risk-adjusted ranges',
    aiAction: 'Run Valuation',
  },
  {
    id: 'synthesis',
    label: 'Synthesis & Judgment',
    description: 'Final recommendation',
    icon: Scale,
    aiCapability: 'AI can draft the recommendation memo with deal terms',
    aiAction: 'Draft Synthesis',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function AnalysisProgressCard({
  currentStage,
  stageProgress,
  onStageStart,
  onStageClick,
  onAIAnalyze,
  documentCount,
  hasFinancials,
}: AnalysisProgressCardProps) {
  const [aiRunning, setAiRunning] = useState<AnalysisStage | null>(null);

  const getStageStatus = (stageId: AnalysisStage): StageStatus => {
    const progress = stageProgress.find((p) => p.stage === stageId);
    return progress?.status || 'not_started';
  };

  const completedCount = stageProgress.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / 6) * 100);

  const canStartStage = (stageId: AnalysisStage): boolean => {
    const stageIndex = STAGES.findIndex((s) => s.id === stageId);
    if (stageIndex === 0) return true;
    // Can start if previous stage is completed or in_progress
    const prevStage = STAGES[stageIndex - 1];
    const prevStatus = getStageStatus(prevStage.id);
    return prevStatus === 'completed' || prevStatus === 'in_progress';
  };

  const handleAIAction = async (stage: AnalysisStage) => {
    setAiRunning(stage);
    onAIAnalyze?.(stage);
    // Auto-clear after 3s if parent doesn't handle it
    setTimeout(() => setAiRunning(null), 3000);
  };

  return (
    <div className="neu-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Analysis Progress
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {completedCount} of 6 phases complete
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-surface-200 dark:text-surface-700"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progressPercent * 1.005} 100.5`}
                strokeLinecap="round"
                className="text-primary-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-surface-700 dark:text-surface-300">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="divide-y divide-surface-100 dark:divide-surface-800">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const isCurrent = stage.id === currentStage;
          const canStart = canStartStage(stage.id);
          const isAiRunning = aiRunning === stage.id;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={cn(
                'px-5 py-3 transition-colors cursor-pointer group',
                isCurrent && 'bg-primary-50/50 dark:bg-primary-950/20',
                status === 'completed' && 'bg-emerald-50/30 dark:bg-emerald-950/10',
                !isCurrent && status !== 'completed' && 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
              )}
              onClick={() => onStageClick(stage.id)}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                    status === 'completed' && 'bg-emerald-500 text-white',
                    status === 'in_progress' && 'bg-primary-500 text-white',
                    status === 'blocked' && 'bg-red-500 text-white',
                    status === 'not_started' && canStart && 'bg-surface-200 dark:bg-surface-700 text-surface-500',
                    status === 'not_started' && !canStart && 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : status === 'in_progress' ? (
                    <Icon className="w-4 h-4" />
                  ) : status === 'blocked' ? (
                    <Lock className="w-4 h-4" />
                  ) : canStart ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        status === 'completed' && 'text-emerald-700 dark:text-emerald-400',
                        status === 'in_progress' && 'text-primary-700 dark:text-primary-400',
                        status === 'not_started' && !canStart && 'text-surface-400',
                        (status === 'not_started' && canStart) && 'text-surface-700 dark:text-surface-300'
                      )}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && status === 'in_progress' && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{stage.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* AI Action Button */}
                  {status !== 'completed' && canStart && onAIAnalyze && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        isCurrent && 'opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAIAction(stage.id);
                      }}
                      disabled={isAiRunning}
                    >
                      {isAiRunning ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-primary-500" />
                          {stage.aiAction}
                        </>
                      )}
                    </Button>
                  )}

                  {/* Start button for not-started stages */}
                  {status === 'not_started' && canStart && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStageStart(stage.id);
                      }}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  )}

                  <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300 transition-colors" />
                </div>
              </div>

              {/* AI capability hint on hover for current or startable stages */}
              {(isCurrent || (status === 'not_started' && canStart)) && (
                <div className="mt-2 ml-11 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-surface-500">{stage.aiCapability}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
