'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Clock,
  Loader2,
  FileText,
  Edit3,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  User,
  Shield,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  stage: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface AuditLogProps {
  dealId: string;
  stage?: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Edit3; color: string; label: string }> = {
  stage_data_updated: { icon: Edit3, color: 'text-blue-500', label: 'Data Updated' },
  stage_completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Stage Completed' },
  stage_started: { icon: Plus, color: 'text-primary-500', label: 'Stage Started' },
  comment_added: { icon: FileText, color: 'text-purple-500', label: 'Comment' },
  risk_calculated: { icon: Shield, color: 'text-amber-500', label: 'Risk Calculated' },
  memo_generated: { icon: FileText, color: 'text-teal-500', label: 'Memo Generated' },
  document_uploaded: { icon: Plus, color: 'text-blue-500', label: 'Document' },
  cms_data_refreshed: { icon: ArrowRight, color: 'text-green-500', label: 'CMS Refresh' },
  rating_change: { icon: AlertTriangle, color: 'text-amber-500', label: 'Rating Change' },
  sff_change: { icon: AlertTriangle, color: 'text-red-500', label: 'SFF Change' },
};

export function AuditLog({ dealId, stage }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'changes' | 'stage'>('all');

  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stage && filter === 'stage') params.set('stage', stage);
      if (filter === 'changes') params.set('type', 'stage_data_updated');
      params.set('limit', '50');

      const res = await fetch(`/api/deals/${dealId}/activities?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data?.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setLoading(false);
    }
  }, [dealId, stage, filter]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-surface-400" />
          Activity Log
        </h3>
        <div className="flex items-center gap-1">
          {(['all', 'changes', 'stage'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                filter === f
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
              )}
            >
              {f === 'all' ? 'All' : f === 'changes' ? 'Changes' : 'This Stage'}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-6 h-6 text-surface-300 mx-auto mb-2" />
          <p className="text-xs text-surface-400">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map(entry => {
            const config = TYPE_CONFIG[entry.type] || { icon: FileText, color: 'text-surface-500', label: entry.type };
            const Icon = config.icon;
            const isExpanded = expandedId === entry.id;

            return (
              <div key={entry.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors text-left"
                >
                  <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-700 dark:text-surface-300 truncate">
                      {entry.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-surface-400 flex-shrink-0">{relativeTime(entry.createdAt)}</span>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <ChevronDown className={cn('w-3 h-3 text-surface-400 transition-transform', isExpanded && 'rotate-180')} />
                  )}
                </button>

                {isExpanded && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div className="ml-9 mr-3 mb-2 px-3 py-2 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                    <div className="space-y-1">
                      {Object.entries(entry.metadata).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-[10px]">
                          <span className="text-surface-400 font-mono">{key}:</span>
                          <span className="text-surface-600 dark:text-surface-400 truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {entry.createdBy && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-surface-100 dark:border-surface-700">
                        <User className="w-3 h-3 text-surface-400" />
                        <span className="text-[10px] text-surface-400">{entry.createdBy}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
