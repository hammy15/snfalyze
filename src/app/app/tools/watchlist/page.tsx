'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Eye,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Star,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Shield,
  Building2,
  Loader2,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface WatchlistAlert {
  id: string;
  type: string;
  title: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  severity: string;
  isRead: boolean;
  createdAt: string;
}

interface WatchlistEntry {
  id: string;
  ccn: string;
  facilityName: string | null;
  state: string | null;
  beds: number | null;
  lastKnownRating: number | null;
  lastKnownSff: boolean;
  notes: string | null;
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  alerts: WatchlistAlert[];
  unreadAlertCount: number;
}

interface WatchlistData {
  entries: WatchlistEntry[];
  totalWatched: number;
  totalUnreadAlerts: number;
}

const ALERT_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  rating_change: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Rating Change' },
  sff_added: { icon: Shield, color: 'text-red-600', bg: 'bg-red-50', label: 'SFF Added' },
  sff_removed: { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'SFF Removed' },
  new_deficiency: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Deficiency' },
  ownership_change: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ownership Change' },
  penalty_issued: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', label: 'Penalty' },
  bed_count_change: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Bed Change' },
};

export default function WatchlistPage() {
  const [data, setData] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCCN, setAddingCCN] = useState('');
  const [addingNotes, setAddingNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'alerts' | 'sff'>('all');

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleAdd = async () => {
    if (!addingCCN.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccn: addingCCN.trim(), notes: addingNotes.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setAddingCCN('');
        setAddingNotes('');
        setShowAddForm(false);
        await fetchWatchlist();
      }
    } catch (error) {
      console.error('Failed to add:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
      await fetchWatchlist();
    } catch (error) {
      console.error('Failed to remove:', error);
    }
  };

  const filteredEntries = data?.entries.filter(e => {
    if (filter === 'alerts') return e.unreadAlertCount > 0;
    if (filter === 'sff') return e.lastKnownSff;
    return true;
  }) || [];

  const ratingStars = (rating: number | null) => {
    if (!rating) return <span className="text-surface-400">&mdash;</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className={cn('w-3 h-3', n <= rating ? 'text-amber-400 fill-amber-400' : 'text-surface-300')} />
        ))}
      </div>
    );
  };

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-500" />
            Facility Watchlist
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Monitor facilities for CMS rating changes, SFF status, deficiencies & penalties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWatchlist}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Watch Facility
          </button>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
            <p className="text-[10px] text-surface-500 uppercase">Watching</p>
            <p className="text-2xl font-bold text-surface-800 dark:text-surface-200 mt-1">{data.totalWatched}</p>
            <p className="text-[10px] text-surface-400">active facilities</p>
          </div>
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
            <p className="text-[10px] text-surface-500 uppercase">Unread Alerts</p>
            <p className={cn('text-2xl font-bold mt-1', data.totalUnreadAlerts > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {data.totalUnreadAlerts}
            </p>
            <p className="text-[10px] text-surface-400">{data.totalUnreadAlerts > 0 ? 'need review' : 'all clear'}</p>
          </div>
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
            <p className="text-[10px] text-surface-500 uppercase">SFF Flagged</p>
            <p className={cn('text-2xl font-bold mt-1', data.entries.filter(e => e.lastKnownSff).length > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {data.entries.filter(e => e.lastKnownSff).length}
            </p>
            <p className="text-[10px] text-surface-400">Special Focus</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="border border-primary-200 dark:border-primary-800 rounded-xl p-4 bg-primary-50/50 dark:bg-primary-900/10 mb-6">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Add Facility to Watchlist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-surface-500 mb-1">CCN (Provider Number)</label>
              <input
                type="text"
                value={addingCCN}
                onChange={e => setAddingCCN(e.target.value)}
                placeholder="365001"
                className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={addingNotes}
                onChange={e => setAddingNotes(e.target.value)}
                placeholder="Potential acquisition target..."
                className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={isAdding || !addingCCN.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Add
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddingCCN(''); setAddingNotes(''); }}
                className="px-3 py-2 text-sm text-surface-500 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'alerts', 'sff'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === f
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
            )}
          >
            {f === 'all' && `All (${data?.entries.length || 0})`}
            {f === 'alerts' && `With Alerts (${data?.entries.filter(e => e.unreadAlertCount > 0).length || 0})`}
            {f === 'sff' && `SFF (${data?.entries.filter(e => e.lastKnownSff).length || 0})`}
          </button>
        ))}
      </div>

      {/* Watchlist entries */}
      {filteredEntries.length === 0 ? (
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-12 bg-white dark:bg-surface-900 text-center">
          <BellOff className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">
            {filter === 'all' ? 'No facilities on your watchlist yet.' : 'No facilities match this filter.'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Add your first facility
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={cn(
                'border rounded-xl bg-white dark:bg-surface-900 overflow-hidden transition-colors',
                entry.lastKnownSff
                  ? 'border-red-200 dark:border-red-800'
                  : entry.unreadAlertCount > 0
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-surface-200 dark:border-surface-700'
              )}
            >
              {/* Entry header */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              >
                {expandedEntry === entry.id ? (
                  <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-surface-400 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-surface-500">{entry.ccn}</span>
                    {entry.lastKnownSff && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded">SFF</span>
                    )}
                    {entry.unreadAlertCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded">
                        {entry.unreadAlertCount} alert{entry.unreadAlertCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                    {entry.facilityName || 'Unknown Facility'}
                  </p>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] text-surface-400">State</p>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{entry.state || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-surface-400">Beds</p>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{entry.beds || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-surface-400">CMS Rating</p>
                    {ratingStars(entry.lastKnownRating)}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-surface-400">Last Check</p>
                    <p className="text-xs text-surface-500">
                      {entry.lastCheckedAt ? relativeTime(entry.lastCheckedAt) : 'Never'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(entry.id); }}
                    className="p-1.5 text-surface-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded alerts */}
              {expandedEntry === entry.id && (
                <div className="border-t border-surface-100 dark:border-surface-800 px-4 py-3 bg-surface-50/50 dark:bg-surface-800/20">
                  {entry.notes && (
                    <p className="text-xs text-surface-500 italic mb-3">{entry.notes}</p>
                  )}

                  {entry.alerts.length === 0 ? (
                    <div className="text-center py-4">
                      <Bell className="w-5 h-5 text-surface-300 mx-auto mb-1" />
                      <p className="text-xs text-surface-400">No alerts yet — we&apos;ll notify you when something changes</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase">Recent Alerts</p>
                      {entry.alerts.map(alert => {
                        const config = ALERT_CONFIG[alert.type] || { icon: Bell, color: 'text-surface-600', bg: 'bg-surface-50', label: alert.type };
                        const Icon = config.icon;
                        return (
                          <div
                            key={alert.id}
                            className={cn(
                              'flex items-start gap-3 p-2.5 rounded-lg border transition-colors',
                              alert.isRead
                                ? 'border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900'
                                : 'border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10'
                            )}
                          >
                            <div className={cn('p-1.5 rounded-md', config.bg)}>
                              <Icon className={cn('w-3.5 h-3.5', config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn('text-[9px] font-bold uppercase', config.color)}>{config.label}</span>
                                {!alert.isRead && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                              </div>
                              <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{alert.title}</p>
                              {alert.description && (
                                <p className="text-xs text-surface-500 mt-0.5">{alert.description}</p>
                              )}
                              {alert.previousValue && alert.newValue && (
                                <div className="flex items-center gap-2 mt-1.5 text-xs">
                                  <span className="text-surface-400 line-through">{alert.previousValue}</span>
                                  <span className="text-surface-400">&rarr;</span>
                                  <span className="font-medium text-surface-700 dark:text-surface-300">{alert.newValue}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-surface-400 flex-shrink-0">{relativeTime(alert.createdAt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center gap-2">
                    <a
                      href={`/app/facilities?ccn=${entry.ccn}`}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Facility Profile
                    </a>
                    <span className="text-surface-300">|</span>
                    <a
                      href={`/app/tools/bulk-ccn?ccn=${entry.ccn}`}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CMS Profile
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
