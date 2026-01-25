'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard, SkeletonStats } from '@/components/ui/skeleton';
import { EmptyStateNoPartners } from '@/components/ui/empty-state';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Plus,
  Search,
  Building,
  Target,
  MapPin,
  Edit2,
  CheckCircle,
  Handshake,
} from 'lucide-react';

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
}

const typeConfig: Record<string, { label: string; color: string }> = {
  lender: { label: 'Lender', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  reit: { label: 'REIT', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  equity: { label: 'Equity', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const riskConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  conservative: { label: 'Conservative', variant: 'default' },
  moderate: { label: 'Moderate', variant: 'warning' },
  aggressive: { label: 'Aggressive', variant: 'error' },
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

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
    const avgTargetYield = partners.length > 0
      ? partners.reduce((sum, p) => sum + (p.targetYield || 0), 0) / partners.length
      : 0;
    return {
      total: partners.length,
      active: activePartners,
      avgYield: avgTargetYield,
    };
  }, [partners]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Capital Partners"
          description="Lender, REIT, and equity partner profiles for deal simulation"
        />
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Capital Partners"
          description="Lender, REIT, and equity partner profiles for deal simulation"
          actions={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          }
        />
        <Card>
          <CardContent className="py-12">
            <EmptyStateNoPartners onAction={() => setShowAddModal(true)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Partner Simulation Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-surface-900 dark:text-surface-100">Profile Matching</h4>
                <p className="text-surface-600 dark:text-surface-400">
                  Each deal is tested against partner profiles based on geography, asset type, deal size, and risk tolerance.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-surface-900 dark:text-surface-100">Yield Analysis</h4>
                <p className="text-surface-600 dark:text-surface-400">
                  Expected yields are calculated based on partner requirements and deal characteristics to identify best economics.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-surface-900 dark:text-surface-100">Close Probability</h4>
                <p className="text-surface-600 dark:text-surface-400">
                  Historical deal data and partner behavior inform probability of close estimates for each match.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capital Partners"
        description="Lender, REIT, and equity partner profiles for deal simulation"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Partners"
          value={stats.total}
          icon={<Building className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Active Partners"
          value={stats.active}
          icon={<CheckCircle className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Avg Target Yield"
          value={stats.avgYield > 0 ? stats.avgYield : 0}
          format="percent"
          icon={<Target className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Deals Closed"
          value={0}
          icon={<Handshake className="w-5 h-5" />}
          size="sm"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {['All', 'Lender', 'REIT', 'Equity'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedType === type
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPartners.map((partner) => {
          const type = typeConfig[partner.type] || { label: partner.type, color: 'bg-surface-100 text-surface-700' };
          const risk = riskConfig[partner.riskTolerance] || { label: partner.riskTolerance, variant: 'default' as const };

          return (
            <Card key={partner.id} className="hover:border-primary-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-surface-900 dark:text-surface-100">{partner.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${type.color}`}>
                          {type.label}
                        </span>
                      </div>
                      {partner.geographies && partner.geographies.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                          <MapPin className="w-3 h-3" />
                          {partner.geographies.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          partner.status === 'active' ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'
                        }`}
                      />
                      <span className="text-xs text-surface-500 dark:text-surface-400 capitalize">{partner.status}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-100 dark:border-surface-700">
                    <div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Deal Size Range</p>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {partner.minDealSize && partner.maxDealSize
                          ? `${formatCurrency(partner.minDealSize, true)} - ${formatCurrency(partner.maxDealSize, true)}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Target Yield</p>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {partner.targetYield ? formatPercent(partner.targetYield, 1) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Max LTV</p>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {partner.maxLtv ? formatPercent(partner.maxLtv, 0) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 dark:text-surface-400">Preferred Structure</p>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {partner.preferredStructure || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Asset Types & Risk */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 dark:text-surface-400">Asset Types:</span>
                      <div className="flex gap-1">
                        {partner.assetTypes && partner.assetTypes.map((assetType) => (
                          <span
                            key={assetType}
                            className="px-2 py-0.5 text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded"
                          >
                            {assetType}
                          </span>
                        ))}
                      </div>
                    </div>
                    {partner.riskTolerance && <Badge variant={risk.variant}>{risk.label}</Badge>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end pt-2 border-t border-surface-100 dark:border-surface-700">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPartners.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
            <p className="text-surface-600 dark:text-surface-400">No partners match your filters</p>
            <p className="text-sm text-surface-500 dark:text-surface-500 mt-1">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Partner Simulation Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Partner Simulation Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-surface-900 dark:text-surface-100">Profile Matching</h4>
              <p className="text-surface-600 dark:text-surface-400">
                Each deal is tested against partner profiles based on geography, asset type, deal size, and risk tolerance.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-surface-900 dark:text-surface-100">Yield Analysis</h4>
              <p className="text-surface-600 dark:text-surface-400">
                Expected yields are calculated based on partner requirements and deal characteristics to identify best economics.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-surface-900 dark:text-surface-100">Close Probability</h4>
              <p className="text-surface-600 dark:text-surface-400">
                Historical deal data and partner behavior inform probability of close estimates for each match.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
