'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { AIBriefing } from '@/components/mission-control/AIBriefing';
import { ActiveFocus } from '@/components/mission-control/ActiveFocus';
import { PipelinePulse } from '@/components/mission-control/PipelinePulse';
import { SuggestedActions } from '@/components/mission-control/SuggestedActions';
import { QuickDrop } from '@/components/mission-control/QuickDrop';
import { Sparkles, Loader2 } from 'lucide-react';

interface BriefingData {
  greeting: string;
  attentionItems: Array<{
    type: string;
    title: string;
    detail: string;
    severity: 'high' | 'medium' | 'low';
    dealId?: string;
  }>;
  activeDeal: {
    id: string;
    name: string;
    status: string;
    stage: string;
    askingPrice: number;
    totalBeds: number;
    assetType: string;
    updatedAt: string;
  } | null;
  pipeline: Array<{
    stage: string;
    label: string;
    count: number;
    value: number;
    color: string;
  }>;
  totalDeals: number;
  totalPipelineValue: number;
  totalFacilities: number;
  suggestions: Array<{
    title: string;
    detail: string;
    action: string;
    href: string;
    icon: string;
  }>;
}

export default function MissionControlPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mission-control/briefing')
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-400 animate-pulse-soft" />
          </div>
          <p className="text-xs text-surface-500">Loading your briefing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-surface-500">Unable to load Mission Control.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* [1] AI Briefing */}
      <AIBriefing
        greeting={data.greeting}
        userName={user?.name || 'there'}
        attentionItems={data.attentionItems}
      />

      {/* [2] Active Focus — Last deal worked on */}
      <ActiveFocus deal={data.activeDeal} />

      {/* [3] Pipeline Pulse — Compact bar */}
      <div className="p-4 rounded-2xl bg-surface-900/50 border border-surface-800/50">
        <PipelinePulse
          stages={data.pipeline}
          totalDeals={data.totalDeals}
          totalValue={data.totalPipelineValue}
        />
      </div>

      {/* [4] Suggested Actions */}
      <SuggestedActions suggestions={data.suggestions} />

      {/* [5] Quick Drop */}
      <QuickDrop />
    </div>
  );
}
