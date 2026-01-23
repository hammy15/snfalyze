'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Plus,
  Search,
  Building,
  DollarSign,
  Target,
  MapPin,
  Edit2,
  Trash2,
  TrendingUp,
  CheckCircle,
  XCircle,
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
  lender: { label: 'Lender', color: 'bg-blue-100 text-blue-700' },
  reit: { label: 'REIT', color: 'bg-purple-100 text-purple-700' },
  equity: { label: 'Equity', color: 'bg-green-100 text-green-700' },
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

  // Fetch partners from API
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
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Capital Partners"
          description="Lender, REIT, and equity partner profiles for deal simulation"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-pulse text-gray-500">Loading partners...</div>
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
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
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Handshake className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No capital partners yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add capital partners to simulate deal financing scenarios
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Partner
          </Button>
        </div>

        {/* Partner Simulation Info */}
        <Card>
          <CardHeader>
            <CardTitle>How Partner Simulation Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-cascadia-900">Profile Matching</h4>
                <p className="text-cascadia-600">
                  Each deal is tested against partner profiles based on geography, asset type, deal size, and risk tolerance.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-cascadia-900">Yield Analysis</h4>
                <p className="text-cascadia-600">
                  Expected yields are calculated based on partner requirements and deal characteristics to identify best economics.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-cascadia-900">Close Probability</h4>
                <p className="text-cascadia-600">
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
    <div className="space-y-8 animate-fade-in">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Building className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{stats.total}</p>
                <p className="text-sm text-cascadia-500">Total Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-success/10">
                <CheckCircle className="w-6 h-6 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{stats.active}</p>
                <p className="text-sm text-cascadia-500">Active Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">
                  {stats.avgYield > 0 ? formatPercent(stats.avgYield, 1) : '—'}
                </p>
                <p className="text-sm text-cascadia-500">Avg Target Yield</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Handshake className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">—</p>
                <p className="text-sm text-cascadia-500">Deals Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cascadia-400" />
                <input
                  type="text"
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-cascadia-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {['All', 'Lender', 'REIT', 'Equity'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedType === type
                      ? 'bg-accent text-white'
                      : 'bg-cascadia-100 text-cascadia-600 hover:bg-cascadia-200'
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
          const type = typeConfig[partner.type] || { label: partner.type, color: 'bg-gray-100 text-gray-700' };
          const risk = riskConfig[partner.riskTolerance] || { label: partner.riskTolerance, variant: 'default' as const };

          return (
            <Card key={partner.id} className="hover:border-accent/50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-cascadia-900">{partner.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${type.color}`}>
                          {type.label}
                        </span>
                      </div>
                      {partner.geographies && partner.geographies.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-cascadia-500">
                          <MapPin className="w-3 h-3" />
                          {partner.geographies.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          partner.status === 'active' ? 'bg-status-success' : 'bg-cascadia-300'
                        }`}
                      />
                      <span className="text-xs text-cascadia-500 capitalize">{partner.status}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-cascadia-100">
                    <div>
                      <p className="text-xs text-cascadia-500">Deal Size Range</p>
                      <p className="text-sm font-medium text-cascadia-900">
                        {partner.minDealSize && partner.maxDealSize
                          ? `${formatCurrency(partner.minDealSize, true)} - ${formatCurrency(partner.maxDealSize, true)}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cascadia-500">Target Yield</p>
                      <p className="text-sm font-medium text-cascadia-900">
                        {partner.targetYield ? formatPercent(partner.targetYield, 1) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cascadia-500">Max LTV</p>
                      <p className="text-sm font-medium text-cascadia-900">
                        {partner.maxLtv ? formatPercent(partner.maxLtv, 0) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cascadia-500">Preferred Structure</p>
                      <p className="text-sm font-medium text-cascadia-900">
                        {partner.preferredStructure || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Asset Types & Risk */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cascadia-500">Asset Types:</span>
                      <div className="flex gap-1">
                        {partner.assetTypes && partner.assetTypes.map((assetType) => (
                          <span
                            key={assetType}
                            className="px-2 py-0.5 text-xs bg-cascadia-100 text-cascadia-600 rounded"
                          >
                            {assetType}
                          </span>
                        ))}
                      </div>
                    </div>
                    {partner.riskTolerance && <Badge variant={risk.variant}>{risk.label}</Badge>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end pt-2 border-t border-cascadia-100">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
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
            <Building className="w-12 h-12 mx-auto text-cascadia-300 mb-4" />
            <p className="text-cascadia-600">No partners match your filters</p>
            <p className="text-sm text-cascadia-500 mt-1">
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
              <h4 className="font-medium text-cascadia-900">Profile Matching</h4>
              <p className="text-cascadia-600">
                Each deal is tested against partner profiles based on geography, asset type, deal size, and risk tolerance.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-cascadia-900">Yield Analysis</h4>
              <p className="text-cascadia-600">
                Expected yields are calculated based on partner requirements and deal characteristics to identify best economics.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-cascadia-900">Close Probability</h4>
              <p className="text-cascadia-600">
                Historical deal data and partner behavior inform probability of close estimates for each match.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
