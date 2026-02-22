'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronRight, Lightbulb, AlertTriangle, TrendingUp, BarChart3, MessageSquare, Loader2 } from 'lucide-react';
import type { WorkspaceStageType, CILInsight } from '@/types/workspace';
import { WORKSPACE_STAGES } from '@/types/workspace';

const INSIGHT_ICONS: Record<CILInsight['type'], React.ElementType> = {
  info: Lightbulb,
  warning: AlertTriangle,
  opportunity: TrendingUp,
  benchmark: BarChart3,
};

const INSIGHT_COLORS: Record<CILInsight['type'], string> = {
  info: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  warning: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  opportunity: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  benchmark: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
};

interface CILPanelProps {
  dealId: string;
  currentStage: WorkspaceStageType;
  insights: CILInsight[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function CILPanel({
  dealId,
  currentStage,
  insights,
  isCollapsed = false,
  onToggle,
}: CILPanelProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);

  const stageConfig = WORKSPACE_STAGES.find(s => s.id === currentStage);
  const stageInsights = insights.filter(i => i.stage === currentStage);

  const handleAskCIL = async () => {
    if (!askQuery.trim()) return;
    setIsAsking(true);
    setAskResponse(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/cil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: currentStage, query: askQuery }),
      });
      const data = await response.json();
      setAskResponse(data.response || 'No response available.');
    } catch {
      setAskResponse('Failed to get CIL response. Try again.');
    } finally {
      setIsAsking(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="flex flex-col items-center gap-2 py-4 px-2 border-l border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
      >
        <Brain className="w-5 h-5 text-primary-500" />
        <span className="text-[10px] font-medium text-surface-500 writing-mode-vertical [writing-mode:vertical-lr] rotate-180">
          CIL Advisor
        </span>
        {stageInsights.length > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center">
            {stageInsights.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="border-l border-surface-200 dark:border-surface-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">CIL Advisor</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-surface-400" />
          </button>
        </div>
        <p className="text-[11px] text-surface-500 mt-1">
          {stageConfig?.cilDomain}
        </p>
      </div>

      {/* Insights list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {stageInsights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
            <p className="text-xs text-surface-500">
              CIL insights will appear as you enter data
            </p>
          </div>
        ) : (
          stageInsights.map(insight => {
            const Icon = INSIGHT_ICONS[insight.type];
            const colorClass = INSIGHT_COLORS[insight.type];
            const isExpanded = expandedInsight === insight.id;

            return (
              <button
                key={insight.id}
                onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                className={cn(
                  'w-full text-left rounded-lg p-3 transition-all',
                  colorClass,
                  isExpanded ? 'ring-1 ring-current/20' : ''
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">{insight.title}</p>
                    {isExpanded && (
                      <div className="mt-2">
                        <p className="text-[11px] opacity-80 leading-relaxed">{insight.content}</p>
                        <p className="text-[10px] opacity-60 mt-1.5">Source: {insight.source}</p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}

        {/* Ask CIL response */}
        {askResponse && (
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-3 mt-2">
            <p className="text-xs text-surface-700 dark:text-surface-300 leading-relaxed">{askResponse}</p>
          </div>
        )}
      </div>

      {/* Ask CIL input */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={askQuery}
            onChange={e => setAskQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskCIL()}
            placeholder="Ask CIL..."
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleAskCIL}
            disabled={isAsking || !askQuery.trim()}
            className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {isAsking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
