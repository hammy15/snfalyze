'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Send,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface AIAdvisorPanelProps {
  dealId: string;
  dealName: string;
  currentStage: string;
  stageLabel: string;
  documentCount: number;
  hasFinancials: boolean;
}

interface AIMessage {
  role: 'assistant' | 'user';
  content: string;
}

export function AIAdvisorPanel({
  dealId,
  dealName,
  currentStage,
  stageLabel,
  documentCount,
  hasFinancials,
}: AIAdvisorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate contextual insights based on stage
  const getInsights = () => {
    const insights: Array<{ icon: typeof Sparkles; text: string; type: 'tip' | 'warning' | 'action' }> = [];

    if (documentCount === 0) {
      insights.push({
        icon: AlertTriangle,
        text: 'No documents uploaded yet. Upload broker packages to begin analysis.',
        type: 'warning',
      });
    }

    switch (currentStage) {
      case 'document_understanding':
        insights.push({
          icon: Lightbulb,
          text: 'Review all uploaded documents for completeness. Look for P&Ls, census reports, and survey history.',
          type: 'tip',
        });
        if (documentCount > 0) {
          insights.push({
            icon: TrendingUp,
            text: `${documentCount} document${documentCount > 1 ? 's' : ''} available for review. AI extraction confidence will improve with more documents.`,
            type: 'action',
          });
        }
        break;
      case 'financial_reconstruction':
        insights.push({
          icon: Lightbulb,
          text: 'Normalize T12 financials to identify true operating performance. Look for add-backs and one-time expenses.',
          type: 'tip',
        });
        if (!hasFinancials) {
          insights.push({
            icon: AlertTriangle,
            text: 'No financial documents detected. Upload P&L statements to proceed.',
            type: 'warning',
          });
        }
        break;
      case 'operating_reality':
        insights.push({
          icon: Lightbulb,
          text: 'Assess census trends, payer mix, and staffing patterns. Check CMS ratings for quality signals.',
          type: 'tip',
        });
        break;
      case 'risk_constraints':
        insights.push({
          icon: AlertTriangle,
          text: 'Identify regulatory risks, operational red flags, and financial constraints that could block the deal.',
          type: 'warning',
        });
        break;
      case 'valuation':
        insights.push({
          icon: TrendingUp,
          text: 'SNF cap rates: 12.0-12.5% nationally. Apply risk adjustments based on identified factors.',
          type: 'tip',
        });
        break;
      case 'synthesis':
        insights.push({
          icon: Sparkles,
          text: 'Compile all findings into a final recommendation. Consider both lender and Cascadia execution views.',
          type: 'tip',
        });
        break;
    }

    return insights;
  };

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: AIMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          message: query,
          context: { stage: currentStage, documentCount },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response || data.message || 'I can help with your deal analysis. What would you like to know?',
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I'm analyzing "${dealName}" at the ${stageLabel} stage. Ask me about financials, risks, valuation, or next steps.`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm ready to help with "${dealName}". Ask about cap rates, risk factors, or valuation approaches.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const insights = getInsights();

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-12 flex-shrink-0 flex flex-col items-center py-4 bg-surface-900/50 border-l border-surface-800/50 hover:bg-surface-800/50 transition-colors gap-2"
      >
        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-400" />
        </div>
        <ChevronLeft className="w-4 h-4 text-surface-500" />
        <span className="text-[10px] text-surface-500 [writing-mode:vertical-lr] mt-2">AI Advisor</span>
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-surface-800/50 bg-surface-900/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <span className="text-xs font-medium text-surface-200">AI Advisor</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-surface-500 hover:text-surface-300 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Insights */}
      <div className="px-3 py-3 space-y-2 border-b border-surface-800/50">
        <p className="text-[10px] uppercase tracking-wider text-surface-500">
          {stageLabel} Insights
        </p>
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg text-xs',
                insight.type === 'warning' && 'bg-amber-500/5 border border-amber-500/20 text-amber-300',
                insight.type === 'tip' && 'bg-primary-500/5 border border-primary-500/20 text-primary-300',
                insight.type === 'action' && 'bg-blue-500/5 border border-blue-500/20 text-blue-300',
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-surface-700 mx-auto mb-2" />
            <p className="text-xs text-surface-500">Ask me anything about this deal</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              'text-xs leading-relaxed px-3 py-2 rounded-lg',
              msg.role === 'user'
                ? 'bg-primary-500/10 text-primary-200 ml-4'
                : 'bg-surface-800/50 text-surface-300 mr-4'
            )}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-surface-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-surface-800/50">
        <div className="flex items-center gap-2 bg-surface-800/50 rounded-lg px-3 py-2 border border-surface-700/50 focus-within:border-primary-500/30">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this deal..."
            className="flex-1 bg-transparent text-xs text-surface-200 placeholder:text-surface-600 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!query.trim() || loading}
            className="w-6 h-6 rounded flex items-center justify-center text-primary-400 hover:bg-primary-500/10 disabled:opacity-30 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
