'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  WorkspaceStageType,
  WorkspaceStageRecord,
  WorkspaceState,
  WORKSPACE_STAGES,
} from '@/types/workspace';

const DEBOUNCE_MS = 1500;

interface UseWorkspaceOptions {
  dealId: string;
  initialStages?: WorkspaceStageRecord[];
  initialCurrentStage?: WorkspaceStageType;
}

export function useWorkspace({ dealId, initialStages, initialCurrentStage }: UseWorkspaceOptions) {
  const [state, setState] = useState<WorkspaceState>({
    dealId,
    currentStage: initialCurrentStage || 'deal_intake',
    stages: initialStages || [],
    isDirty: false,
    isSaving: false,
    isLoading: !initialStages,
    error: null,
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savingRef = useRef(false);
  const latestDataRef = useRef<Record<string, unknown> | null>(null);

  // Load workspace on mount if no initial data
  useEffect(() => {
    if (!initialStages) {
      loadWorkspace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadWorkspace = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/deals/${dealId}/workspace`);
      if (!response.ok) {
        // Initialize workspace if it doesn't exist
        if (response.status === 404) {
          const initRes = await fetch(`/api/deals/${dealId}/workspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!initRes.ok) throw new Error('Failed to initialize workspace');
          const initData = await initRes.json();
          setState(s => ({
            ...s,
            stages: initData.stages,
            currentStage: initData.currentStage || 'deal_intake',
            isLoading: false,
          }));
          return;
        }
        throw new Error('Failed to load workspace');
      }
      const data = await response.json();
      setState(s => ({
        ...s,
        stages: data.stages,
        currentStage: data.currentStage || 'deal_intake',
        isLoading: false,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [dealId]);

  // Get current stage record
  const getCurrentStageRecord = useCallback((): WorkspaceStageRecord | undefined => {
    return state.stages.find(s => s.stage === state.currentStage);
  }, [state.stages, state.currentStage]);

  // Get stage data for a specific stage
  const getStageData = useCallback(<T = Record<string, unknown>>(stage: WorkspaceStageType): T => {
    const record = state.stages.find(s => s.stage === stage);
    return (record?.stageData || {}) as T;
  }, [state.stages]);

  // Debounced save to API
  const saveToApi = useCallback(async (stage: WorkspaceStageType, data: Record<string, unknown>) => {
    if (savingRef.current) {
      latestDataRef.current = data;
      return;
    }
    savingRef.current = true;
    setState(s => ({ ...s, isSaving: true }));

    try {
      const response = await fetch(`/api/deals/${dealId}/workspace`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, stageData: data }),
      });
      if (!response.ok) throw new Error('Failed to save');
      const result = await response.json();

      setState(s => ({
        ...s,
        stages: s.stages.map(st =>
          st.stage === stage
            ? { ...st, stageData: result.stageData || data, completionScore: result.completionScore ?? st.completionScore }
            : st
        ),
        isDirty: false,
        isSaving: false,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isSaving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      }));
    } finally {
      savingRef.current = false;
      // If there was a pending save while we were saving, do it now
      if (latestDataRef.current) {
        const pendingData = latestDataRef.current;
        latestDataRef.current = null;
        saveToApi(stage, pendingData);
      }
    }
  }, [dealId]);

  // Update stage data (with debounced save)
  const updateStageData = useCallback((data: Record<string, unknown>) => {
    const stage = state.currentStage;

    // Immediately update local state (deep merge)
    setState(s => ({
      ...s,
      isDirty: true,
      stages: s.stages.map(st => {
        if (st.stage !== stage) return st;
        const merged = deepMerge(st.stageData as Record<string, unknown>, data);
        return { ...st, stageData: merged, status: st.status === 'pending' ? 'in_progress' : st.status } as WorkspaceStageRecord;
      }),
    }));

    // Debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const record = state.stages.find(s => s.stage === stage);
      const merged = deepMerge((record?.stageData || {}) as Record<string, unknown>, data);
      saveToApi(stage, merged);
    }, DEBOUNCE_MS);
  }, [state.currentStage, state.stages, saveToApi]);

  // Navigate to a stage
  const navigateToStage = useCallback(async (targetStage: WorkspaceStageType) => {
    // Flush any pending saves
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const currentRecord = getCurrentStageRecord();
      if (currentRecord && state.isDirty) {
        await saveToApi(state.currentStage, currentRecord.stageData as Record<string, unknown>);
      }
    }

    setState(s => ({ ...s, currentStage: targetStage }));

    // Update server
    await fetch(`/api/deals/${dealId}/workspace`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStage: targetStage }),
    });
  }, [dealId, state.currentStage, state.isDirty, getCurrentStageRecord, saveToApi]);

  // Advance to next stage
  const advanceStage = useCallback(async () => {
    const stageOrder: WorkspaceStageType[] = ['deal_intake', 'comp_pull', 'pro_forma', 'risk_score', 'investment_memo'];
    const currentIdx = stageOrder.indexOf(state.currentStage);
    if (currentIdx < stageOrder.length - 1) {
      // Mark current as completed
      setState(s => ({
        ...s,
        stages: s.stages.map(st =>
          st.stage === s.currentStage
            ? { ...st, status: 'completed' as const, completedAt: new Date().toISOString() }
            : st
        ),
      }));

      const nextStage = stageOrder[currentIdx + 1];
      await navigateToStage(nextStage);
    }
  }, [state.currentStage, navigateToStage]);

  // Go to previous stage
  const goBackStage = useCallback(async () => {
    const stageOrder: WorkspaceStageType[] = ['deal_intake', 'comp_pull', 'pro_forma', 'risk_score', 'investment_memo'];
    const currentIdx = stageOrder.indexOf(state.currentStage);
    if (currentIdx > 0) {
      await navigateToStage(stageOrder[currentIdx - 1]);
    }
  }, [state.currentStage, navigateToStage]);

  // Check if a stage is accessible
  const isStageAccessible = useCallback((stage: WorkspaceStageType): boolean => {
    const stageOrder: WorkspaceStageType[] = ['deal_intake', 'comp_pull', 'pro_forma', 'risk_score', 'investment_memo'];
    const targetIdx = stageOrder.indexOf(stage);

    // Current stage is always accessible
    if (stage === state.currentStage) return true;

    // Any stage that's been started or completed is accessible
    const targetRecord = state.stages.find(s => s.stage === stage);
    if (targetRecord && (targetRecord.status === 'completed' || targetRecord.status === 'in_progress')) return true;

    // Can advance to the next unstarted stage if ALL prior stages are completed or in_progress
    const priorStages = stageOrder.slice(0, targetIdx);
    const allPriorReached = priorStages.every(ps => {
      const record = state.stages.find(s => s.stage === ps);
      return record && (record.status === 'completed' || record.status === 'in_progress');
    });
    return allPriorReached;
  }, [state.currentStage, state.stages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    ...state,
    getCurrentStageRecord,
    getStageData,
    updateStageData,
    navigateToStage,
    advanceStage,
    goBackStage,
    isStageAccessible,
    reload: loadWorkspace,
  };
}

// Deep merge utility (preserves sibling keys)
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
