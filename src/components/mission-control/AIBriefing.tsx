'use client';

import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  FileWarning,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface AttentionItem {
  type: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  dealId?: string;
}

interface AIBriefingProps {
  greeting: string;
  userName: string;
  attentionItems: AttentionItem[];
}

const SEVERITY_STYLES = {
  high: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
  medium: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  low: 'border-surface-600 bg-surface-800/50 text-surface-300',
};

const SEVERITY_ICONS = {
  high: AlertTriangle,
  medium: Clock,
  low: FileWarning,
};

export function AIBriefing({ greeting, userName, attentionItems }: AIBriefingProps) {
  return (
    <div className="space-y-4">
      {/* AI Greeting */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-glow-primary">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-surface-100">
            {greeting}, {userName}.
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {attentionItems.length > 0
              ? `${attentionItems.length} thing${attentionItems.length > 1 ? 's' : ''} need${attentionItems.length === 1 ? 's' : ''} your attention.`
              : 'Everything looks good. Your pipeline is on track.'
            }
          </p>
        </div>
      </div>

      {/* Attention Cards */}
      {attentionItems.length > 0 && (
        <div className="space-y-2 pl-14">
          {attentionItems.map((item, index) => {
            const Icon = SEVERITY_ICONS[item.severity];
            return (
              <Link
                key={index}
                href={item.dealId ? `/app/deals/${item.dealId}` : '/app/deals'}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.01]',
                  SEVERITY_STYLES[item.severity],
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs opacity-70">{item.detail}</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
