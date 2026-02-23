'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import {
  Map as MapIcon,
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Filter,
  Loader2,
  Star,
  ChevronDown,
  BarChart3,
  Target,
} from 'lucide-react';
import type { MapFacility } from '@/components/map/facility-map';

// Dynamic import — Leaflet needs browser
const FacilityMap = dynamic(
  () => import('@/components/map/facility-map').then(m => ({ default: m.FacilityMap })),
  { ssr: false, loading: () => <div className="h-[500px] bg-surface-100 dark:bg-surface-800 animate-pulse rounded-xl" /> }
);

interface MarketStats {
  state: string;
  totalFacilities: number;
  avgRating: number;
  medianBeds: number;
  sffCount: number;
  activeDealCount: number;
  avgPricePerBed: number | null;
  medicaidRate: number | null;
  conState: boolean;
}

// Cascadia target states
const TARGET_STATES = ['OH', 'ID', 'WA', 'OR', 'MT', 'UT', 'NV', 'AZ'];

// CON states (Certificate of Need)
const CON_STATES = ['AK', 'AL', 'AR', 'CT', 'DC', 'DE', 'GA', 'HI', 'IA', 'IL', 'KY', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'NE', 'NH', 'NJ', 'NY', 'OH', 'OK', 'OR', 'RI', 'SC', 'TN', 'VA', 'VT', 'WA', 'WI', 'WV'];

export default function MarketMapPage() {
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSNF, setShowSNF] = useState(true);
  const [showALF, setShowALF] = useState(true);
  const [showILF, setShowILF] = useState(false);
  const [showHOSPICE, setShowHOSPICE] = useState(false);
  const [showCascadia, setShowCascadia] = useState(true);
  const [showPotential, setShowPotential] = useState(true);
  const [showDealLabels, setShowDealLabels] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [marketStats, setMarketStats] = useState<MarketStats[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'stats'>('map');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch facilities from deals + facilities
        const [dealsRes, facilityRes] = await Promise.all([
          fetch('/api/deals?limit=200'),
          fetch('/api/facilities?limit=500'),
        ]);

        const mapFacilities: MapFacility[] = [];
        const stateMap = new Map<string, { facilities: number; ratings: number[]; beds: number[]; sff: number; deals: number }>();

        if (dealsRes.ok) {
          const dealsData = await dealsRes.json();
          const deals = dealsData.deals || dealsData.data?.deals || [];
          for (const deal of deals) {
            if (deal.facilities && Array.isArray(deal.facilities)) {
              for (const f of deal.facilities) {
                if (f.latitude && f.longitude) {
                  mapFacilities.push({
                    id: f.id,
                    name: f.name || deal.name,
                    address: f.address || '',
                    city: f.city || '',
                    state: f.state || '',
                    assetType: (f.assetType || deal.assetType || 'SNF').toUpperCase() as MapFacility['assetType'],
                    beds: f.beds || f.certifiedBeds || 0,
                    lat: parseFloat(f.latitude),
                    lng: parseFloat(f.longitude),
                    isCascadia: f.isCascadia || false,
                    cmsRating: f.overallRating || undefined,
                    occupancy: f.occupancy || undefined,
                    dealId: deal.id,
                    dealName: deal.name,
                    askingPrice: deal.askingPrice || undefined,
                  });
                }
              }
            }

            // Aggregate state stats
            const st = deal.state || (deal.facilities?.[0]?.state);
            if (st) {
              const existing = stateMap.get(st) || { facilities: 0, ratings: [], beds: [], sff: 0, deals: 0 };
              existing.deals++;
              stateMap.set(st, existing);
            }
          }
        }

        if (facilityRes.ok) {
          const facilityData = await facilityRes.json();
          const facs = facilityData.facilities || facilityData.data || [];
          for (const f of facs) {
            if (f.latitude && f.longitude && !mapFacilities.find(mf => mf.id === f.id)) {
              mapFacilities.push({
                id: f.id,
                name: f.name || 'Unknown',
                address: f.address || '',
                city: f.city || '',
                state: f.state || '',
                assetType: (f.assetType || 'SNF').toUpperCase() as MapFacility['assetType'],
                beds: f.beds || f.certifiedBeds || 0,
                lat: parseFloat(f.latitude),
                lng: parseFloat(f.longitude),
                isCascadia: f.isCascadia || false,
                cmsRating: f.overallRating || undefined,
                occupancy: f.occupancy || undefined,
              });
            }

            if (f.state) {
              const existing = stateMap.get(f.state) || { facilities: 0, ratings: [], beds: [], sff: 0, deals: 0 };
              existing.facilities++;
              if (f.overallRating) existing.ratings.push(f.overallRating);
              if (f.beds || f.certifiedBeds) existing.beds.push(f.beds || f.certifiedBeds);
              if (f.isSff) existing.sff++;
              stateMap.set(f.state, existing);
            }
          }
        }

        // Build market stats
        const stats: MarketStats[] = [];
        for (const [state, data] of stateMap) {
          const avgR = data.ratings.length > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0;
          const sortedBeds = data.beds.sort((a, b) => a - b);
          const medBeds = sortedBeds.length > 0 ? sortedBeds[Math.floor(sortedBeds.length / 2)] : 0;
          stats.push({
            state,
            totalFacilities: data.facilities,
            avgRating: Math.round(avgR * 10) / 10,
            medianBeds: medBeds,
            sffCount: data.sff,
            activeDealCount: data.deals,
            avgPricePerBed: null, // Could populate from comparableSales
            medicaidRate: null, // Could populate from medicaid-rates.ts
            conState: CON_STATES.includes(state),
          });
        }
        stats.sort((a, b) => b.totalFacilities - a.totalFacilities);

        setFacilities(mapFacilities);
        setMarketStats(stats);
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredForState = useMemo(() => {
    if (!selectedState) return facilities;
    return facilities.filter(f => f.state === selectedState);
  }, [facilities, selectedState]);

  const facilityCounts = useMemo(() => ({
    snf: filteredForState.filter(f => f.assetType === 'SNF').length,
    alf: filteredForState.filter(f => f.assetType === 'ALF').length,
    ilf: filteredForState.filter(f => f.assetType === 'ILF').length,
    hospice: filteredForState.filter(f => f.assetType === 'HOSPICE').length,
    cascadia: filteredForState.filter(f => f.isCascadia).length,
    potential: filteredForState.filter(f => !f.isCascadia).length,
    deals: filteredForState.filter(f => f.dealId).length,
  }), [filteredForState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-primary-500" />
            Market Intelligence Map
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Visualize deal pipeline, Cascadia portfolio, and market opportunity by region
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              viewMode === 'map' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-surface-500 hover:bg-surface-100'
            )}
          >
            <MapIcon className="w-3.5 h-3.5 inline mr-1" />Map
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              viewMode === 'stats' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-surface-500 hover:bg-surface-100'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />Stats
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-white dark:bg-surface-900">
          <p className="text-[10px] text-surface-500 uppercase">Total Facilities</p>
          <p className="text-xl font-bold text-surface-800 dark:text-surface-200">{facilities.length}</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-white dark:bg-surface-900">
          <p className="text-[10px] text-surface-500 uppercase">Active Deals</p>
          <p className="text-xl font-bold text-primary-600">{facilities.filter(f => f.dealId).length}</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-white dark:bg-surface-900">
          <p className="text-[10px] text-surface-500 uppercase">Cascadia Owned</p>
          <p className="text-xl font-bold text-teal-600">{facilities.filter(f => f.isCascadia).length}</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-white dark:bg-surface-900">
          <p className="text-[10px] text-surface-500 uppercase">States Covered</p>
          <p className="text-xl font-bold text-surface-800 dark:text-surface-200">{new Set(facilities.map(f => f.state)).size}</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 bg-white dark:bg-surface-900">
          <p className="text-[10px] text-surface-500 uppercase">Total Beds</p>
          <p className="text-xl font-bold text-surface-800 dark:text-surface-200">{facilities.reduce((s, f) => s + f.beds, 0).toLocaleString()}</p>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Filters panel */}
          <div className="space-y-4">
            {/* State filter */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
              <h3 className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase mb-3 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                State Filter
              </h3>
              <select
                value={selectedState || ''}
                onChange={e => setSelectedState(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200"
              >
                <option value="">All States</option>
                <optgroup label="Cascadia Target States">
                  {TARGET_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  {[...new Set(facilities.map(f => f.state))].filter(s => !TARGET_STATES.includes(s)).sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Asset type toggles */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
              <h3 className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase mb-3">Asset Types</h3>
              <div className="space-y-2">
                {[
                  { label: 'SNF', checked: showSNF, toggle: () => setShowSNF(!showSNF), count: facilityCounts.snf, color: '#1E40AF' },
                  { label: 'ALF', checked: showALF, toggle: () => setShowALF(!showALF), count: facilityCounts.alf, color: '#059669' },
                  { label: 'ILF', checked: showILF, toggle: () => setShowILF(!showILF), count: facilityCounts.ilf, color: '#7C3AED' },
                  { label: 'Hospice', checked: showHOSPICE, toggle: () => setShowHOSPICE(!showHOSPICE), count: facilityCounts.hospice, color: '#F59E0B' },
                ].map(item => (
                  <label key={item.label} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={item.checked} onChange={item.toggle} className="w-3.5 h-3.5 rounded border-surface-300" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-surface-700 dark:text-surface-300 flex-1">{item.label}</span>
                    <span className="text-xs text-surface-400">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ownership toggles */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
              <h3 className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase mb-3">Ownership</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={showCascadia} onChange={() => setShowCascadia(!showCascadia)} className="w-3.5 h-3.5 rounded border-surface-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-1 ring-teal-300" />
                  <span className="text-sm text-surface-700 dark:text-surface-300 flex-1">Cascadia</span>
                  <span className="text-xs text-surface-400">{facilityCounts.cascadia}</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={showPotential} onChange={() => setShowPotential(!showPotential)} className="w-3.5 h-3.5 rounded border-surface-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-400" />
                  <span className="text-sm text-surface-700 dark:text-surface-300 flex-1">Pipeline</span>
                  <span className="text-xs text-surface-400">{facilityCounts.potential}</span>
                </label>
              </div>
            </div>

            {/* Display options */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
              <h3 className="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase mb-3">Display</h3>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={showDealLabels} onChange={() => setShowDealLabels(!showDealLabels)} className="w-3.5 h-3.5 rounded border-surface-300" />
                <span className="text-sm text-surface-700 dark:text-surface-300 flex-1">Deal labels</span>
                <span className="text-xs text-surface-400">{facilityCounts.deals}</span>
              </label>
            </div>
          </div>

          {/* Map */}
          <div className="xl:col-span-3 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900" style={{ minHeight: '600px' }}>
            <FacilityMap
              facilities={filteredForState}
              showSNF={showSNF}
              showALF={showALF}
              showILF={showILF}
              showHOSPICE={showHOSPICE}
              showCascadia={showCascadia}
              showPotential={showPotential}
              showDealLabels={showDealLabels}
            />
          </div>
        </div>
      ) : (
        /* Stats view */
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-surface-500 uppercase">State</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">Facilities</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">Avg Rating</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">Median Beds</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">SFF</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">Active Deals</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">CON</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-surface-500 uppercase">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {marketStats.map(stat => (
                  <tr
                    key={stat.state}
                    className={cn(
                      'hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors cursor-pointer',
                      TARGET_STATES.includes(stat.state) && 'bg-primary-50/30 dark:bg-primary-900/5'
                    )}
                    onClick={() => { setSelectedState(stat.state); setViewMode('map'); }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-surface-800 dark:text-surface-200">{stat.state}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-surface-700 dark:text-surface-300">{stat.totalFacilities}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-xs font-semibold',
                        stat.avgRating >= 4 ? 'text-emerald-600' : stat.avgRating >= 3 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {stat.avgRating > 0 ? stat.avgRating.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-surface-700 dark:text-surface-300">{stat.medianBeds || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {stat.sffCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded">{stat.sffCount}</span>
                      ) : (
                        <span className="text-surface-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stat.activeDealCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary-100 text-primary-700 rounded">{stat.activeDealCount}</span>
                      ) : (
                        <span className="text-surface-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stat.conState ? (
                        <span className="text-xs text-amber-600 font-medium">CON</span>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {TARGET_STATES.includes(stat.state) && (
                        <Target className="w-3.5 h-3.5 text-primary-500 mx-auto" />
                      )}
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
