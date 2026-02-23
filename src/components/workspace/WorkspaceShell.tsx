'use client';

import React, { useState, useCallback, useEffect, useRef, Component } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/hooks/use-workspace';
import { WorkspaceStageRail } from './WorkspaceStageRail';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { CILPanel } from './CILPanel';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, PanelRightClose, PanelRightOpen, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { WorkspaceStageRecord, CILInsight } from '@/types/workspace';

// Error boundary to catch lazy-load crashes gracefully
class WorkspaceErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('[WorkspaceErrorBoundary]', error.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-surface-500 mb-3">Something went wrong loading this stage.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset();
              }}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const router = useRouter();
  const [cilCollapsed, setCilCollapsed] = useState(false);
  const workspace = useWorkspace({
    dealId,
    initialStages,
    initialCurrentStage,
  });

  const currentRecord = workspace.getCurrentStageRecord();
  const [cilInsights, setCilInsights] = useState<CILInsight[]>(() =>
    workspace.stages.flatMap(s => Array.isArray(s.cilInsights) ? s.cilInsights : [])
  );
  const cilTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-refresh CIL insights when stage changes (only on stage transitions, not saves)
  useEffect(() => {
    if (cilTimerRef.current) clearTimeout(cilTimerRef.current);
    cilTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`/api/deals/${dealId}/cil`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: workspace.currentStage }),
        });
        if (!mountedRef.current) return;
        if (res.ok) {
          const data = await res.json();
          if (!mountedRef.current) return;
          if (data.insights && Array.isArray(data.insights)) {
            setCilInsights(prev => {
              const otherStage = prev.filter(i => i.stage !== workspace.currentStage);
              return [...otherStage, ...data.insights];
            });
          }
        }
      } catch {
        // CIL fetch is non-critical — silently fail
      }
    }, 5000);

    return () => {
      if (cilTimerRef.current) clearTimeout(cilTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, workspace.currentStage]);

  const completeWorkspace = useCallback(async () => {
    // Mark final stage as completed
    await workspace.updateStageData({ status: 'completed' });
    // Mark workspace as completed via PATCH
    await fetch(`/api/deals/${dealId}/workspace`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'investment_memo', status: 'completed' }),
    });
    // Navigate back to deal page
    router.push(`/app/deals/${dealId}`);
  }, [dealId, workspace, router]);

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

      {/* Validation error banner */}
      {workspace.error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{workspace.error}</p>
        </div>
      )}

      {/* Mobile stage selector — above the flex row so it doesn't consume horizontal space */}
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

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left rail - Stage navigation */}
        <div className="w-[220px] shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto hidden lg:block">
          <WorkspaceStageRail
            currentStage={workspace.currentStage}
            stages={workspace.stages}
            onStageClick={workspace.navigateToStage}
            isStageAccessible={workspace.isStageAccessible}
          />
        </div>

        {/* Center canvas - Stage content */}
        <div className="flex-1 overflow-hidden">
          <WorkspaceErrorBoundary
            key={errorBoundaryKey}
            onReset={() => setErrorBoundaryKey(k => k + 1)}
          >
            <WorkspaceCanvas
              dealId={dealId}
              currentStage={workspace.currentStage}
              stageRecord={currentRecord}
              onUpdateStageData={workspace.updateStageData}
              onAdvance={workspace.advanceStage}
              onGoBack={workspace.goBackStage}
              onComplete={completeWorkspace}
            />
          </WorkspaceErrorBoundary>
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
