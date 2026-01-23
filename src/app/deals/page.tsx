'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from '@/components/ui/confidence-indicator';
import { formatCurrency, getAssetTypeLabel } from '@/lib/utils';
import {
  Upload,
  Search,
  Filter,
  Building2,
  MapPin,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

// Mock data
const mockDeals = [
  {
    id: '1',
    name: 'Sunrise Gardens SNF',
    status: 'analyzing',
    assetType: 'SNF' as const,
    beds: 120,
    state: 'WA',
    city: 'Seattle',
    confidence: 72,
    valueBase: 8500000,
    valueLow: 7200000,
    valueHigh: 9800000,
    updatedAt: '2024-01-15',
    broker: 'Marcus & Millichap',
  },
  {
    id: '2',
    name: 'Pacific Assisted Living Portfolio',
    status: 'reviewed',
    assetType: 'ALF' as const,
    beds: 85,
    state: 'OR',
    city: 'Portland',
    confidence: 85,
    valueBase: 12200000,
    valueLow: 10800000,
    valueHigh: 14500000,
    updatedAt: '2024-01-14',
    broker: 'CBRE',
  },
  {
    id: '3',
    name: 'Evergreen Care Center',
    status: 'under_loi',
    assetType: 'SNF' as const,
    beds: 150,
    state: 'CA',
    city: 'Sacramento',
    confidence: 78,
    valueBase: 15800000,
    valueLow: 13500000,
    valueHigh: 18200000,
    updatedAt: '2024-01-12',
    broker: 'JLL',
  },
  {
    id: '4',
    name: 'Mountain View ILF',
    status: 'new',
    assetType: 'ILF' as const,
    beds: 65,
    state: 'CO',
    city: 'Denver',
    confidence: 0,
    valueBase: 0,
    valueLow: 0,
    valueHigh: 0,
    updatedAt: '2024-01-16',
    broker: 'Cushman & Wakefield',
  },
  {
    id: '5',
    name: 'Harbor Health SNF',
    status: 'due_diligence',
    assetType: 'SNF' as const,
    beds: 100,
    state: 'WA',
    city: 'Tacoma',
    confidence: 82,
    valueBase: 9200000,
    valueLow: 8100000,
    valueHigh: 10500000,
    updatedAt: '2024-01-10',
    broker: 'Blueprint',
  },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'error' }> = {
  new: { label: 'New', variant: 'info' },
  analyzing: { label: 'Analyzing', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'success' },
  under_loi: { label: 'Under LOI', variant: 'info' },
  due_diligence: { label: 'Due Diligence', variant: 'warning' },
  closed: { label: 'Closed', variant: 'success' },
  passed: { label: 'Passed', variant: 'default' },
};

const assetTypes = ['All', 'SNF', 'ALF', 'ILF'];
const statuses = ['All', 'new', 'analyzing', 'reviewed', 'under_loi', 'due_diligence', 'closed', 'passed'];

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssetType = selectedAssetType === 'All' || deal.assetType === selectedAssetType;
    const matchesStatus = selectedStatus === 'All' || deal.status === selectedStatus;
    return matchesSearch && matchesAssetType && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Deals"
        description="Active and historical deal pipeline"
        actions={
          <Link href="/upload">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cascadia-400" />
                <input
                  type="text"
                  placeholder="Search deals by name, city, or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-cascadia-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                className="px-3 py-2 text-sm border border-cascadia-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Types' : type}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-cascadia-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : statusConfig[status]?.label || status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeals.map((deal) => {
          const status = statusConfig[deal.status];

          return (
            <Link key={deal.id} href={`/deals/${deal.id}`}>
              <Card className="h-full hover:border-accent/50 hover:shadow-soft transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-cascadia-900 group-hover:text-accent transition-colors">
                          {deal.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-cascadia-500">
                          <MapPin className="w-3 h-3" />
                          {deal.city}, {deal.state}
                        </div>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-cascadia-600">
                        <Building2 className="w-4 h-4" />
                        <span>{deal.assetType}</span>
                      </div>
                      <span className="text-cascadia-400">•</span>
                      <span className="text-cascadia-600">{deal.beds} beds</span>
                    </div>

                    {/* Valuation */}
                    {deal.valueBase > 0 ? (
                      <div className="pt-4 border-t border-cascadia-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-cascadia-500 uppercase tracking-wide">
                            Value Range
                          </span>
                          <span className="text-xs text-cascadia-500">
                            {deal.broker}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-cascadia-900 tabular-nums">
                            {formatCurrency(deal.valueBase, true)}
                          </span>
                          <span className="text-sm text-cascadia-500">
                            ({formatCurrency(deal.valueLow, true)} - {formatCurrency(deal.valueHigh, true)})
                          </span>
                        </div>
                        <div className="mt-3">
                          <ConfidenceIndicator score={deal.confidence} showLabel={false} size="sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-cascadia-100">
                        <p className="text-sm text-cascadia-500 italic">
                          Analysis pending
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs text-cascadia-400">
                        <Calendar className="w-3 h-3" />
                        Updated {deal.updatedAt}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-cascadia-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredDeals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-cascadia-300 mb-4" />
            <p className="text-cascadia-600">No deals match your filters</p>
            <p className="text-sm text-cascadia-500 mt-1">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
