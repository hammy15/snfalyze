'use client';

import { cn } from '@/lib/utils';
import {
  FileText,
  DollarSign,
  Building2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Check,
  Play,
  Lock,
  CircleDot,
} from 'lucide-react';

interface StageInfo {
  key: string;
  label: string;
  icon: typeof FileText;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

const STAGES: StageInfo[] = [
  { key: 'document_understanding', label: 'Doc Review', icon: FileText, status: 'not_started' },
  { key: 'financial_reconstruction', label: 'Financial', icon: DollarSign, status: 'not_started' },
  { key: 'operating_reality', label: 'Operations', icon: Building2, status: 'not_started' },
  { key: 'risk_constraints', label: 'Risk', icon: AlertTriangle, status: 'not_started' },
  { key: 'valuation', label: 'Valuation', icon: TrendingUp, status: 'not_started' },
  { key: 'synthesis', label: 'Synthesis', icon: Sparkles, status: 'not_started' },
];

interface StagePanelProps {
  currentStage: string;
  stageProgress: Array<{
    stage: string;
    status: string;
  }>;
  onStageClick: (stage: string) => void;
  documentCount: number;
  riskCount: number;
}

export function StagePanel({
  currentStage,
  stageProgress,
  onStageClick,
  documentCount,
  riskCount,
}: StagePanelProps) {
  const getStatus = (key: string): StageInfo['status'] => {
    const progress = stageProgress.find(p => p.stage === key);
    return (progress?.status as StageInfo['status']) || 'not_started';
  };

  const StatusIcon = ({ status }: { status: StageInfo['status'] }) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3 h-3 text-emerald-400" />;
      case 'in_progress':
        return <Play className="w-3 h-3 text-primary-400 fill-primary-400" />;
      case 'blocked':
        return <AlertTriangle className="w-3 h-3 text-rose-400" />;
      default:
        return <CircleDot className="w-3 h-3 text-surface-600" />;
    }
  };

  const statusColors: Record<string, string> = {
    completed: 'border-emerald-500/30 bg-emerald-500/5',
    in_progress: 'border-primary-500/30 bg-primary-500/5',
    blocked: 'border-rose-500/30 bg-rose-500/5',
    not_started: 'border-surface-700/50 bg-surface-800/30',
  };

  return (
    <div className="w-60 flex-shrink-0 flex flex-col h-full">
      {/* Stage List */}
      <div className="flex-1 space-y-1 py-3">
        <p className="text-[10px] uppercase tracking-wider text-surface-500 px-3 mb-2">Analysis Stages</p>
        {STAGES.map((stage) => {
          const status = getStatus(stage.key);
          const isActive = currentStage === stage.key;
          const Icon = stage.icon;

          return (
            <button
              key={stage.key}
              onClick={() => onStageClick(stage.key)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left group',
                isActive
                  ? 'bg-primary-500/10 border border-primary-500/30 text-primary-300'
                  : cn('border', statusColors[status], 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50')
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                isActive ? 'bg-primary-500/20' : 'bg-surface-800'
              )}>
                <StatusIcon status={status} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium block truncate">{stage.label}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0 animate-pulse-soft" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="border-t border-surface-800 px-3 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-500">Documents</span>
          <span className="text-surface-300 font-medium">{documentCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-500">Risks Flagged</span>
          <span className={cn(
            'font-medium',
            riskCount > 0 ? 'text-amber-400' : 'text-surface-300'
          )}>{riskCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-500">Completion</span>
          <span className="text-primary-400 font-medium">
            {Math.round((stageProgress.filter(s => s.status === 'completed').length / 6) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
