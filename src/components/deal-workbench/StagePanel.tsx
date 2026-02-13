'use client';

import Link from 'next/link';
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
  CircleDot,
  Percent,
  Calculator,
  BarChart3,
  Coins,
  Users,
  Shield,
  Award,
  Heart,
  ArrowUpRight,
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

// Stage → relevant tools mapping
const STAGE_TOOLS: Record<string, Array<{ name: string; href: string; icon: typeof Percent }>> = {
  document_understanding: [],
  financial_reconstruction: [
    { name: 'Pro Forma', href: '/app/tools/pro-forma', icon: Calculator },
    { name: 'Debt Service', href: '/app/tools/debt-service', icon: Coins },
  ],
  operating_reality: [
    { name: 'Staffing Calc', href: '/app/tools/staffing-calculator', icon: Users },
    { name: 'CMS Analyzer', href: '/app/tools/cms-analyzer', icon: Award },
  ],
  risk_constraints: [
    { name: 'Survey Tracker', href: '/app/tools/survey-tracker', icon: Shield },
    { name: 'Sensitivity', href: '/app/tools/sensitivity', icon: BarChart3 },
  ],
  valuation: [
    { name: 'Cap Rate', href: '/app/tools/cap-rate', icon: Percent },
    { name: 'IRR/NPV', href: '/app/tools/irr-npv', icon: TrendingUp },
    { name: 'Sensitivity', href: '/app/tools/sensitivity', icon: BarChart3 },
  ],
  synthesis: [
    { name: 'Cap Rate', href: '/app/tools/cap-rate', icon: Percent },
    { name: 'Exit Strategy', href: '/app/tools/exit-strategy', icon: ArrowUpRight },
  ],
};

interface StagePanelProps {
  currentStage: string;
  stageProgress: Array<{
    stage: string;
    status: string;
  }>;
  onStageClick: (stage: string) => void;
  documentCount: number;
  riskCount: number;
  dealParams?: string;
}

export function StagePanel({
  currentStage,
  stageProgress,
  onStageClick,
  documentCount,
  riskCount,
  dealParams,
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

  const stageTools = STAGE_TOOLS[currentStage] || [];

  return (
    <div className="w-60 flex-shrink-0 flex flex-col h-full">
      {/* Stage List */}
      <div className="flex-1 space-y-1 py-3 overflow-y-auto">
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

        {/* Contextual Quick Tools */}
        {stageTools.length > 0 && (
          <div className="pt-3 mt-2 border-t border-surface-800/50 px-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-surface-500 mb-1">Quick Tools</p>
            {stageTools.map((tool) => {
              const Icon = tool.icon;
              const href = dealParams ? `${tool.href}?${dealParams}` : tool.href;
              return (
                <Link
                  key={tool.href + tool.name}
                  href={href}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-surface-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 text-surface-500 group-hover:text-primary-400" />
                  <span>{tool.name}</span>
                  <ArrowUpRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}
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
