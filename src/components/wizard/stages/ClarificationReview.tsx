'use client';

/**
 * ClarificationReview Stage
 *
 * Wizard stage for reviewing and resolving extraction clarifications.
 * Shows pending clarifications from the extraction process and allows
 * the user to resolve them before proceeding to COA mapping.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RefreshCw,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClarificationPanel, type Clarification } from '@/components/extraction/ClarificationPanel';
import type { WizardStageData } from '../EnhancedDealWizard';

interface ClarificationReviewProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function ClarificationReview({ stageData, onUpdate, dealId }: ClarificationReviewProps) {
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load clarifications from API
  const loadClarifications = useCallback(async () => {
    if (!dealId) {
      setClarifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/clarifications`);
      const data = await response.json();

      if (data.success && data.data) {
        // Transform API data to match Clarification interface
        const transformedClarifications: Clarification[] = data.data.map((c: any) => ({
          id: c.id,
          fieldPath: c.fieldPath || c.fieldName,
          fieldLabel: c.fieldName,
          clarificationType: c.clarificationType as Clarification['clarificationType'],
          priority: c.priority || 5,
          extractedValue: c.extractedValue,
          extractedConfidence: c.confidenceScore || 0.5,
          suggestedValues: (c.suggestedValues || []).map((v: string, idx: number) => ({
            value: parseFloat(v) || v,
            source: 'suggested',
            confidence: 0.7 - idx * 0.1,
          })),
          benchmarkRange: c.benchmarkRange || undefined,
          context: {
            documentName: c.document?.filename || 'Unknown Document',
            periodDescription: c.period || undefined,
            aiExplanation: c.reason,
            relatedValues: [],
          },
          status: c.status as 'pending' | 'resolved' | 'skipped',
        }));

        setClarifications(transformedClarifications);
      } else {
        setClarifications([]);
      }
    } catch (err) {
      console.error('Failed to load clarifications:', err);
      setError('Failed to load clarifications');
      setClarifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  // Load clarifications on mount
  useEffect(() => {
    loadClarifications();
  }, [loadClarifications]);

  // Handle clarification resolution
  const handleResolve = useCallback(
    async (clarificationId: string, resolvedValue: number | string, note?: string) => {
      if (!dealId) return;

      try {
        const response = await fetch(`/api/deals/${dealId}/clarifications/${clarificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'resolved',
            resolvedValue: String(resolvedValue),
            resolvedNote: note,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Update local state
          setClarifications((prev) =>
            prev.map((c) =>
              c.id === clarificationId
                ? { ...c, status: 'resolved' as const }
                : c
            )
          );
        } else {
          throw new Error(data.error || 'Failed to resolve clarification');
        }
      } catch (err) {
        console.error('Failed to resolve clarification:', err);
        throw err;
      }
    },
    [dealId]
  );

  // Handle skip
  const handleSkip = useCallback(
    async (clarificationId: string) => {
      if (!dealId) return;

      try {
        await fetch(`/api/deals/${dealId}/clarifications/${clarificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'skipped' }),
        });

        setClarifications((prev) =>
          prev.map((c) =>
            c.id === clarificationId ? { ...c, status: 'skipped' as const } : c
          )
        );
      } catch (err) {
        console.error('Failed to skip clarification:', err);
      }
    },
    [dealId]
  );

  // Skip all remaining clarifications
  const handleSkipAll = useCallback(async () => {
    const pending = clarifications.filter((c) => c.status === 'pending');
    for (const c of pending) {
      await handleSkip(c.id);
    }
  }, [clarifications, handleSkip]);

  // Calculate progress
  const total = clarifications.length;
  const resolved = clarifications.filter((c) => c.status === 'resolved').length;
  const skipped = clarifications.filter((c) => c.status === 'skipped').length;
  const pending = clarifications.filter((c) => c.status === 'pending').length;
  const progress = total > 0 ? ((resolved + skipped) / total) * 100 : 100;
  const highPriority = clarifications.filter(
    (c) => c.status === 'pending' && c.priority >= 8
  ).length;

  // Sync to parent
  useEffect(() => {
    onUpdate({
      clarificationReview: {
        total,
        resolved,
        skipped,
        pending,
      },
    });
  }, [total, resolved, skipped, pending, onUpdate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-surface-500">Loading clarifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="flat" className="border-rose-200 dark:border-rose-800">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadClarifications}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="w-12 h-12 text-primary-500 mb-4" />
            <h3 className="text-lg font-semibold">No Clarifications Needed</h3>
            <p className="text-surface-500 mt-2">
              All extracted data passed validation. You can proceed to COA mapping.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card variant="flat">
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Clarification Progress: {resolved + skipped} of {total}
              </span>
              <span className="text-sm text-surface-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary-500" />
                {resolved} resolved
              </span>
              <span className="flex items-center gap-1">
                <SkipForward className="w-3 h-3 text-surface-400" />
                {skipped} skipped
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-amber-500" />
                {pending} pending
              </span>
              {highPriority > 0 && (
                <span className="flex items-center gap-1 text-rose-500">
                  <AlertTriangle className="w-3 h-3" />
                  {highPriority} high priority
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skip All Button */}
      {pending > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipAll}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip All Remaining ({pending})
          </Button>
        </div>
      )}

      {/* Clarification Panel */}
      <ClarificationPanel
        clarifications={clarifications}
        onResolve={handleResolve}
        onSkip={handleSkip}
      />

      {/* All Complete Message */}
      {pending === 0 && total > 0 && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All clarifications reviewed. Ready for COA mapping.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
