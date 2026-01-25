'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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

interface Facility {
  id: string;
  name: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds: number;
  certifiedBeds: number;
  state: string;
  city: string;
  occupancy?: number;
  noi?: number;
  value?: number;
  status?: string;
  trend?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  performing: { label: 'Performing', variant: 'success' },
  stable: { label: 'Stable', variant: 'default' },
  watch: { label: 'Watch', variant: 'warning' },
  distressed: { label: 'Distressed', variant: 'error' },
};

export default function PortfolioPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Fetch facilities from API
  useEffect(() => {
    async function fetchFacilities() {
      try {
        const response = await fetch('/api/facilities');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFacilities(data.data);
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

  // Calculate portfolio summary from real data
  const portfolioSummary = useMemo(() => {
    const totalBeds = facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);

    // Group by state
    const byState = facilities.reduce((acc, f) => {
      const state = f.state || 'Unknown';
      if (!acc[state]) {
        acc[state] = { facilities: 0, beds: 0 };
      }
      acc[state].facilities++;
      acc[state].beds += f.licensedBeds || 0;
      return acc;
    }, {} as Record<string, { facilities: number; beds: number }>);

    const stateConcentration = Object.entries(byState)
      .map(([state, data]) => ({
        state,
        facilities: data.facilities,
        beds: data.beds,
        percent: totalBeds > 0 ? data.beds / totalBeds : 0,
      }))
      .sort((a, b) => b.beds - a.beds)
      .slice(0, 5);

    // Group by asset type
    const byType = facilities.reduce((acc, f) => {
      const type = f.assetType || 'SNF';
      if (!acc[type]) {
        acc[type] = { facilities: 0, beds: 0 };
      }
      acc[type].facilities++;
      acc[type].beds += f.licensedBeds || 0;
      return acc;
    }, {} as Record<string, { facilities: number; beds: number }>);

    const assetTypeBreakdown = Object.entries(byType)
      .map(([type, data]) => ({
        type,
        facilities: data.facilities,
        beds: data.beds,
        percent: totalBeds > 0 ? data.beds / totalBeds : 0,
      }))
      .sort((a, b) => b.beds - a.beds);

    return {
      totalFacilities: facilities.length,
      totalBeds,
      stateConcentration,
      assetTypeBreakdown,
    };
  }, [facilities]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Portfolio"
          description="Current holdings and portfolio-level intelligence"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-pulse text-gray-500">Loading portfolio...</div>
        </div>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Portfolio"
          description="Current holdings and portfolio-level intelligence"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities in portfolio</h3>
          <p className="text-sm text-gray-500 mb-4">
            Portfolio data will appear here once facilities are added
          </p>
        </div>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{portfolioSummary.totalFacilities}</p>
                <p className="text-sm text-surface-500">Facilities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-surface-100">
                <Users className="w-6 h-6 text-surface-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{portfolioSummary.totalBeds.toLocaleString()}</p>
                <p className="text-sm text-surface-500">Total Beds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{portfolioSummary.stateConcentration.length}</p>
                <p className="text-sm text-surface-500">States</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{portfolioSummary.assetTypeBreakdown.length}</p>
                <p className="text-sm text-surface-500">Asset Types</p>
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
                    <span className="font-medium text-surface-900">{item.state}</span>
                    <span className="text-surface-600">
                      {item.facilities} facilities • {item.beds} beds
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.percent > 0.5 ? 'bg-status-warning' : 'bg-accent'
                      }`}
                      style={{ width: `${item.percent * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-surface-500 text-right">
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
                    <span className="font-medium text-surface-900">
                      {item.type === 'SNF' ? 'Skilled Nursing' : item.type === 'ALF' ? 'Assisted Living' : 'Independent Living'}
                    </span>
                    <span className="text-surface-600">
                      {item.facilities} facilities • {item.beds} beds
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.type === 'SNF' ? 'bg-blue-500' :
                        item.type === 'ALF' ? 'bg-purple-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${item.percent * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-surface-500 text-right">
                    {formatPercent(item.percent, 0)} of portfolio
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Facilities</CardTitle>
          <CardDescription>All {portfolioSummary.totalFacilities} Cascadia facilities</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Licensed Beds</TableHead>
                <TableHead className="text-right">Certified Beds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell>
                    <span className="font-medium text-surface-900">
                      {facility.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      facility.assetType === 'SNF' ? 'default' :
                      facility.assetType === 'ALF' ? 'info' : 'success'
                    }>
                      {facility.assetType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-surface-600">
                      <MapPin className="w-3 h-3" />
                      {facility.city}, {facility.state}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{facility.licensedBeds}</TableCell>
                  <TableCell className="text-right tabular-nums">{facility.certifiedBeds}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
