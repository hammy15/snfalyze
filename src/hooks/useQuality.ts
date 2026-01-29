'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface QualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  field?: string;
  facilityId?: string;
  facilityName?: string;
  message: string;
  suggestedAction?: string;
}

export interface FacilityQualityScore {
  facilityId: string;
  facilityName: string;
  score: number;
  dataCompleteness: number;
  dataConfidence: number;
  issueCount: number;
  hasRevenue: boolean;
  hasExpenses: boolean;
  hasCensus: boolean;
  hasRates: boolean;
  periodCount: number;
}

export interface DocumentQualityScore {
  documentId: string;
  filename: string;
  ocrQuality: number | null;
  extractionConfidence: number | null;
  type: string;
}

export interface CompletenessCategory {
  revenue: { present: boolean; fields: { name: string; present: boolean; required: boolean }[] };
  expenses: { present: boolean; fields: { name: string; present: boolean; required: boolean }[] };
  census: { present: boolean; fields: { name: string; present: boolean; required: boolean }[] };
  rates: { present: boolean; fields: { name: string; present: boolean; required: boolean }[] };
  facilityInfo: { present: boolean; fields: { name: string; present: boolean; required: boolean }[] };
}

export interface QualityReport {
  dealId: string;
  dealName: string;
  overallScore: number;
  breakdown: {
    completeness: number;
    confidence: number;
    consistency: number;
    validation: number;
  };
  level: string;
  canProceedToAnalysis: boolean;
  issues: QualityIssue[];
  completeness: CompletenessCategory;
  recommendations: string[];
  facilityScores: FacilityQualityScore[];
  documentScores: DocumentQualityScore[];
  evaluatedAt: Date;
}

export interface QualityGateResult {
  canProceed: boolean;
  gateLevel: 'pass' | 'warn' | 'block';
  blockers: QualityIssue[];
  warnings: QualityIssue[];
  bypassable: boolean;
  minimumScore: number;
  actualScore: number;
  message: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuality(dealId: string) {
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuality = useCallback(async () => {
    if (!dealId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/quality`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch quality data');
      }

      setQuality(data.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  const recalculate = useCallback(async () => {
    if (!dealId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/quality`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to recalculate quality');
      }

      setQuality(data.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  const checkGate = useCallback(
    async (action: string): Promise<QualityGateResult | null> => {
      if (!dealId) return null;

      try {
        const response = await fetch(`/api/deals/${dealId}/quality?action=${action}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to check quality gate');
        }

        return data.data.gate;
      } catch (err) {
        console.error('Quality gate check failed:', err);
        return null;
      }
    },
    [dealId]
  );

  useEffect(() => {
    fetchQuality();
  }, [fetchQuality]);

  return {
    quality,
    isLoading,
    error,
    recalculate,
    checkGate,
    refresh: fetchQuality,
  };
}
