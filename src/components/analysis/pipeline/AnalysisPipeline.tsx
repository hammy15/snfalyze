'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileUp,
  Users,
  DollarSign,
  Receipt,
  Building2,
  Calculator,
  CheckCircle,
  Circle,
  Loader2,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface Stage {
  id: string;
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  order: number;
  startedAt: string | null;
  completedAt: string | null;
  pendingClarifications: number;
  stageData: Record<string, unknown> | null;
  title: string;
  description: string;
}

interface PipelineData {
  dealId: string;
  stages: Stage[];
  progress: number;
  completedStages: number;
  totalStages: number;
  currentStage: {
    id: string;
    stage: string;
    status: string;
  } | null;
}

interface AnalysisPipelineProps {
  dealId: string;
  onStageClick?: (stage: Stage) => void;
}

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document_upload: FileUp,
  census_validation: Users,
  revenue_analysis: DollarSign,
  expense_analysis: Receipt,
  cms_integration: Building2,
  valuation_coverage: Calculator,
};

const STAGE_COLORS: Record<string, string> = {
  pending: 'text-surface-400 bg-surface-100',
  in_progress: 'text-blue-600 bg-blue-100',
  completed: 'text-emerald-600 bg-emerald-100',
  blocked: 'text-amber-600 bg-amber-100',
};

export function AnalysisPipeline({ dealId, onStageClick }: AnalysisPipelineProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PipelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/deals/${dealId}/stages`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch stages');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline');
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [dealId]);

  const completeStage = async (stageId: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}/stages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, status: 'completed' }),
      });

      const result = await response.json();

      if (result.success) {
        // Refetch stages
        const stagesResponse = await fetch(`/api/deals/${dealId}/stages`);
        const stagesResult = await stagesResponse.json();
        if (stagesResult.success) {
          setData(stagesResult.data);
        }
      }
    } catch (err) {
      console.error('Failed to complete stage:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card variant="flat" className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <p className="text-surface-600">{error || 'Failed to load pipeline'}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analysis Pipeline</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-500">
              {data.completedStages} of {data.totalStages} complete
            </span>
            <span className="font-semibold text-emerald-600">{data.progress}%</span>
          </div>
        </div>
        <Progress value={data.progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.stages.map((stage, index) => {
            const Icon = STAGE_ICONS[stage.stage] || Circle;
            const isActive = stage.status === 'in_progress';
            const isCompleted = stage.status === 'completed';
            const isBlocked = stage.status === 'blocked';
            const isPending = stage.status === 'pending';

            return (
              <div
                key={stage.id}
                className={`relative flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10'
                      : isBlocked
                        ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10'
                        : 'border-surface-200 bg-surface-50/30 dark:bg-surface-900/30'
                } ${onStageClick ? 'cursor-pointer hover:border-emerald-300' : ''}`}
                onClick={() => onStageClick?.(stage)}
              >
                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    STAGE_COLORS[stage.status]
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isBlocked ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-surface-900 dark:text-surface-100">
                      {stage.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isActive
                            ? 'bg-blue-100 text-blue-700'
                            : isBlocked
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-surface-100 text-surface-500'
                      }`}
                    >
                      {stage.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-surface-500 mt-0.5">{stage.description}</p>

                  {/* Clarifications Badge */}
                  {stage.pendingClarifications > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <MessageSquare className="h-3 w-3" />
                      {stage.pendingClarifications} pending clarification
                      {stage.pendingClarifications !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {isActive && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeStage(stage.id);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  {onStageClick && !isPending && (
                    <ChevronRight className="h-5 w-5 text-surface-400" />
                  )}
                </div>

                {/* Connector Line */}
                {index < data.stages.length - 1 && (
                  <div
                    className={`absolute left-7 top-14 w-0.5 h-3 ${
                      isCompleted ? 'bg-emerald-300' : 'bg-surface-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
