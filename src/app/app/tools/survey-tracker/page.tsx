'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, FileText, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deficiency {
  id: string;
  date: string;
  tag: string;
  scope: 'isolated' | 'pattern' | 'widespread';
  severity: 'no_harm' | 'minimal_harm' | 'actual_harm' | 'immediate_jeopardy';
  description: string;
  corrected: boolean;
}

export default function SurveyTrackerPage() {
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([
    {
      id: '1',
      date: '2024-06-15',
      tag: 'F880',
      scope: 'isolated',
      severity: 'no_harm',
      description: 'Infection prevention and control - hand hygiene compliance',
      corrected: true,
    },
    {
      id: '2',
      date: '2024-06-15',
      tag: 'F684',
      scope: 'pattern',
      severity: 'minimal_harm',
      description: 'Quality of care - adequate supervision',
      corrected: true,
    },
    {
      id: '3',
      date: '2024-01-10',
      tag: 'F689',
      scope: 'isolated',
      severity: 'actual_harm',
      description: 'Free from accident hazards - fall prevention',
      corrected: true,
    },
    {
      id: '4',
      date: '2023-07-22',
      tag: 'F812',
      scope: 'pattern',
      severity: 'no_harm',
      description: 'Food procurement, store, prepare, and serve',
      corrected: true,
    },
    {
      id: '5',
      date: '2023-07-22',
      tag: 'F758',
      scope: 'isolated',
      severity: 'minimal_harm',
      description: 'Free from unnecessary psychotropic meds',
      corrected: true,
    },
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'immediate_jeopardy': return 'bg-red-500 text-white';
      case 'actual_harm': return 'bg-orange-500 text-white';
      case 'minimal_harm': return 'bg-yellow-500 text-black';
      case 'no_harm': return 'bg-green-500 text-white';
      default: return 'bg-surface-500 text-white';
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'widespread': return 'text-red-600';
      case 'pattern': return 'text-amber-600';
      case 'isolated': return 'text-green-600';
      default: return 'text-surface-600';
    }
  };

  // Group by survey date
  const surveyGroups = useMemo(() => {
    const groups: Record<string, Deficiency[]> = {};
    deficiencies.forEach((d) => {
      if (!groups[d.date]) groups[d.date] = [];
      groups[d.date].push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [deficiencies]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = deficiencies.length;
    const byScope = {
      isolated: deficiencies.filter((d) => d.scope === 'isolated').length,
      pattern: deficiencies.filter((d) => d.scope === 'pattern').length,
      widespread: deficiencies.filter((d) => d.scope === 'widespread').length,
    };
    const bySeverity = {
      no_harm: deficiencies.filter((d) => d.severity === 'no_harm').length,
      minimal_harm: deficiencies.filter((d) => d.severity === 'minimal_harm').length,
      actual_harm: deficiencies.filter((d) => d.severity === 'actual_harm').length,
      immediate_jeopardy: deficiencies.filter((d) => d.severity === 'immediate_jeopardy').length,
    };
    const correctionRate = (deficiencies.filter((d) => d.corrected).length / total) * 100;
    return { total, byScope, bySeverity, correctionRate };
  }, [deficiencies]);

  // Risk score calculation
  const riskScore = useMemo(() => {
    let score = 0;
    deficiencies.forEach((d) => {
      const severityWeight = { no_harm: 1, minimal_harm: 2, actual_harm: 4, immediate_jeopardy: 8 };
      const scopeMultiplier = { isolated: 1, pattern: 1.5, widespread: 2 };
      score += severityWeight[d.severity] * scopeMultiplier[d.scope];
    });
    return score;
  }, [deficiencies]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Survey Deficiency Tracker</h1>
          <p className="text-sm text-surface-500">Track and analyze survey results and compliance trends</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="neu-card p-4">
          <div className="text-xs text-surface-500 mb-1">Total Deficiencies</div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-surface-500 mt-1">Last 3 surveys</div>
        </div>
        <div className="neu-card p-4">
          <div className="text-xs text-surface-500 mb-1">Risk Score</div>
          <div className={cn(
            'text-2xl font-bold',
            riskScore < 10 ? 'text-green-600' : riskScore < 20 ? 'text-amber-600' : 'text-red-600'
          )}>
            {riskScore}
          </div>
          <div className="text-xs text-surface-500 mt-1">
            {riskScore < 10 ? 'Low Risk' : riskScore < 20 ? 'Medium Risk' : 'High Risk'}
          </div>
        </div>
        <div className="neu-card p-4">
          <div className="text-xs text-surface-500 mb-1">Correction Rate</div>
          <div className="text-2xl font-bold text-green-600">{stats.correctionRate.toFixed(0)}%</div>
          <div className="text-xs text-surface-500 mt-1">All corrected on time</div>
        </div>
        <div className="neu-card p-4">
          <div className="text-xs text-surface-500 mb-1">Severe Issues</div>
          <div className={cn(
            'text-2xl font-bold',
            stats.bySeverity.actual_harm + stats.bySeverity.immediate_jeopardy > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {stats.bySeverity.actual_harm + stats.bySeverity.immediate_jeopardy}
          </div>
          <div className="text-xs text-surface-500 mt-1">Actual harm or IJ</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Survey History */}
        <div className="lg:col-span-2 space-y-4">
          {surveyGroups.map(([date, defs]) => (
            <div key={date} className="neu-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span className="font-semibold">Survey: {new Date(date).toLocaleDateString()}</span>
                <span className="text-xs bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                  {defs.length} deficiencies
                </span>
              </div>
              <div className="space-y-2">
                {defs.map((def) => (
                  <div key={def.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
                    <div className={cn('px-2 py-1 rounded text-xs font-bold', getSeverityColor(def.severity))}>
                      {def.tag}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{def.description}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={cn('font-medium', getScopeColor(def.scope))}>
                          {def.scope.charAt(0).toUpperCase() + def.scope.slice(1)}
                        </span>
                        <span className="text-surface-500">•</span>
                        <span className="text-surface-500">
                          {def.severity.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                    {def.corrected ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Scope Breakdown */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Scope Distribution</h3>
            <div className="space-y-2">
              {Object.entries(stats.byScope).map(([scope, count]) => (
                <div key={scope} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', scope === 'isolated' ? 'bg-green-500' : scope === 'pattern' ? 'bg-amber-500' : 'bg-red-500')} />
                  <span className="flex-1 text-sm capitalize">{scope}</span>
                  <span className="font-medium">{count}</span>
                  <span className="text-xs text-surface-500">({((count / stats.total) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Severity Distribution</h3>
            <div className="space-y-2">
              {[
                { key: 'no_harm', label: 'No Harm', color: 'bg-green-500' },
                { key: 'minimal_harm', label: 'Minimal Harm', color: 'bg-yellow-500' },
                { key: 'actual_harm', label: 'Actual Harm', color: 'bg-orange-500' },
                { key: 'immediate_jeopardy', label: 'Immediate Jeopardy', color: 'bg-red-500' },
              ].map((sev) => (
                <div key={sev.key} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', sev.color)} />
                  <span className="flex-1 text-sm">{sev.label}</span>
                  <span className="font-medium">{stats.bySeverity[sev.key as keyof typeof stats.bySeverity]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Risk Assessment</h3>
            <div className={cn(
              'p-3 rounded-lg text-sm',
              riskScore < 10
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : riskScore < 20
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            )}>
              {riskScore < 10 ? (
                <>
                  <div className="font-semibold mb-1">Low Survey Risk</div>
                  <div>Facility has a good compliance track record with mostly isolated, low-severity findings.</div>
                </>
              ) : riskScore < 20 ? (
                <>
                  <div className="font-semibold mb-1">Moderate Survey Risk</div>
                  <div>Some pattern deficiencies or higher severity findings warrant attention during due diligence.</div>
                </>
              ) : (
                <>
                  <div className="font-semibold mb-1">Elevated Survey Risk</div>
                  <div>Significant compliance concerns that could impact operations and reimbursement.</div>
                </>
              )}
            </div>
          </div>

          {/* Common Tags */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Common F-Tags</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(deficiencies.map((d) => d.tag))).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
