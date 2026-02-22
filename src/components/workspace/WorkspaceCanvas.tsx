'use client';

import { Suspense, lazy } from 'react';
import type { WorkspaceStageType, WorkspaceStageRecord } from '@/types/workspace';
import { WORKSPACE_STAGES } from '@/types/workspace';

// Lazy load stage components
const DealIntakeStage = lazy(() =>
  import('./stages/DealIntakeStage').then(m => ({ default: m.DealIntakeStage }))
);
const CompPullStage = lazy(() =>
  import('./stages/CompPullStage').then(m => ({ default: m.CompPullStage }))
);
const ProFormaStage = lazy(() =>
  import('./stages/ProFormaStage').then(m => ({ default: m.ProFormaStage }))
);
const RiskScoreStage = lazy(() =>
  import('./stages/RiskScoreStage').then(m => ({ default: m.RiskScoreStage }))
);
const InvestmentMemoStage = lazy(() =>
  import('./stages/InvestmentMemoStage').then(m => ({ default: m.InvestmentMemoStage }))
);

interface WorkspaceCanvasProps {
  dealId: string;
  currentStage: WorkspaceStageType;
  stageRecord: WorkspaceStageRecord | undefined;
  onUpdateStageData: (data: Record<string, unknown>) => void;
  onAdvance: () => void;
  onGoBack: () => void;
  onComplete?: () => void;
}

export function WorkspaceCanvas({
  dealId,
  currentStage,
  stageRecord,
  onUpdateStageData,
  onAdvance,
  onGoBack,
  onComplete,
}: WorkspaceCanvasProps) {
  const config = WORKSPACE_STAGES.find(s => s.id === currentStage);
  const stageData = (stageRecord?.stageData || {}) as Record<string, unknown>;
  const stageOrder: WorkspaceStageType[] = ['deal_intake', 'comp_pull', 'pro_forma', 'risk_score', 'investment_memo'];
  const currentIdx = stageOrder.indexOf(currentStage);
  const isFirstStage = currentIdx === 0;
  const isLastStage = currentIdx === stageOrder.length - 1;

  const sharedProps = {
    dealId,
    stageData,
    onUpdate: onUpdateStageData,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stage header */}
      <div className="border-b border-surface-200 dark:border-surface-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">
                Stage {currentIdx + 1} of {stageOrder.length}
              </span>
              {stageRecord?.status === 'completed' && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mt-1">
              {config?.label}
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {config?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          }
        >
          {currentStage === 'deal_intake' && <DealIntakeStage {...sharedProps} />}
          {currentStage === 'comp_pull' && <CompPullStage {...sharedProps} />}
          {currentStage === 'pro_forma' && <ProFormaStage {...sharedProps} />}
          {currentStage === 'risk_score' && <RiskScoreStage {...sharedProps} />}
          {currentStage === 'investment_memo' && <InvestmentMemoStage {...sharedProps} />}
        </Suspense>
      </div>

      {/* Navigation footer */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onGoBack}
            disabled={isFirstStage}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous Stage
          </button>
          <button
            onClick={isLastStage ? onComplete : onAdvance}
            disabled={isLastStage && !onComplete}
            className="px-5 py-2.5 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLastStage ? 'Complete Workspace' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
