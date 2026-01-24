'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip } from '@/components/ui/tooltip';
import {
  FileText,
  Calculator,
  Activity,
  AlertTriangle,
  DollarSign,
  Scale,
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Lightbulb,
  AlertCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AnalysisStage, ANALYSIS_STAGES } from '@/lib/deals/types';
import { STAGE_GUIDES, type StageTask, type StageTool } from './types';

interface StageWalkthroughProps {
  dealId: string;
  currentStage: AnalysisStage;
  completedTasks: Record<string, boolean>;
  onTaskComplete: (taskId: string, completed: boolean) => void;
  onStageComplete: (stage: AnalysisStage) => void;
  onNavigateToStage: (stage: AnalysisStage) => void;
  onToolAction: (tool: StageTool) => void;
  // Context data for warnings
  documentCount?: number;
  hasFinancials?: boolean;
  hasCensusData?: boolean;
  agencyPercentage?: number;
  isSff?: boolean;
  occupancyTrend?: 'up' | 'down' | 'stable';
  coverageRatio?: number;
  unmappedItemCount?: number;
}

const STAGE_ICONS: Record<AnalysisStage, React.ReactNode> = {
  document_understanding: <FileText className="h-5 w-5" />,
  financial_reconstruction: <Calculator className="h-5 w-5" />,
  operating_reality: <Activity className="h-5 w-5" />,
  risk_constraints: <AlertTriangle className="h-5 w-5" />,
  valuation: <DollarSign className="h-5 w-5" />,
  synthesis: <Scale className="h-5 w-5" />,
};

const TOOL_LABELS: Record<StageTool, string> = {
  view_documents: 'View Documents',
  extract_financials: 'Extract Data',
  verify_facilities: 'Verify Facilities',
  map_coa: 'Map COA',
  review_census: 'Review Census',
  review_ppd: 'Review PPD',
  review_pl: 'Review P&L',
  sync_cms: 'Sync CMS',
  review_survey: 'Review Survey',
  add_risk: 'Add Risk',
  run_valuation: 'Run Valuation',
  review_proforma: 'Review Pro Forma',
  generate_synthesis: 'Generate Summary',
  export_report: 'Export Report',
};

export function StageWalkthrough({
  dealId,
  currentStage,
  completedTasks,
  onTaskComplete,
  onStageComplete,
  onNavigateToStage,
  onToolAction,
  documentCount = 0,
  hasFinancials = false,
  hasCensusData = false,
  agencyPercentage = 0,
  isSff = false,
  occupancyTrend = 'stable',
  coverageRatio = 0,
  unmappedItemCount = 0,
}: StageWalkthroughProps) {
  const stages = Object.keys(ANALYSIS_STAGES) as AnalysisStage[];
  const currentStageIndex = stages.indexOf(currentStage);
  const guide = STAGE_GUIDES[currentStage];

  // Calculate task completion for current stage
  const taskCompletion = guide.tasks.map((task) => ({
    ...task,
    isCompleted: completedTasks[task.id] || false,
  }));

  const completedCount = taskCompletion.filter((t) => t.isCompleted).length;
  const requiredCount = taskCompletion.filter((t) => t.isRequired).length;
  const requiredCompleted = taskCompletion.filter((t) => t.isRequired && t.isCompleted).length;
  const progressPercent = guide.tasks.length > 0 ? Math.round((completedCount / guide.tasks.length) * 100) : 0;
  const canComplete = requiredCompleted >= requiredCount;

  // Check for warnings
  const activeWarnings = guide.warningConditions?.filter((w) => {
    switch (w.condition) {
      case 'no_documents':
        return documentCount === 0;
      case 'no_financials':
        return !hasFinancials;
      case 'unmapped_items':
        return unmappedItemCount > 0;
      case 'missing_census':
        return !hasCensusData;
      case 'high_agency':
        return agencyPercentage > 20;
      case 'sff_status':
        return isSff;
      case 'declining_occupancy':
        return occupancyTrend === 'down';
      case 'low_coverage':
        return coverageRatio > 0 && coverageRatio < 1.4;
      default:
        return false;
    }
  }) || [];

  const handlePrevious = () => {
    if (currentStageIndex > 0) {
      onNavigateToStage(stages[currentStageIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentStageIndex < stages.length - 1) {
      onNavigateToStage(stages[currentStageIndex + 1]);
    }
  };

  const handleCompleteStage = () => {
    onStageComplete(currentStage);
    // Auto-advance to next stage
    if (currentStageIndex < stages.length - 1) {
      onNavigateToStage(stages[currentStageIndex + 1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stage Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {stages.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const stageInfo = ANALYSIS_STAGES[stage];

              return (
                <div key={stage} className="flex items-center">
                  <Tooltip
                    content={
                      <div>
                        <p className="font-medium">{stageInfo.label}</p>
                        <p className="text-xs opacity-80">{stageInfo.description}</p>
                      </div>
                    }
                    position="bottom"
                  >
                    <button
                      onClick={() => onNavigateToStage(stage)}
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                        isCompleted && 'bg-green-500 border-green-500 text-white',
                        isCurrent && 'bg-primary border-primary text-white',
                        !isCompleted && !isCurrent && 'bg-gray-100 border-gray-300 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </button>
                  </Tooltip>
                  {index < stages.length - 1 && (
                    <div
                      className={cn(
                        'w-12 h-1 mx-2',
                        index < currentStageIndex ? 'bg-green-500' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Stage Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {STAGE_ICONS[currentStage]}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{guide.title}</h2>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{guide.estimatedTime}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {activeWarnings.length > 0 && (
        <div className="space-y-2">
          {activeWarnings.map((warning, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                warning.severity === 'error' && 'bg-red-50 text-red-800 border border-red-200',
                warning.severity === 'warning' && 'bg-amber-50 text-amber-800 border border-amber-200',
                warning.severity === 'info' && 'bg-blue-50 text-blue-800 border border-blue-200'
              )}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tasks</CardTitle>
                <CardDescription>
                  {completedCount} of {guide.tasks.length} completed
                  {requiredCount > 0 && ` (${requiredCompleted}/${requiredCount} required)`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{progressPercent}%</div>
                <Progress value={progressPercent} className="w-24 h-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskCompletion.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    task.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Checkbox
                    id={task.id}
                    checked={task.isCompleted}
                    onCheckedChange={(checked) => onTaskComplete(task.id, !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={task.id}
                      className={cn(
                        'text-sm font-medium cursor-pointer',
                        task.isCompleted && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.label}
                      {task.isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                  {task.tool && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToolAction(task.tool!)}
                      className="flex-shrink-0"
                    >
                      {TOOL_LABELS[task.tool]}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips & Help */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {ANALYSIS_STAGES[currentStage].key_questions.map((q, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Next Stage Preview */}
          {guide.nextStagePreview && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                  <span>{guide.nextStagePreview}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Stage
            </Button>

            <div className="flex items-center gap-3">
              {!canComplete && (
                <span className="text-sm text-muted-foreground">
                  Complete required tasks to proceed
                </span>
              )}
              <Button
                onClick={handleCompleteStage}
                disabled={!canComplete}
              >
                <Check className="h-4 w-4 mr-1" />
                Complete & Continue
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentStageIndex === stages.length - 1}
            >
              Skip to Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StageWalkthrough;
