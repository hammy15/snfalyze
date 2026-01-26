'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Building2,
  Target,
  MapPin,
  Edit2,
  CheckCircle2,
  Handshake,
  Landmark,
  TrendingUp,
  DollarSign,
  Users,
  Filter,
  Grid3X3,
  List,
  X,
  ChevronRight,
  Briefcase,
  Shield,
  AlertTriangle,
  Building,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  type: string;
  assetTypes: string[];
  geographies: string[];
  minDealSize: number;
  maxDealSize: number;
  targetYield: number;
  maxLtv: number | null;
  riskTolerance: string;
  preferredStructure: string;
  status: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
}

const typeConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: typeof Landmark }> = {
  lender: {
    label: 'Lender',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: Landmark,
  },
  reit: {
    label: 'REIT',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: Building2,
  },
  equity: {
    label: 'Equity',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    icon: TrendingUp,
  },
};

const riskConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  conservative: { label: 'Conservative', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  moderate: { label: 'Moderate', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  aggressive: { label: 'Aggressive', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/20' },
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await fetch('/api/partners');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setPartners(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'All' || partner.type === selectedType.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [partners, searchQuery, selectedType]);

  const stats = useMemo(() => {
    const activePartners = partners.filter((p) => p.status === 'active').length;
    const lenders = partners.filter((p) => p.type === 'lender').length;
    const reits = partners.filter((p) => p.type === 'reit').length;
    const equity = partners.filter((p) => p.type === 'equity').length;
    const avgTargetYield = partners.length > 0
      ? partners.reduce((sum, p) => sum + (p.targetYield || 0), 0) / partners.length
      : 0;
    return {
      total: partners.length,
      active: activePartners,
      lenders,
      reits,
      equity,
      avgYield: avgTargetYield,
    };
  }, [partners]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded-lg" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="neu-card p-4">
              <div className="h-4 w-16 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
              <div className="h-8 w-12 bg-surface-200 dark:bg-surface-700 rounded" />
            </div>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="neu-card p-6">
              <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
              <div className="h-4 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
              <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Capital Partners</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Lender, REIT, and equity partner profiles
          </p>
        </div>
        <button className="neu-button-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium">
          <Plus className="w-3.5 h-3.5" />
          Add Partner
        </button>
      </div>

      {/* Compact Stats & Filters Bar */}
      <div className="neu-card p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary-500" />
              <span className="font-semibold text-surface-900 dark:text-surface-100">{stats.total}</span>
              <span className="text-xs text-surface-500">total</span>
            </span>
            <div className="h-5 w-px bg-surface-200 dark:bg-surface-700" />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium text-surface-700 dark:text-surface-300">{stats.lenders}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-medium text-surface-700 dark:text-surface-300">{stats.reits}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-surface-700 dark:text-surface-300">{stats.equity}</span>
            </span>
            <div className="h-5 w-px bg-surface-200 dark:bg-surface-700" />
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-orange-600 dark:text-orange-400">{formatPercent(stats.avgYield, 1)}</span>
            </span>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            {['All', 'Lender', 'REIT', 'Equity'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedType === type
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-surface-100 dark:bg-surface-800 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-400 hover:text-surface-600'
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-all',
                viewMode === 'list'
                  ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-surface-400 hover:text-surface-600'
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {partners.length === 0 && (
        <div className="neu-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Handshake className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
            No capital partners yet
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
            Add your first capital partner to start simulating deals and matching opportunities.
          </p>
          <button className="neu-button-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Partner
          </button>
        </div>
      )}

      {/* No Results */}
      {partners.length > 0 && filteredPartners.length === 0 && (
        <div className="neu-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <Search className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
            No partners match your filters
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-4">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedType('All'); }}
            className="neu-button px-4 py-2 rounded-lg font-medium text-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Partners Grid */}
      {filteredPartners.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPartners.map((partner) => {
            const type = typeConfig[partner.type] || {
              label: partner.type,
              bgColor: 'bg-surface-100 dark:bg-surface-800',
              textColor: 'text-surface-700 dark:text-surface-300',
              icon: Building,
            };
            const TypeIcon = type.icon;
            const risk = riskConfig[partner.riskTolerance] || {
              label: partner.riskTolerance,
              color: 'text-surface-600 dark:text-surface-400',
              bgColor: 'bg-surface-100 dark:bg-surface-800'
            };

            return (
              <div
                key={partner.id}
                onClick={() => setSelectedPartner(partner)}
                className="neu-card p-4 hover-lift cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2.5 rounded-xl', type.bgColor)}>
                      <TypeIcon className={cn('w-5 h-5', type.textColor)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {partner.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', type.bgColor, type.textColor)}>
                          {type.label}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs',
                          partner.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            partner.status === 'active' ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'
                          )} />
                          {partner.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-surface-300 dark:text-surface-600 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Geography */}
                {partner.geographies && partner.geographies.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-surface-500 dark:text-surface-400">
                    <MapPin className="w-3 h-3" />
                    <span>{partner.geographies.slice(0, 3).join(', ')}{partner.geographies.length > 3 ? ` +${partner.geographies.length - 3}` : ''}</span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface-50 dark:bg-surface-800/50 rounded-lg mb-3">
                  <div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">Deal Size</p>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {partner.minDealSize && partner.maxDealSize
                        ? `${formatCurrency(partner.minDealSize, true)} - ${formatCurrency(partner.maxDealSize, true)}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">Target Yield</p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {formatPercent(partner.targetYield, 1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">Max LTV</p>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {formatPercent(partner.maxLtv, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">Structure</p>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {partner.preferredStructure || '—'}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-700/50">
                  <div className="flex flex-wrap gap-1.5">
                    {partner.assetTypes && partner.assetTypes.slice(0, 3).map((assetType) => (
                      <span
                        key={assetType}
                        className="px-2 py-0.5 text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-full"
                      >
                        {assetType}
                      </span>
                    ))}
                    {partner.assetTypes && partner.assetTypes.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-surface-100 dark:bg-surface-800 text-surface-500 rounded-full">
                        +{partner.assetTypes.length - 3}
                      </span>
                    )}
                  </div>
                  {partner.riskTolerance && (
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', risk.bgColor, risk.color)}>
                      {risk.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Partners List */}
      {filteredPartners.length > 0 && viewMode === 'list' && (
        <div className="neu-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Partner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Deal Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Yield</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Max LTV</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredPartners.map((partner) => {
                  const type = typeConfig[partner.type] || {
                    label: partner.type,
                    bgColor: 'bg-surface-100 dark:bg-surface-800',
                    textColor: 'text-surface-700 dark:text-surface-300',
                    icon: Building,
                  };
                  const risk = riskConfig[partner.riskTolerance] || {
                    label: partner.riskTolerance,
                    color: 'text-surface-600',
                    bgColor: 'bg-surface-100 dark:bg-surface-800'
                  };

                  return (
                    <tr
                      key={partner.id}
                      onClick={() => setSelectedPartner(partner)}
                      className="hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-surface-900 dark:text-surface-100">{partner.name}</div>
                        {partner.geographies && partner.geographies.length > 0 && (
                          <div className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {partner.geographies.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', type.bgColor, type.textColor)}>
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300">
                        {partner.minDealSize && partner.maxDealSize
                          ? `${formatCurrency(partner.minDealSize, true)} - ${formatCurrency(partner.maxDealSize, true)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400">
                        {formatPercent(partner.targetYield, 1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300">
                        {formatPercent(partner.maxLtv, 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', risk.bgColor, risk.color)}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          partner.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            partner.status === 'active' ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'
                          )} />
                          {partner.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="neu-card p-4">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3">
          How Partner Simulation Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-surface-900 dark:text-surface-100">Profile Matching</h4>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Match deals to partners by geography, asset type, and risk.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-surface-900 dark:text-surface-100">Yield Analysis</h4>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Calculate expected yields from partner requirements.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-surface-900 dark:text-surface-100">Close Probability</h4>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Estimate close rates from historical data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Slide-over */}
      {selectedPartner && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setSelectedPartner(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-surface-900 shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                Partner Details
              </h2>
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    typeConfig[selectedPartner.type]?.bgColor || 'bg-surface-100 dark:bg-surface-800'
                  )}>
                    {(() => {
                      const TypeIcon = typeConfig[selectedPartner.type]?.icon || Building;
                      return <TypeIcon className={cn('w-6 h-6', typeConfig[selectedPartner.type]?.textColor || 'text-surface-600')} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                      {selectedPartner.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        typeConfig[selectedPartner.type]?.bgColor || 'bg-surface-100',
                        typeConfig[selectedPartner.type]?.textColor || 'text-surface-600'
                      )}>
                        {typeConfig[selectedPartner.type]?.label || selectedPartner.type}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs',
                        selectedPartner.status === 'active' ? 'text-emerald-600' : 'text-surface-400'
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          selectedPartner.status === 'active' ? 'bg-emerald-500' : 'bg-surface-300'
                        )} />
                        {selectedPartner.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Criteria */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Investment Criteria
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <p className="text-xs text-surface-500 mb-1">Deal Size Range</p>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {selectedPartner.minDealSize && selectedPartner.maxDealSize
                        ? `${formatCurrency(selectedPartner.minDealSize, true)} - ${formatCurrency(selectedPartner.maxDealSize, true)}`
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <p className="text-xs text-surface-500 mb-1">Target Yield</p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {formatPercent(selectedPartner.targetYield, 1)}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <p className="text-xs text-surface-500 mb-1">Max LTV</p>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {formatPercent(selectedPartner.maxLtv, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <p className="text-xs text-surface-500 mb-1">Risk Tolerance</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      riskConfig[selectedPartner.riskTolerance]?.color || 'text-surface-900'
                    )}>
                      {riskConfig[selectedPartner.riskTolerance]?.label || selectedPartner.riskTolerance || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferred Structure */}
              {selectedPartner.preferredStructure && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Preferred Structure
                  </h4>
                  <p className="text-sm text-surface-700 dark:text-surface-300">
                    {selectedPartner.preferredStructure}
                  </p>
                </div>
              )}

              {/* Asset Types */}
              {selectedPartner.assetTypes && selectedPartner.assetTypes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Asset Types
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPartner.assetTypes.map((assetType) => (
                      <span
                        key={assetType}
                        className="px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg"
                      >
                        {assetType}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Geographies */}
              {selectedPartner.geographies && selectedPartner.geographies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Geographic Focus
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPartner.geographies.map((geo) => (
                      <span
                        key={geo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {geo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex gap-3">
                <button className="neu-button-primary flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit Partner
                </button>
                <button className="neu-button px-4 py-2.5 rounded-lg font-medium">
                  <Briefcase className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
