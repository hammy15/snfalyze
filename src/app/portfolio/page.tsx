'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PieChart,
  BarChart3,
  Users,
} from 'lucide-react';

// Mock portfolio data
const portfolioSummary = {
  totalFacilities: 8,
  totalBeds: 890,
  totalValue: 98500000,
  avgOccupancy: 0.87,
  avgConfidence: 81,
  stateConcentration: [
    { state: 'WA', facilities: 4, beds: 480, value: 52000000, percent: 0.53 },
    { state: 'OR', facilities: 2, beds: 210, value: 24000000, percent: 0.24 },
    { state: 'CA', facilities: 2, beds: 200, value: 22500000, percent: 0.23 },
  ],
  assetTypeBreakdown: [
    { type: 'SNF', facilities: 5, beds: 620, value: 68000000, percent: 0.69 },
    { type: 'ALF', facilities: 2, beds: 170, value: 21000000, percent: 0.21 },
    { type: 'ILF', facilities: 1, beds: 100, value: 9500000, percent: 0.10 },
  ],
  laborBandwidth: {
    status: 'stretched',
    coreStaff: 1240,
    openPositions: 85,
    agencyExposure: 0.12,
  },
};

const facilities = [
  {
    id: '1',
    name: 'Sunrise Gardens SNF',
    assetType: 'SNF',
    beds: 120,
    state: 'WA',
    city: 'Seattle',
    occupancy: 0.85,
    noi: 1012500,
    value: 9800000,
    status: 'stable',
    trend: 'up',
  },
  {
    id: '2',
    name: 'Pacific Assisted Living',
    assetType: 'ALF',
    beds: 85,
    state: 'OR',
    city: 'Portland',
    occupancy: 0.92,
    noi: 1340000,
    value: 12200000,
    status: 'performing',
    trend: 'up',
  },
  {
    id: '3',
    name: 'Evergreen Care Center',
    assetType: 'SNF',
    beds: 150,
    state: 'WA',
    city: 'Tacoma',
    occupancy: 0.88,
    noi: 1580000,
    value: 15800000,
    status: 'stable',
    trend: 'stable',
  },
  {
    id: '4',
    name: 'Cascade Senior Living',
    assetType: 'ALF',
    beds: 85,
    state: 'WA',
    city: 'Bellevue',
    occupancy: 0.94,
    noi: 1150000,
    value: 8800000,
    status: 'performing',
    trend: 'up',
  },
  {
    id: '5',
    name: 'Harbor View SNF',
    assetType: 'SNF',
    beds: 100,
    state: 'CA',
    city: 'Sacramento',
    occupancy: 0.82,
    noi: 920000,
    value: 9200000,
    status: 'watch',
    trend: 'down',
  },
  {
    id: '6',
    name: 'Mountain View ILF',
    assetType: 'ILF',
    beds: 100,
    state: 'OR',
    city: 'Bend',
    occupancy: 0.91,
    noi: 1080000,
    value: 9500000,
    status: 'performing',
    trend: 'up',
  },
  {
    id: '7',
    name: 'Valley Care SNF',
    assetType: 'SNF',
    beds: 130,
    state: 'WA',
    city: 'Spokane',
    occupancy: 0.86,
    noi: 1420000,
    value: 14200000,
    status: 'stable',
    trend: 'stable',
  },
  {
    id: '8',
    name: 'Coastal Health SNF',
    assetType: 'SNF',
    beds: 120,
    state: 'CA',
    city: 'San Diego',
    occupancy: 0.79,
    noi: 1050000,
    value: 11000000,
    status: 'watch',
    trend: 'down',
  },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  performing: { label: 'Performing', variant: 'success' },
  stable: { label: 'Stable', variant: 'default' },
  watch: { label: 'Watch', variant: 'warning' },
  distressed: { label: 'Distressed', variant: 'error' },
};

export default function PortfolioPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Portfolio"
        description="Current holdings and portfolio-level intelligence"
        actions={
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <PieChart className="w-4 h-4 mr-1" />
              Grid
            </Button>
          </div>
        }
      />

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{portfolioSummary.totalFacilities}</p>
                <p className="text-sm text-cascadia-500">Facilities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cascadia-100">
                <Users className="w-6 h-6 text-cascadia-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{portfolioSummary.totalBeds}</p>
                <p className="text-sm text-cascadia-500">Total Beds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-success/10">
                <TrendingUp className="w-6 h-6 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{formatCurrency(portfolioSummary.totalValue, true)}</p>
                <p className="text-sm text-cascadia-500">Portfolio Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">{formatPercent(portfolioSummary.avgOccupancy, 0)}</p>
                <p className="text-sm text-cascadia-500">Avg Occupancy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                portfolioSummary.laborBandwidth.status === 'stretched'
                  ? 'bg-status-warning/10'
                  : 'bg-status-success/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  portfolioSummary.laborBandwidth.status === 'stretched'
                    ? 'text-status-warning'
                    : 'text-status-success'
                }`} />
              </div>
              <div>
                <p className="text-lg font-bold text-cascadia-900 capitalize">
                  {portfolioSummary.laborBandwidth.status}
                </p>
                <p className="text-sm text-cascadia-500">Labor Bandwidth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Concentration Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Geographic Concentration</CardTitle>
            <CardDescription>Portfolio distribution by state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioSummary.stateConcentration.map((item) => (
                <div key={item.state} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-cascadia-900">{item.state}</span>
                    <span className="text-cascadia-600">
                      {item.facilities} facilities • {item.beds} beds • {formatCurrency(item.value, true)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-cascadia-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.percent > 0.5 ? 'bg-status-warning' : 'bg-accent'
                      }`}
                      style={{ width: `${item.percent * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-cascadia-500 text-right">
                    {formatPercent(item.percent, 0)} of portfolio
                    {item.percent > 0.5 && (
                      <span className="text-status-warning ml-2">High concentration</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Type Breakdown</CardTitle>
            <CardDescription>Portfolio distribution by facility type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioSummary.assetTypeBreakdown.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-cascadia-900">
                      {item.type === 'SNF' ? 'Skilled Nursing' : item.type === 'ALF' ? 'Assisted Living' : 'Independent Living'}
                    </span>
                    <span className="text-cascadia-600">
                      {item.facilities} facilities • {item.beds} beds • {formatCurrency(item.value, true)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-cascadia-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.type === 'SNF' ? 'bg-blue-500' :
                        item.type === 'ALF' ? 'bg-purple-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${item.percent * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-cascadia-500 text-right">
                    {formatPercent(item.percent, 0)} of portfolio
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Bandwidth Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Bandwidth Assessment</CardTitle>
          <CardDescription>
            Staffing capacity across the portfolio affects ability to take on new deals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-cascadia-50">
              <p className="text-sm text-cascadia-500">Core Staff</p>
              <p className="text-2xl font-bold text-cascadia-900">{portfolioSummary.laborBandwidth.coreStaff}</p>
            </div>
            <div className="p-4 rounded-lg bg-status-warning/10">
              <p className="text-sm text-cascadia-500">Open Positions</p>
              <p className="text-2xl font-bold text-status-warning">{portfolioSummary.laborBandwidth.openPositions}</p>
            </div>
            <div className="p-4 rounded-lg bg-cascadia-50">
              <p className="text-sm text-cascadia-500">Agency Exposure</p>
              <p className="text-2xl font-bold text-cascadia-900">{formatPercent(portfolioSummary.laborBandwidth.agencyExposure, 0)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-cascadia-600 p-4 rounded-lg bg-status-warning/5 border border-status-warning/20">
            <AlertTriangle className="w-4 h-4 inline mr-2 text-status-warning" />
            Current labor bandwidth is <strong>stretched</strong>. Consider labor market conditions when evaluating new deals, particularly SNFs requiring significant staffing turnaround.
          </p>
        </CardContent>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Facilities</CardTitle>
          <CardDescription>All facilities in the current portfolio</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Beds</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">NOI</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((facility) => {
                const status = statusConfig[facility.status];
                return (
                  <TableRow key={facility.id}>
                    <TableCell>
                      <Link
                        href={`/deals/${facility.id}`}
                        className="font-medium text-cascadia-900 hover:text-accent transition-colors"
                      >
                        {facility.name}
                      </Link>
                    </TableCell>
                    <TableCell>{facility.assetType}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-cascadia-600">
                        <MapPin className="w-3 h-3" />
                        {facility.city}, {facility.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{facility.beds}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(facility.occupancy, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(facility.noi, true)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(facility.value, true)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {facility.trend === 'up' && (
                        <TrendingUp className="w-4 h-4 text-status-success" />
                      )}
                      {facility.trend === 'down' && (
                        <TrendingDown className="w-4 h-4 text-status-error" />
                      )}
                      {facility.trend === 'stable' && (
                        <span className="text-cascadia-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
