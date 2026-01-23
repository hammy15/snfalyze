'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  type AnalysisStage,
  type StageStatus,
  ANALYSIS_STAGES,
} from '@/lib/deals/types';
import {
  FileText,
  Calculator,
  Activity,
  AlertTriangle,
  DollarSign,
  Scale,
  Check,
  ChevronRight,
  Lock,
  Play,
  AlertCircle,
} from 'lucide-react';

const STAGE_ICONS: Record<AnalysisStage, React.ComponentType<{ className?: string }>> = {
  document_understanding: FileText,
  financial_reconstruction: Calculator,
  operating_reality: Activity,
  risk_constraints: AlertTriangle,
  valuation: DollarSign,
  synthesis: Scale,
};

const STAGE_TOOLS: Record<AnalysisStage, { name: string; description: string; href: string }[]> = {
  document_understanding: [
    { name: 'Documents', description: 'Upload and review deal documents', href: 'documents' },
    { name: 'CMS Import', description: 'Pull facility data from Medicare.gov', href: 'facilities' },
  ],
  financial_reconstruction: [
    { name: 'Proforma Builder', description: 'Build normalized T12 financials', href: 'proforma' },
    { name: 'Document Analyzer', description: 'Extract data from financials', href: 'documents' },
  ],
  operating_reality: [
    { name: 'CMS Data', description: 'Review quality ratings and staffing', href: 'facilities' },
    { name: 'Occupancy Analysis', description: 'Track census and payer mix trends', href: 'proforma' },
  ],
  risk_constraints: [
    { name: 'Survey History', description: 'Review deficiencies and compliance', href: 'facilities' },
    { name: 'Risk Assessment', description: 'Document key risks and mitigants', href: 'risks' },
  ],
  valuation: [
    { name: 'Valuation Engine', description: 'Run multiple valuation methods', href: 'valuation' },
    { name: 'Comparables', description: 'Analyze comparable sales', href: 'valuation' },
    { name: 'Sensitivity', description: 'Test cap rate and NOI scenarios', href: 'valuation' },
  ],
  synthesis: [
    { name: 'Deal Synthesis', description: 'Build final recommendation memo', href: 'synthesis' },
    { name: 'Assumptions', description: 'Document key assumptions', href: 'assumptions' },
  ],
};

interface StageProgress {
  stage: AnalysisStage;
  status: StageStatus;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

interface ProcessDrivenLayoutProps {
  dealId: string;
  currentStage: AnalysisStage;
  stageProgress: StageProgress[];
  onStageSelect: (stage: AnalysisStage) => void;
  onToolSelect: (stage: AnalysisStage, toolHref: string) => void;
  children: React.ReactNode;
  className?: string;
}

function getStageStatus(stage: AnalysisStage, progress: StageProgress[]): StageStatus {
  const found = progress.find((p) => p.stage === stage);
  return found?.status || 'not_started';
}

const STATUS_STYLES: Record<StageStatus, { bg: string; text: string; border: string }> = {
  not_started: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  blocked: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

const STATUS_ICONS: Record<StageStatus, React.ComponentType<{ className?: string }>> = {
  not_started: Lock,
  in_progress: Play,
  completed: Check,
  blocked: AlertCircle,
};

export function ProcessDrivenLayout({
  dealId,
  currentStage,
  stageProgress,
  onStageSelect,
  onToolSelect,
  children,
  className,
}: ProcessDrivenLayoutProps) {
  const stages = Object.keys(ANALYSIS_STAGES) as AnalysisStage[];

  // Calculate progress
  const completedCount = stages.filter(
    (s) => getStageStatus(s, stageProgress) === 'completed'
  ).length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Process Sidebar */}
      <div className="w-72 border-r border-[var(--color-border-default)] bg-white flex flex-col">
        {/* Progress Header */}
        <div className="p-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[var(--color-text-primary)]">Analysis Process</h3>
            <span className="text-sm font-medium text-[var(--accent-solid)]">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-[var(--gray-100)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-solid)] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {completedCount} of {stages.length} stages complete
          </p>
        </div>

        {/* Stage List */}
        <div className="flex-1 overflow-y-auto py-2">
          {stages.map((stage, index) => {
            const stageInfo = ANALYSIS_STAGES[stage];
            const status = getStageStatus(stage, stageProgress);
            const Icon = STAGE_ICONS[stage];
            const StatusIcon = STATUS_ICONS[status];
            const styles = STATUS_STYLES[status];
            const isCurrent = stage === currentStage;
            const tools = STAGE_TOOLS[stage];

            return (
              <div key={stage} className="px-2">
                {/* Stage Button */}
                <button
                  type="button"
                  onClick={() => onStageSelect(stage)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all',
                    isCurrent
                      ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-solid)]'
                      : 'hover:bg-[var(--gray-50)] border-2 border-transparent'
                  )}
                >
                  {/* Stage number */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'in_progress'
                          ? 'bg-blue-500 text-white'
                          : 'bg-[var(--gray-200)] text-[var(--color-text-tertiary)]'
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-medium text-sm truncate',
                          isCurrent
                            ? 'text-[var(--accent-solid)]'
                            : 'text-[var(--color-text-primary)]'
                        )}
                      >
                        {stageInfo.label}
                      </span>
                      {status === 'blocked' && (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                      {stageInfo.description}
                    </p>
                  </div>

                  <ChevronRight
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform',
                      isCurrent ? 'text-[var(--accent-solid)]' : 'text-[var(--color-text-tertiary)]'
                    )}
                  />
                </button>

                {/* Tools for current stage */}
                {isCurrent && tools.length > 0 && (
                  <div className="ml-11 mt-1 mb-2 space-y-1">
                    {tools.map((tool) => (
                      <button
                        key={tool.name}
                        type="button"
                        onClick={() => onToolSelect(stage, tool.href)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md hover:bg-[var(--gray-100)] transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-solid)]" />
                        <span className="text-[var(--color-text-secondary)]">{tool.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div className="ml-[26px] h-2 w-0.5 bg-[var(--gray-200)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Key Questions */}
        <div className="p-4 border-t border-[var(--color-border-default)] bg-[var(--gray-50)]">
          <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-2">
            Key Questions - {ANALYSIS_STAGES[currentStage].label}
          </h4>
          <ul className="space-y-1">
            {ANALYSIS_STAGES[currentStage].key_questions.slice(0, 3).map((q, i) => (
              <li key={i} className="text-xs text-[var(--color-text-secondary)] flex items-start gap-1">
                <span className="text-[var(--accent-solid)]">•</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Horizontal process stepper for compact views
export function ProcessStepper({
  currentStage,
  stageProgress,
  onStageSelect,
  className,
}: {
  currentStage: AnalysisStage;
  stageProgress: StageProgress[];
  onStageSelect: (stage: AnalysisStage) => void;
  className?: string;
}) {
  const stages = Object.keys(ANALYSIS_STAGES) as AnalysisStage[];

  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto py-2', className)}>
      {stages.map((stage, index) => {
        const stageInfo = ANALYSIS_STAGES[stage];
        const status = getStageStatus(stage, stageProgress);
        const Icon = STAGE_ICONS[stage];
        const isCurrent = stage === currentStage;

        return (
          <div key={stage} className="flex items-center">
            <button
              type="button"
              onClick={() => onStageSelect(stage)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
                isCurrent
                  ? 'bg-[var(--accent-solid)] text-white'
                  : status === 'completed'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-[var(--gray-100)] text-[var(--color-text-secondary)] hover:bg-[var(--gray-200)]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{stageInfo.label}</span>
              {status === 'completed' && !isCurrent && (
                <Check className="w-4 h-4" />
              )}
            </button>

            {index < stages.length - 1 && (
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] mx-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
