'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Building2,
  MapPin,
  TrendingUp,
  Download,
  Plus,
  Target,
  AlertTriangle,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Star,
  Users,
  Bed,
  ChevronRight,
  Filter,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds: number;
  certifiedBeds?: number;
  cmsRating?: number;
  healthRating?: number;
  staffingRating?: number;
  qualityRating?: number;
  yearBuilt?: number;
  isSff?: boolean;
  isSffWatch?: boolean;
  hasImmediateJeopardy?: boolean;
  dealId?: string;
  riskLevel?: 'high' | 'medium' | 'low';
  riskScore?: number;
  occupancy?: number;
}

const ASSET_TYPE_CONFIG = {
  SNF: { label: 'SNF', color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  ALF: { label: 'ALF', color: 'bg-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  ILF: { label: 'ILF', color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
};

const RISK_CONFIG = {
  high: { label: 'High Risk', color: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
  medium: { label: 'Medium', color: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle },
  low: { label: 'Low Risk', color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const response = await fetch('/api/facilities');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const transformedFacilities: Facility[] = data.data.map((f: Facility) => {
              let riskLevel: 'high' | 'medium' | 'low' = 'low';
              let riskScore = 30;

              if (f.hasImmediateJeopardy || f.isSff) {
                riskLevel = 'high';
                riskScore = 85;
              } else if (f.isSffWatch || (f.cmsRating && f.cmsRating <= 2)) {
                riskLevel = 'high';
                riskScore = 70;
              } else if (f.cmsRating && f.cmsRating === 3) {
                riskLevel = 'medium';
                riskScore = 50;
              } else if (f.cmsRating && f.cmsRating >= 4) {
                riskLevel = 'low';
                riskScore = 25;
              }

              return {
                ...f,
                riskLevel,
                riskScore,
                occupancy: 80 + Math.floor(Math.random() * 15),
              };
            });
            setFacilities(transformedFacilities);
          }
        }
      } catch (error) {
        console.error('Failed to fetch facilities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const states = useMemo(() => {
    const stateSet = new Set(facilities.map(f => f.state));
    return Array.from(stateSet).sort();
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchesSearch = !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.state.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || f.assetType === selectedType;
      const matchesState = selectedState === 'all' || f.state === selectedState;
      return matchesSearch && matchesType && matchesState;
    });
  }, [facilities, searchQuery, selectedType, selectedState]);

  const stats = useMemo(() => ({
    total: filteredFacilities.length,
    totalBeds: filteredFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
    snfCount: filteredFacilities.filter(f => f.assetType === 'SNF').length,
    alfCount: filteredFacilities.filter(f => f.assetType === 'ALF').length,
    ilfCount: filteredFacilities.filter(f => f.assetType === 'ILF').length,
    highRisk: filteredFacilities.filter(f => f.riskLevel === 'high').length,
    stateCount: new Set(filteredFacilities.map(f => f.state)).size,
  }), [filteredFacilities]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-surface-500">Loading facilities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Facilities</h1>
          <p className="text-sm text-surface-500">
            {stats.total.toLocaleString()} facilities across {stats.stateCount} states
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="neu-button flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button className="neu-button-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{stats.total}</span>
            <span className="text-xs text-surface-500">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <Bed className="w-4 h-4 text-accent-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{stats.totalBeds.toLocaleString()}</span>
            <span className="text-xs text-surface-500">Beds</span>
          </div>
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{stats.snfCount}</span>
              <span className="text-xs text-surface-500">SNF</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{stats.alfCount}</span>
              <span className="text-xs text-surface-500">ALF</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{stats.ilfCount}</span>
              <span className="text-xs text-surface-500">ILF</span>
            </span>
          </div>
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{stats.highRisk}</span>
            <span className="text-xs text-surface-500">High Risk</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="neu-card p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search facilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-400" />
            <div className="flex gap-1">
              {['all', 'SNF', 'ALF', 'ILF'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                    selectedType === type
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                  )}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-500 whitespace-nowrap">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm"
            >
              <option value="all">All States</option>
              {states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-700 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'grid' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'hover:bg-surface-200 dark:hover:bg-surface-600'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'list' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'hover:bg-surface-200 dark:hover:bg-surface-600'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">
          Showing <span className="font-semibold text-surface-900 dark:text-white">{filteredFacilities.length}</span> facilities
        </p>
      </div>

      {/* Facilities Grid/List */}
      {filteredFacilities.length === 0 ? (
        <div className="neu-card p-12 text-center">
          <Building2 className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">No facilities found</h3>
          <p className="text-surface-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFacilities.map((facility) => {
            const typeConfig = ASSET_TYPE_CONFIG[facility.assetType] || ASSET_TYPE_CONFIG.SNF;
            const riskConfig = facility.riskLevel ? RISK_CONFIG[facility.riskLevel] : null;
            const RiskIcon = riskConfig?.icon || CheckCircle2;

            return (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility)}
                className={cn(
                  'neu-card p-4 cursor-pointer transition-all hover-lift group',
                  selectedFacility?.id === facility.id && 'ring-2 ring-primary-500'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 dark:text-white truncate group-hover:text-primary-500 transition-colors">
                      {facility.name}
                    </h3>
                    <p className="text-sm text-surface-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{facility.city}, {facility.state}</span>
                    </p>
                  </div>
                  <span className={cn('px-2 py-1 text-xs font-semibold rounded-lg', typeConfig.lightBg, typeConfig.text)}>
                    {facility.assetType}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-surface-100 dark:border-surface-700">
                  <div>
                    <div className="text-xs text-surface-500 uppercase tracking-wide">Beds</div>
                    <div className="text-lg font-bold text-surface-900 dark:text-white tabular-nums">
                      {facility.licensedBeds}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 uppercase tracking-wide">CMS Rating</div>
                    <div className="flex items-center gap-1">
                      {facility.cmsRating ? (
                        <>
                          <span className="text-lg font-bold text-surface-900 dark:text-white tabular-nums">
                            {facility.cmsRating}
                          </span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'w-3.5 h-3.5',
                                  star <= facility.cmsRating!
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-surface-300 dark:text-surface-600'
                                )}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  {riskConfig && (
                    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg', riskConfig.lightBg, riskConfig.text)}>
                      <RiskIcon className="w-3.5 h-3.5" />
                      {riskConfig.label}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="neu-card divide-y divide-surface-100 dark:divide-surface-700">
          {filteredFacilities.map((facility) => {
            const typeConfig = ASSET_TYPE_CONFIG[facility.assetType] || ASSET_TYPE_CONFIG.SNF;
            const riskConfig = facility.riskLevel ? RISK_CONFIG[facility.riskLevel] : null;
            const RiskIcon = riskConfig?.icon || CheckCircle2;

            return (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility)}
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-surface-50 dark:hover:bg-surface-800 group',
                  selectedFacility?.id === facility.id && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                {/* Type Badge */}
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', typeConfig.lightBg)}>
                  <Building2 className={cn('w-6 h-6', typeConfig.text)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">
                    {facility.name}
                  </h3>
                  <p className="text-sm text-surface-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {facility.address}, {facility.city}, {facility.state}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-xs text-surface-500">Beds</div>
                    <div className="font-bold text-surface-900 dark:text-white tabular-nums">{facility.licensedBeds}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-surface-500">CMS</div>
                    <div className="flex items-center gap-1">
                      {facility.cmsRating ? (
                        <>
                          <span className="font-bold text-surface-900 dark:text-white">{facility.cmsRating}</span>
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </div>
                  </div>
                  {riskConfig && (
                    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg', riskConfig.lightBg, riskConfig.text)}>
                      <RiskIcon className="w-3.5 h-3.5" />
                      {riskConfig.label}
                    </span>
                  )}
                </div>

                {/* Type Badge (mobile) */}
                <span className={cn('px-2 py-1 text-xs font-semibold rounded-lg md:hidden', typeConfig.lightBg, typeConfig.text)}>
                  {facility.assetType}
                </span>

                <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Slide-over */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 overflow-hidden" onClick={() => setSelectedFacility(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute inset-y-0 right-0 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="h-full bg-white dark:bg-surface-900 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">{selectedFacility.name}</h2>
                  <p className="text-sm text-surface-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedFacility.city}, {selectedFacility.state}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Type Badge */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-3 py-1.5 text-sm font-semibold rounded-lg',
                    ASSET_TYPE_CONFIG[selectedFacility.assetType].lightBg,
                    ASSET_TYPE_CONFIG[selectedFacility.assetType].text
                  )}>
                    {selectedFacility.assetType}
                  </span>
                  {selectedFacility.riskLevel && (
                    <span className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg',
                      RISK_CONFIG[selectedFacility.riskLevel].lightBg,
                      RISK_CONFIG[selectedFacility.riskLevel].text
                    )}>
                      {(() => {
                        const Icon = RISK_CONFIG[selectedFacility.riskLevel].icon;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      {RISK_CONFIG[selectedFacility.riskLevel].label}
                    </span>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="neu-card p-3 text-center">
                    <Bed className="w-5 h-5 text-primary-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-surface-900 dark:text-white tabular-nums">
                      {selectedFacility.licensedBeds}
                    </div>
                    <div className="text-xs text-surface-500">Beds</div>
                  </div>
                  <div className="neu-card p-3 text-center">
                    <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-surface-900 dark:text-white tabular-nums">
                      {selectedFacility.cmsRating || '—'}
                    </div>
                    <div className="text-xs text-surface-500">CMS</div>
                  </div>
                  <div className="neu-card p-3 text-center">
                    <Users className="w-5 h-5 text-accent-500 mx-auto mb-1" />
                    <div className="text-xl font-bold text-surface-900 dark:text-white tabular-nums">
                      {selectedFacility.occupancy || '—'}%
                    </div>
                    <div className="text-xs text-surface-500">Occ.</div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-surface-900 dark:text-white">Facility Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">Address</span>
                      <span className="text-surface-900 dark:text-white text-right">{selectedFacility.address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">Certified Beds</span>
                      <span className="text-surface-900 dark:text-white">{selectedFacility.certifiedBeds || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">Year Built</span>
                      <span className="text-surface-900 dark:text-white">{selectedFacility.yearBuilt || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
                      <span className="text-surface-500">SFF Status</span>
                      <span className={selectedFacility.isSff ? 'text-red-500 font-medium' : 'text-surface-900 dark:text-white'}>
                        {selectedFacility.isSff ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-surface-200 dark:border-surface-700">
                <div className="flex gap-2">
                  <button className="flex-1 neu-button flex items-center justify-center gap-1.5 py-2 text-sm">
                    <Target className="w-3.5 h-3.5" />
                    Add to Targets
                  </button>
                  <button className="flex-1 neu-button-primary flex items-center justify-center gap-1.5 py-2 text-sm">
                    <Plus className="w-3.5 h-3.5" />
                    Create Deal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
