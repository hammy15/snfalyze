'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronRight, Lightbulb, AlertTriangle, TrendingUp, BarChart3, MessageSquare, Loader2, Send, Trash2, User } from 'lucide-react';
import type { WorkspaceStageType, CILInsight } from '@/types/workspace';
import { WORKSPACE_STAGES } from '@/types/workspace';

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  info: Lightbulb,
  warning: AlertTriangle,
  opportunity: TrendingUp,
  benchmark: BarChart3,
};

const INSIGHT_COLORS: Record<string, string> = {
  info: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  warning: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  opportunity: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  benchmark: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
};

// Normalize AI-generated types to our 4 valid types
function normalizeInsightType(type: string): CILInsight['type'] {
  if (type === 'warning' || type === 'risk' || type === 'red_flag') return 'warning';
  if (type === 'opportunity' || type === 'upside' || type === 'green_flag') return 'opportunity';
  if (type.includes('benchmark') || type.includes('data') || type.includes('price')) return 'benchmark';
  return 'info';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  insights?: CILInsight[];
}

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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stageConfig = WORKSPACE_STAGES.find(s => s.id === currentStage);
  const stageInsights = insights.filter(i => i.stage === currentStage);

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  // Clear chat when stage changes
  useEffect(() => {
    setChatHistory([]);
    setActiveTab('insights');
  }, [currentStage]);

  const handleAskCIL = async () => {
    const query = askQuery.trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMsg]);
    setAskQuery('');
    setIsAsking(true);
    setActiveTab('chat');

    try {
      const response = await fetch(`/api/deals/${dealId}/cil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: currentStage, query }),
      });
      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `cil_${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response available.',
        timestamp: new Date(),
        insights: data.insights,
      };

      setChatHistory(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Failed to get CIL response. Please try again.',
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        <button
          onClick={() => setActiveTab('insights')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors relative',
            activeTab === 'insights'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          Insights
          {stageInsights.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {stageInsights.length}
            </span>
          )}
          {activeTab === 'insights' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors relative',
            activeTab === 'chat'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          Ask CIL
          {chatHistory.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400">
              {chatHistory.filter(m => m.role === 'user').length}
            </span>
          )}
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {activeTab === 'insights' ? (
          /* Insights tab */
          stageInsights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
              <p className="text-xs text-surface-500">
                CIL insights will appear as you enter data
              </p>
            </div>
          ) : (
            stageInsights.map(insight => {
              const normalizedType = normalizeInsightType(insight.type);
              const Icon = INSIGHT_ICONS[normalizedType] || Lightbulb;
              const colorClass = INSIGHT_COLORS[normalizedType] || INSIGHT_COLORS.info;
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
          )
        ) : (
          /* Chat tab */
          <>
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
                <p className="text-xs text-surface-500 mb-1">Ask CIL anything about this deal</p>
                <p className="text-[10px] text-surface-400">
                  e.g., &ldquo;What&apos;s the CON status for this state?&rdquo;
                </p>
              </div>
            ) : (
              <>
                {/* Clear button */}
                <div className="flex justify-end mb-1">
                  <button
                    onClick={() => setChatHistory([])}
                    className="text-[10px] text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>

                {chatHistory.map(msg => (
                  <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2',
                        msg.role === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200'
                      )}
                    >
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.insights && msg.insights.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-surface-200/30 dark:border-surface-700/50 pt-2">
                          {msg.insights.slice(0, 3).map((ins, idx) => {
                            const nType = normalizeInsightType(ins.type);
                            const Icon = INSIGHT_ICONS[nType] || Lightbulb;
                            return (
                              <div key={idx} className="flex items-start gap-1.5">
                                <Icon className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                <p className="text-[10px] opacity-80 leading-tight">{ins.title}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[9px] opacity-40 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3 h-3 text-surface-500" />
                      </div>
                    )}
                  </div>
                ))}

                {isAsking && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <Brain className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="bg-surface-100 dark:bg-surface-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                        <span className="text-[11px] text-surface-500">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Ask CIL input — always visible */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={askQuery}
            onChange={e => setAskQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAskCIL()}
            onFocus={() => chatHistory.length > 0 && setActiveTab('chat')}
            placeholder="Ask CIL about this deal..."
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
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
