'use client';

import { useState } from 'react';
import {
  type AnalysisStage,
  type StageStatus,
  type AnalysisStageProgress,
  ANALYSIS_STAGES,
} from '@/lib/deals/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  Calculator,
  Activity,
  AlertTriangle,
  DollarSign,
  Scale,
  Check,
  Clock,
  Lock,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';

interface StageTrackerProps {
  dealId: string;
  currentStage: AnalysisStage;
  stageProgress: AnalysisStageProgress[];
  onStageStart: (stage: AnalysisStage) => void;
  onStageComplete: (stage: AnalysisStage, notes?: string) => void;
  onStageBlock: (stage: AnalysisStage, blocker: string) => void;
  onNavigateToStage: (stage: AnalysisStage) => void;
}

const STAGE_ICONS: Record<AnalysisStage, React.ReactNode> = {
  document_understanding: <FileText className="h-5 w-5" />,
  financial_reconstruction: <Calculator className="h-5 w-5" />,
  operating_reality: <Activity className="h-5 w-5" />,
  risk_constraints: <AlertTriangle className="h-5 w-5" />,
  valuation: <DollarSign className="h-5 w-5" />,
  synthesis: <Scale className="h-5 w-5" />,
};

const STATUS_COLORS: Record<StageStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-400',
  completed: 'bg-green-100 text-green-700 border-green-400',
  blocked: 'bg-red-100 text-red-700 border-red-400',
};

const STATUS_ICONS: Record<StageStatus, React.ReactNode> = {
  not_started: <Lock className="h-4 w-4" />,
  in_progress: <Play className="h-4 w-4" />,
  completed: <Check className="h-4 w-4" />,
  blocked: <AlertCircle className="h-4 w-4" />,
};

export function StageTracker({
  dealId,
  currentStage,
  stageProgress,
  onStageStart,
  onStageComplete,
  onStageBlock,
  onNavigateToStage,
}: StageTrackerProps) {
  const [expandedStages, setExpandedStages] = useState<Set<AnalysisStage>>(
    new Set([currentStage])
  );
  const [completionNotes, setCompletionNotes] = useState<Record<AnalysisStage, string>>({} as Record<AnalysisStage, string>);
  const [blockerInput, setBlockerInput] = useState<Record<AnalysisStage, string>>({} as Record<AnalysisStage, string>);

  const stages = Object.keys(ANALYSIS_STAGES) as AnalysisStage[];

  const getStageProgress = (stage: AnalysisStage): AnalysisStageProgress | undefined => {
    return stageProgress.find((p) => p.stage === stage);
  };

  const getStageStatus = (stage: AnalysisStage): StageStatus => {
    const progress = getStageProgress(stage);
    return progress?.status || 'not_started';
  };

  const canStartStage = (stage: AnalysisStage): boolean => {
    const stageInfo = ANALYSIS_STAGES[stage];
    const currentStatus = getStageStatus(stage);

    // Can't start if already completed or in progress
    if (currentStatus === 'completed' || currentStatus === 'in_progress') {
      return false;
    }

    // First stage can always start
    if (stageInfo.order === 1) {
      return true;
    }

    // Otherwise, previous stage must be completed (soft staging allows jumping ahead)
    // For soft staging, we allow starting any stage, but show a warning
    return true;
  };

  const isPreviousStageComplete = (stage: AnalysisStage): boolean => {
    const stageInfo = ANALYSIS_STAGES[stage];
    if (stageInfo.order === 1) return true;

    const previousStage = stages.find(
      (s) => ANALYSIS_STAGES[s].order === stageInfo.order - 1
    );
    if (!previousStage) return true;

    return getStageStatus(previousStage) === 'completed';
  };

  const toggleExpanded = (stage: AnalysisStage) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const handleComplete = (stage: AnalysisStage) => {
    onStageComplete(stage, completionNotes[stage]);
    setCompletionNotes((prev) => ({ ...prev, [stage]: '' }));
  };

  const handleBlock = (stage: AnalysisStage) => {
    if (blockerInput[stage]) {
      onStageBlock(stage, blockerInput[stage]);
      setBlockerInput((prev) => ({ ...prev, [stage]: '' }));
    }
  };

  // Calculate overall progress
  const completedCount = stages.filter((s) => getStageStatus(s) === 'completed').length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Analysis Progress</CardTitle>
            <CardDescription>
              Soft staging through 6 analysis phases
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <div className="text-xs text-muted-foreground">
              {completedCount} of {stages.length} stages
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-2">
          {stages.map((stage) => {
            const stageInfo = ANALYSIS_STAGES[stage];
            const status = getStageStatus(stage);
            const progress = getStageProgress(stage);
            const isExpanded = expandedStages.has(stage);
            const isCurrent = stage === currentStage;
            const prevComplete = isPreviousStageComplete(stage);

            return (
              <Collapsible
                key={stage}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(stage)}
              >
                <div
                  className={`rounded-lg border-2 transition-colors ${
                    isCurrent ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <CollapsibleTrigger className="w-full">
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                        STATUS_COLORS[status]
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80">
                        {STAGE_ICONS[stage]}
                      </div>

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stageInfo.label}</span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {status === 'blocked' && (
                            <Badge variant="destructive" className="text-xs">
                              Blocked
                            </Badge>
                          )}
                          {!prevComplete && status === 'not_started' && (
                            <Badge variant="outline" className="text-xs">
                              Out of sequence
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {stageInfo.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[status]}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
                      {/* Key Questions */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <h5 className="text-sm font-medium mb-2">Key Questions</h5>
                        <ul className="text-sm space-y-1">
                          {stageInfo.key_questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Stage timing info */}
                      {progress && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {progress.started_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started: {new Date(progress.started_at).toLocaleDateString()}
                            </div>
                          )}
                          {progress.completed_at && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Completed: {new Date(progress.completed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Blockers */}
                      {progress?.blockers && progress.blockers.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-red-800 mb-2">Blockers</h5>
                          <ul className="text-sm text-red-700 space-y-1">
                            {progress.blockers.map((b, i) => (
                              <li key={i}>• {b}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notes */}
                      {progress?.notes && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <h5 className="text-sm font-medium mb-1">Notes</h5>
                          <p className="text-sm">{progress.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {status === 'not_started' && canStartStage(stage) && (
                          <Button
                            size="sm"
                            onClick={() => onStageStart(stage)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start Stage
                          </Button>
                        )}

                        {status === 'in_progress' && (
                          <>
                            <div className="w-full space-y-2">
                              <Textarea
                                placeholder="Completion notes (optional)..."
                                value={completionNotes[stage] || ''}
                                onChange={(e) =>
                                  setCompletionNotes((prev) => ({
                                    ...prev,
                                    [stage]: e.target.value,
                                  }))
                                }
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleComplete(stage)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Complete Stage
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onNavigateToStage(stage)}
                                >
                                  Work on Stage
                                </Button>
                              </div>
                            </div>

                            <div className="w-full space-y-2 mt-2 pt-2 border-t">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Describe blocker..."
                                  className="flex-1 px-3 py-1 text-sm border rounded-md"
                                  value={blockerInput[stage] || ''}
                                  onChange={(e) =>
                                    setBlockerInput((prev) => ({
                                      ...prev,
                                      [stage]: e.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleBlock(stage)}
                                  disabled={!blockerInput[stage]}
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Mark Blocked
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {status === 'blocked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStageStart(stage)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume Stage
                          </Button>
                        )}

                        {status === 'completed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onNavigateToStage(stage)}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
