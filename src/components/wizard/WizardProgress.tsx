'use client';

import { cn } from '@/lib/utils';
import { Check, CircleDot } from 'lucide-react';

const WIZARD_STAGES = [
  { id: 'document_upload', label: 'Upload', description: 'Upload deal documents for AI analysis' },
  { id: 'review_analysis', label: 'Review', description: 'Review and confirm AI suggestions' },
  { id: 'facility_verification', label: 'Verify', description: 'Verify facilities against CMS data' },
  { id: 'document_extraction', label: 'Extract', description: 'Extract and validate financial data' },
  { id: 'coa_mapping_review', label: 'Map', description: 'Map to chart of accounts' },
  { id: 'financial_consolidation', label: 'Financials', description: 'Review and generate proforma' },
];

interface WizardProgressProps {
  currentStage: string;
  completedStages?: string[];
  onStageClick?: (stageId: string) => void;
  className?: string;
}

export function WizardProgress({
  currentStage,
  completedStages = [],
  onStageClick,
  className,
}: WizardProgressProps) {
  const currentIndex = WIZARD_STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STAGES.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.id) || index < currentIndex;
          const isCurrent = stage.id === currentStage;
          const isClickable = onStageClick && (isCompleted || isCurrent);

          return (
            <div key={stage.id} className="flex-1 flex items-center">
              {/* Stage indicator */}
              <div
                className={cn(
                  'flex flex-col items-center',
                  isClickable && 'cursor-pointer'
                )}
                onClick={() => isClickable && onStageClick(stage.id)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted
                      ? 'bg-primary-500 text-white'
                      : isCurrent
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'bg-surface-200 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : isCurrent ? (
                    <CircleDot className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCurrent
                      ? 'text-primary-600 dark:text-primary-400'
                      : isCompleted
                      ? 'text-surface-700 dark:text-surface-300'
                      : 'text-surface-500 dark:text-surface-400'
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {index < WIZARD_STAGES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < currentIndex
                      ? 'bg-primary-500'
                      : 'bg-surface-200 dark:bg-surface-700'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
            Step {currentIndex + 1} of {WIZARD_STAGES.length}
          </span>
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {WIZARD_STAGES[currentIndex]?.label}
          </span>
        </div>
        <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / WIZARD_STAGES.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
          {WIZARD_STAGES[currentIndex]?.description}
        </p>
      </div>
    </div>
  );
}

export { WIZARD_STAGES };
