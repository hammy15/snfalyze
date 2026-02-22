'use client';

import { useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { WorkspaceStageRail } from './WorkspaceStageRail';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { CILPanel } from './CILPanel';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Link from 'next/link';
import type { WorkspaceStageRecord } from '@/types/workspace';

interface WorkspaceShellProps {
  dealId: string;
  dealName: string;
  initialStages?: WorkspaceStageRecord[];
  initialCurrentStage?: 'deal_intake' | 'comp_pull' | 'pro_forma' | 'risk_score' | 'investment_memo';
}

export function WorkspaceShell({
  dealId,
  dealName,
  initialStages,
  initialCurrentStage,
}: WorkspaceShellProps) {
  const [cilCollapsed, setCilCollapsed] = useState(false);
  const workspace = useWorkspace({
    dealId,
    initialStages,
    initialCurrentStage,
  });

  const currentRecord = workspace.getCurrentStageRecord();
  const cilInsights = workspace.stages.flatMap(s =>
    Array.isArray(s.cilInsights) ? s.cilInsights : []
  );

  if (workspace.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-surface-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (workspace.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{workspace.error}</p>
          <button
            onClick={workspace.reload}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/deals/${dealId}`}
            className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-surface-500" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {dealName}
            </h1>
            <p className="text-[11px] text-surface-500">Deal Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {workspace.isSaving && (
            <div className="flex items-center gap-1.5 text-surface-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Saving...</span>
            </div>
          )}
          {workspace.isDirty && !workspace.isSaving && (
            <div className="flex items-center gap-1.5 text-amber-500">
              <Save className="w-3.5 h-3.5" />
              <span className="text-xs">Unsaved</span>
            </div>
          )}
          {!workspace.isDirty && !workspace.isSaving && (
            <span className="text-xs text-emerald-500">Saved</span>
          )}

          {/* CIL toggle */}
          <button
            onClick={() => setCilCollapsed(!cilCollapsed)}
            className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg transition-colors ml-2"
            title={cilCollapsed ? 'Show CIL Advisor' : 'Hide CIL Advisor'}
          >
            {cilCollapsed ? (
              <PanelRightOpen className="w-4 h-4 text-surface-500" />
            ) : (
              <PanelRightClose className="w-4 h-4 text-surface-500" />
            )}
          </button>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail - Stage navigation */}
        <div className="w-[220px] shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto hidden lg:block">
          <WorkspaceStageRail
            currentStage={workspace.currentStage}
            stages={workspace.stages}
            onStageClick={workspace.navigateToStage}
            isStageAccessible={workspace.isStageAccessible}
          />
        </div>

        {/* Mobile stage selector */}
        <div className="lg:hidden border-b border-surface-200 dark:border-surface-700 px-4 py-2 bg-surface-50 dark:bg-surface-900 overflow-x-auto">
          <div className="flex gap-2">
            {workspace.stages.map((stage, i) => {
              const isCurrent = stage.stage === workspace.currentStage;
              return (
                <button
                  key={stage.stage}
                  onClick={() => workspace.isStageAccessible(stage.stage) && workspace.navigateToStage(stage.stage)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                    isCurrent
                      ? 'bg-primary-500 text-white'
                      : stage.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                  )}
                >
                  {i + 1}. {stage.stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center canvas - Stage content */}
        <div className="flex-1 overflow-hidden">
          <WorkspaceCanvas
            dealId={dealId}
            currentStage={workspace.currentStage}
            stageRecord={currentRecord}
            onUpdateStageData={workspace.updateStageData}
            onAdvance={workspace.advanceStage}
            onGoBack={workspace.goBackStage}
          />
        </div>

        {/* Right panel - CIL */}
        <div
          className={cn(
            'shrink-0 overflow-hidden transition-all duration-300 hidden md:block',
            cilCollapsed ? 'w-10' : 'w-[280px]'
          )}
        >
          <CILPanel
            dealId={dealId}
            currentStage={workspace.currentStage}
            insights={cilInsights}
            isCollapsed={cilCollapsed}
            onToggle={() => setCilCollapsed(!cilCollapsed)}
          />
        </div>
      </div>
    </div>
  );
}
