'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Loader2,
  Download,
  Building2,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clipboard,
} from 'lucide-react';

interface FacilityProfile {
  ccn: string;
  providerName: string;
  city: string;
  state: string;
  numberOfBeds: number | null;
  overallRating: number | null;
  healthInspectionRating: number | null;
  staffingRating: number | null;
  qualityMeasureRating: number | null;
  isSff: boolean;
  isSffCandidate: boolean;
  ownershipType: string;
  totalDeficiencies: number | null;
  finesTotal: number | null;
  abuseIcon: boolean;
  status: 'loaded' | 'not_found' | 'error';
  error?: string;
}

export default function BulkCCNPage() {
  const [ccnInput, setCcnInput] = useState('');
  const [results, setResults] = useState<FacilityProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseCCNs = (input: string): string[] => {
    return input
      .split(/[\n,;\s]+/)
      .map(s => s.trim().replace(/\D/g, ''))
      .filter(s => s.length >= 5 && s.length <= 10)
      .map(s => s.padStart(6, '0'));
  };

  const handleLookup = async () => {
    const ccns = [...new Set(parseCCNs(ccnInput))]; // Deduplicate
    if (ccns.length === 0) return;

    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: ccns.length });

    const newResults: FacilityProfile[] = [];

    for (let i = 0; i < ccns.length; i++) {
      const ccn = ccns[i];
      setProgress({ current: i + 1, total: ccns.length });

      try {
        const res = await fetch(`/api/cms/provider/${encodeURIComponent(ccn)}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            newResults.push({
              ccn,
              providerName: data.providerName || 'Unknown',
              city: data.city || '',
              state: data.state || '',
              numberOfBeds: data.numberOfBeds || data.certifiedBeds || null,
              overallRating: data.overallRating || null,
              healthInspectionRating: data.healthInspectionRating || null,
              staffingRating: data.staffingRating || null,
              qualityMeasureRating: data.qualityMeasureRating || data.qualityRating || null,
              isSff: data.isSff || false,
              isSffCandidate: data.isSffCandidate || false,
              ownershipType: data.ownershipType || '',
              totalDeficiencies: data.totalDeficiencies || null,
              finesTotal: data.finesTotal || null,
              abuseIcon: data.abuseIcon || false,
              status: 'loaded',
            });
          } else {
            newResults.push({ ccn, status: 'not_found' } as FacilityProfile);
          }
        } else {
          newResults.push({ ccn, status: 'not_found' } as FacilityProfile);
        }
      } catch {
        newResults.push({ ccn, status: 'error', error: 'Network error' } as FacilityProfile);
      }

      setResults([...newResults]);

      // Rate limit
      if (i < ccns.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setLoading(false);
  };

  const exportCSV = () => {
    const loaded = results.filter(r => r.status === 'loaded');
    if (loaded.length === 0) return;

    const headers = ['CCN', 'Facility Name', 'City', 'State', 'Beds', 'Overall Rating', 'Health Rating', 'Staffing Rating', 'Quality Rating', 'SFF', 'Ownership', 'Deficiencies', 'Fines'];
    const rows = loaded.map(f => [
      f.ccn,
      `"${f.providerName}"`,
      f.city,
      f.state,
      f.numberOfBeds || '',
      f.overallRating || '',
      f.healthInspectionRating || '',
      f.staffingRating || '',
      f.qualityMeasureRating || '',
      f.isSff ? 'Yes' : 'No',
      `"${f.ownershipType}"`,
      f.totalDeficiencies || '',
      f.finesTotal || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ccn-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loaded = results.filter(r => r.status === 'loaded');
  const totalBeds = loaded.reduce((s, f) => s + (f.numberOfBeds || 0), 0);
  const avgRating = loaded.filter(f => f.overallRating).length > 0
    ? loaded.reduce((s, f) => s + (f.overallRating || 0), 0) / loaded.filter(f => f.overallRating).length
    : 0;
  const sffCount = loaded.filter(f => f.isSff).length;

  const ratingStars = (rating: number | null) => {
    if (!rating) return <span className="text-surface-400">\u2014</span>;
    return (
      <span className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold',
        rating >= 4 ? 'text-emerald-600' : rating >= 3 ? 'text-amber-600' : 'text-red-600'
      )}>
        {rating}<Star className="w-3 h-3" />
      </span>
    );
  };

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary-500" />
          Bulk CCN Profiler
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Paste CCNs from a broker package — get instant portfolio summary
        </p>
      </div>

      {/* Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
              Enter CCNs (one per line, or comma-separated)
            </label>
            <textarea
              value={ccnInput}
              onChange={e => setCcnInput(e.target.value)}
              placeholder={"365001\n365002\n365003\nor: 365001, 365002, 365003"}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-surface-400">
                {parseCCNs(ccnInput).length} CCN{parseCCNs(ccnInput).length !== 1 ? 's' : ''} detected
              </span>
              <button
                onClick={handleLookup}
                disabled={loading || parseCCNs(ccnInput).length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Looking up {progress.current}/{progress.total}</>
                ) : (
                  <><Search className="w-3.5 h-3.5" />Profile All</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {loaded.length > 0 && (
          <div className="lg:col-span-2">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                <p className="text-[10px] text-surface-500 uppercase">Facilities</p>
                <p className="text-2xl font-bold text-surface-800 dark:text-surface-200 mt-1">{loaded.length}</p>
                <p className="text-[10px] text-surface-400">{results.filter(r => r.status === 'not_found').length} not found</p>
              </div>
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                <p className="text-[10px] text-surface-500 uppercase">Total Beds</p>
                <p className="text-2xl font-bold text-surface-800 dark:text-surface-200 mt-1">{totalBeds.toLocaleString()}</p>
                <p className="text-[10px] text-surface-400">{loaded.length > 0 ? Math.round(totalBeds / loaded.length) : 0} avg/facility</p>
              </div>
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                <p className="text-[10px] text-surface-500 uppercase">Avg CMS Rating</p>
                <p className="text-2xl font-bold text-surface-800 dark:text-surface-200 mt-1">{avgRating.toFixed(1)}</p>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={cn('w-3 h-3', n <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-surface-300')} />
                  ))}
                </div>
              </div>
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                <p className="text-[10px] text-surface-500 uppercase">SFF Facilities</p>
                <p className={cn('text-2xl font-bold mt-1', sffCount > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {sffCount}
                </p>
                <p className="text-[10px] text-surface-400">{sffCount > 0 ? 'Review required' : 'None flagged'}</p>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">CCN</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">Facility</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 uppercase">Location</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Beds</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Overall</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Health</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Staff</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">QM</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-surface-500 uppercase">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {results.map(f => (
                  <tr key={f.ccn} className={cn(
                    'hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors',
                    f.status !== 'loaded' && 'opacity-50'
                  )}>
                    <td className="px-3 py-2 font-mono text-xs text-surface-500">{f.ccn}</td>
                    <td className="px-3 py-2 font-medium text-surface-800 dark:text-surface-200">
                      {f.status === 'loaded' ? f.providerName : f.status === 'not_found' ? 'Not Found' : 'Error'}
                    </td>
                    <td className="px-3 py-2 text-surface-500">{f.status === 'loaded' ? `${f.city}, ${f.state}` : '\u2014'}</td>
                    <td className="px-3 py-2 text-center text-surface-700 dark:text-surface-300">{f.numberOfBeds || '\u2014'}</td>
                    <td className="px-3 py-2 text-center">{f.status === 'loaded' ? ratingStars(f.overallRating) : '\u2014'}</td>
                    <td className="px-3 py-2 text-center">{f.status === 'loaded' ? ratingStars(f.healthInspectionRating) : '\u2014'}</td>
                    <td className="px-3 py-2 text-center">{f.status === 'loaded' ? ratingStars(f.staffingRating) : '\u2014'}</td>
                    <td className="px-3 py-2 text-center">{f.status === 'loaded' ? ratingStars(f.qualityMeasureRating) : '\u2014'}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {f.isSff && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded">SFF</span>}
                        {f.isSffCandidate && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded">WATCH</span>}
                        {f.abuseIcon && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded">ABUSE</span>}
                        {!f.isSff && !f.isSffCandidate && !f.abuseIcon && f.status === 'loaded' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
