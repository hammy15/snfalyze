'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain, Upload, Clock, CheckCircle2, AlertCircle, Building2,
  ChevronRight, Loader2, Trash2, FileSpreadsheet, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistoricalDealUpload } from '@/components/learning/HistoricalDealUpload';
import { PreferencesPanel } from '@/components/learning/PreferencesPanel';

type TabId = 'deals' | 'preferences' | 'upload';

interface HistoricalDeal {
  id: string;
  name: string;
  assetType: string;
  primaryState: string | null;
  status: string;
  beds: number | null;
  facilityCount: number | null;
  askingPrice: string | null;
  finalPrice: string | null;
  dealDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  uploading: { icon: Upload, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'Uploading' },
  extracting: { icon: Loader2, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: 'Extracting' },
  comparing: { icon: BarChart3, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', label: 'Comparing' },
  learning: { icon: Brain, color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20', label: 'Learning' },
  complete: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'Complete' },
  error: { icon: AlertCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'Error' },
};

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  const num = Number(value);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<TabId>('deals');
  const [deals, setDeals] = useState<HistoricalDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/learning/deals');
      const data = await res.json();
      if (data.success) setDeals(data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/learning/deals/${id}`, { method: 'DELETE' });
      setDeals(prev => prev.filter(d => d.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const handleUploadComplete = (dealId: string) => {
    setActiveTab('deals');
    fetchDeals();
  };

  const completedCount = deals.filter(d => d.status === 'complete').length;
  const totalBeds = deals.reduce((sum, d) => sum + (d.beds || 0), 0);

  const tabs: { id: TabId; label: string; icon: typeof Brain }[] = [
    { id: 'deals', label: 'Historical Deals', icon: FileSpreadsheet },
    { id: 'preferences', label: 'Learned Preferences', icon: Brain },
    { id: 'upload', label: 'Upload New Deal', icon: Upload },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Deal Learning</h1>
          <p className="text-sm text-surface-500">
            {completedCount} completed deal{completedCount !== 1 ? 's' : ''} analyzed
            {totalBeds > 0 && ` · ${totalBeds.toLocaleString()} total beds`}
          </p>
        </div>
        <button
          onClick={() => setActiveTab('upload')}
          className="neu-button-primary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Deal
        </button>
      </div>

      {/* Stats Row */}
      {deals.length > 0 && (
        <div className="neu-card p-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary-500" />
              <span className="text-lg font-bold text-surface-900 dark:text-white">{deals.length}</span>
              <span className="text-xs text-surface-500">Total Deals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-lg font-bold text-surface-900 dark:text-white">{completedCount}</span>
              <span className="text-xs text-surface-500">Processed</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-lg font-bold text-surface-900 dark:text-white">{totalBeds.toLocaleString()}</span>
              <span className="text-xs text-surface-500">Total Beds</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-lg font-bold text-surface-900 dark:text-white">
                {completedCount >= 5 ? 'High' : completedCount >= 2 ? 'Medium' : 'Low'}
              </span>
              <span className="text-xs text-surface-500">Confidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex h-10 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800 p-1 text-surface-500 w-full">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 shadow-sm'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'deals' && (
        <div className="space-y-3">
          {loading ? (
            <div className="neu-card p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
              <p className="text-sm text-surface-500">Loading historical deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="neu-card p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6 text-surface-400" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white mb-1">No Historical Deals</h3>
              <p className="text-sm text-surface-500 mb-4">
                Upload your first completed deal package to start learning your evaluation patterns
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="neu-button-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5 mx-auto"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Your First Deal
              </button>
            </div>
          ) : (
            deals.map(deal => {
              const statusCfg = STATUS_CONFIG[deal.status] || STATUS_CONFIG.error;
              const StatusIcon = statusCfg.icon;
              return (
                <Link
                  key={deal.id}
                  href={`/app/learning/${deal.id}`}
                  className="block neu-card !p-4 hover:!shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', statusCfg.color)}>
                        <StatusIcon className={cn('w-5 h-5', deal.status === 'extracting' && 'animate-spin')} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800 dark:text-surface-100 truncate">{deal.name}</h3>
                          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 font-medium">
                            {deal.assetType}
                          </span>
                          {deal.primaryState && (
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400">
                              {deal.primaryState}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                          {deal.beds && <span>{deal.beds} beds</span>}
                          {deal.finalPrice && <span>{formatCurrency(deal.finalPrice)}</span>}
                          {deal.dealDate && <span>{formatDate(deal.dealDate)}</span>}
                          <span>Uploaded {formatDate(deal.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        statusCfg.color
                      )}>
                        {statusCfg.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(deal.id);
                        }}
                        disabled={deleting === deal.id}
                        className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deleting === deal.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'preferences' && (
        <PreferencesPanel />
      )}

      {activeTab === 'upload' && (
        <HistoricalDealUpload onComplete={handleUploadComplete} />
      )}
    </div>
  );
}
