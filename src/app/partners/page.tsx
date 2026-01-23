'use client';

import * as React from 'react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
} from 'lucide-react';

// Mock capital partners data
const partners = [
  {
    id: '1',
    name: 'Northwest Healthcare REIT',
    type: 'reit',
    assetTypes: ['SNF', 'ALF'],
    geographies: ['WA', 'OR', 'ID'],
    minDealSize: 5000000,
    maxDealSize: 25000000,
    targetYield: 0.11,
    maxLtv: 0.70,
    riskTolerance: 'moderate',
    preferredStructure: 'Sale-Leaseback',
    dealsClosed: 4,
    dealsInProgress: 1,
    lastDealDate: '2023-12-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Pacific Senior Lending',
    type: 'lender',
    assetTypes: ['SNF', 'ALF', 'ILF'],
    geographies: ['WA', 'OR', 'CA'],
    minDealSize: 3000000,
    maxDealSize: 50000000,
    targetYield: 0.095,
    maxLtv: 0.75,
    riskTolerance: 'conservative',
    preferredStructure: 'Senior Debt',
    dealsClosed: 8,
    dealsInProgress: 2,
    lastDealDate: '2024-01-10',
    status: 'active',
  },
  {
    id: '3',
    name: 'Cascade Capital Partners',
    type: 'equity',
    assetTypes: ['SNF'],
    geographies: ['WA', 'OR', 'CA', 'AZ'],
    minDealSize: 10000000,
    maxDealSize: 100000000,
    targetYield: 0.15,
    maxLtv: null,
    riskTolerance: 'aggressive',
    preferredStructure: 'JV Equity',
    dealsClosed: 2,
    dealsInProgress: 0,
    lastDealDate: '2023-09-20',
    status: 'active',
  },
  {
    id: '4',
    name: 'Mountain States Healthcare Finance',
    type: 'lender',
    assetTypes: ['SNF', 'ALF'],
    geographies: ['CO', 'UT', 'MT', 'WY'],
    minDealSize: 2000000,
    maxDealSize: 20000000,
    targetYield: 0.10,
    maxLtv: 0.72,
    riskTolerance: 'moderate',
    preferredStructure: 'Senior Debt',
    dealsClosed: 3,
    dealsInProgress: 0,
    lastDealDate: '2023-11-05',
    status: 'inactive',
  },
  {
    id: '5',
    name: 'Golden State Senior Housing REIT',
    type: 'reit',
    assetTypes: ['ALF', 'ILF'],
    geographies: ['CA', 'AZ', 'NV'],
    minDealSize: 8000000,
    maxDealSize: 40000000,
    targetYield: 0.105,
    maxLtv: 0.68,
    riskTolerance: 'conservative',
    preferredStructure: 'Sale-Leaseback',
    dealsClosed: 5,
    dealsInProgress: 1,
    lastDealDate: '2024-01-05',
    status: 'active',
  },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || partner.type === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const activePartners = partners.filter((p) => p.status === 'active').length;
  const totalDealsClosed = partners.reduce((sum, p) => sum + p.dealsClosed, 0);
  const avgTargetYield = partners.reduce((sum, p) => sum + p.targetYield, 0) / partners.length;

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
                <p className="text-2xl font-bold text-cascadia-900">{partners.length}</p>
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
                <p className="text-2xl font-bold text-cascadia-900">{activePartners}</p>
                <p className="text-sm text-cascadia-500">Active Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{totalDealsClosed}</p>
                <p className="text-sm text-cascadia-500">Deals Closed</p>
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
                <p className="text-2xl font-bold text-cascadia-900">{formatPercent(avgTargetYield, 1)}</p>
                <p className="text-sm text-cascadia-500">Avg Target Yield</p>
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
          const type = typeConfig[partner.type];
          const risk = riskConfig[partner.riskTolerance];

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
                      <div className="flex items-center gap-2 text-sm text-cascadia-500">
                        <MapPin className="w-3 h-3" />
                        {partner.geographies.join(', ')}
                      </div>
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
                        {formatCurrency(partner.minDealSize, true)} - {formatCurrency(partner.maxDealSize, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cascadia-500">Target Yield</p>
                      <p className="text-sm font-medium text-cascadia-900">
                        {formatPercent(partner.targetYield, 1)}
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
                        {partner.preferredStructure}
                      </p>
                    </div>
                  </div>

                  {/* Asset Types & Risk */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cascadia-500">Asset Types:</span>
                      <div className="flex gap-1">
                        {partner.assetTypes.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 text-xs bg-cascadia-100 text-cascadia-600 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Badge variant={risk.variant}>{risk.label}</Badge>
                  </div>

                  {/* Track Record */}
                  <div className="flex items-center justify-between pt-2 border-t border-cascadia-100">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-cascadia-500">
                        <strong className="text-cascadia-900">{partner.dealsClosed}</strong> deals closed
                      </span>
                      {partner.dealsInProgress > 0 && (
                        <span className="text-accent">
                          <strong>{partner.dealsInProgress}</strong> in progress
                        </span>
                      )}
                    </div>
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
