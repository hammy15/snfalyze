'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator, ConfidenceBreakdown } from '@/components/ui/confidence-indicator';
import { ValueRange, OfferGuidance } from '@/components/ui/value-range';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Bed,
  Clock,
  ExternalLink,
} from 'lucide-react';

// Mock deal data
const mockDeal = {
  id: '1',
  name: 'Sunrise Gardens SNF',
  status: 'reviewed',
  assetType: 'SNF',
  beds: 120,
  certifiedBeds: 118,
  state: 'WA',
  city: 'Seattle',
  address: '1234 Healthcare Ave, Seattle, WA 98101',
  yearBuilt: 1985,
  lastRenovation: 2018,
  sqft: 45000,
  broker: 'Marcus & Millichap',
  brokerContact: 'John Smith',
  askingPrice: 9500000,

  // Valuation - External View
  externalValuation: {
    valueLow: 7200000,
    valueBase: 8100000,
    valueHigh: 8900000,
    capRateLow: 0.13,
    capRateBase: 0.125,
    capRateHigh: 0.12,
    noiUsed: 1012500,
    pricePerBed: 67500,
    confidenceScore: 72,
    confidenceNarrative: 'Moderate confidence due to census assumptions and agency labor exposure.',
  },

  // Valuation - Cascadia View
  cascadiaValuation: {
    valueLow: 8500000,
    valueBase: 9800000,
    valueHigh: 11200000,
    capRateLow: 0.115,
    capRateBase: 0.11,
    capRateHigh: 0.105,
    noiUsed: 1078000,
    pricePerBed: 81667,
    confidenceScore: 78,
    confidenceNarrative: 'Higher confidence with Cascadia execution capability on labor arbitrage and census recovery.',
    upsideScenario: {
      description: 'Full labor arbitrage + census recovery to 92%',
      potentialValue: 12500000,
      timelineMonths: 18,
    },
  },

  // Offer Guidance
  suggestedOffer: 8200000,
  walkAwayThreshold: 9400000,

  // Financials
  financials: {
    totalRevenue: 7800000,
    medicareRevenue: 2340000,
    medicaidRevenue: 3900000,
    managedCareRevenue: 1170000,
    privatePayRevenue: 390000,
    laborCost: 4524000,
    coreLabor: 3846000,
    agencyLabor: 678000,
    agencyPercent: 0.15,
    ebitdar: 1170000,
    ebitdarMargin: 0.15,
    normalizedNoi: 1012500,
  },

  // Census
  census: {
    averageDailyCensus: 102,
    occupancy: 0.85,
    medicarePercent: 0.18,
    medicaidPercent: 0.62,
    managedCarePercent: 0.12,
    privatePayPercent: 0.08,
  },

  // Regulatory
  regulatory: {
    cmsRating: 3,
    healthRating: 3,
    staffingRating: 2,
    qualityRating: 3,
    isSff: false,
    recentDeficiencies: 4,
    lastSurveyDate: '2023-11-15',
  },

  // CapEx
  capEx: {
    immediate: 180000,
    deferred: 420000,
    competitive: 600000,
    total: 1200000,
    perBed: 10000,
  },

  // Assumptions
  assumptions: [
    { field: 'Census annualization', category: 'census', impact: 5, reason: 'Partial year data annualized' },
    { field: 'Agency labor reduction', category: 'labor', impact: 5, reason: 'Assumed 50% agency reduction achievable' },
    { field: 'Market rent adjustment', category: 'minor', impact: 3, reason: 'Below-market rent normalized' },
  ],

  // Critical Questions
  whatMustGoRightFirst: [
    'Successful recruitment of 3-4 core RNs to reduce agency dependency',
    'Census recovery from 85% to 90%+ within 12 months',
    'No new survey deficiencies during transition',
  ],
  whatCannotGoWrong: [
    'Administrator retention - current admin is key to referral relationships',
    'Medicaid rate stability - any rate cut would significantly impact NOI',
  ],
  whatBreaksThisDeal: [
    'Discovery of undisclosed regulatory issues',
    'Key staff departures during diligence',
    'Labor market tightening making agency reduction impossible',
  ],
  whatRiskIsUnderpriced: [
    'Agency labor upside - market assumes this is permanent',
    'Referral relationship strength - current admin has deep hospital connections',
  ],

  // Partner Matches
  partnerMatches: [
    { name: 'Northwest Healthcare REIT', matchScore: 92, expectedYield: 0.11, probabilityOfClose: 0.85 },
    { name: 'Pacific Senior Lending', matchScore: 88, expectedYield: 0.095, probabilityOfClose: 0.90 },
    { name: 'Cascade Capital Partners', matchScore: 75, expectedYield: 0.125, probabilityOfClose: 0.70 },
  ],
};

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'valuation' | 'ic'>('overview');

  const deal = mockDeal; // In real app, fetch by params.id

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'valuation', label: 'Dual Valuation' },
    { id: 'ic', label: 'IC Summary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Link */}
      <Link
        href="/deals"
        className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deals
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-surface-900">{deal.name}</h1>
            <Badge variant="success">Reviewed</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {deal.assetType}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {deal.beds} beds
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {deal.city}, {deal.state}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            Generate LOI
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Value Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Valuation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ValueRange
                  low={deal.cascadiaValuation.valueLow}
                  base={deal.cascadiaValuation.valueBase}
                  high={deal.cascadiaValuation.valueHigh}
                  label="Cascadia View"
                  compact
                />
                <div className="mt-6 pt-6 border-t border-surface-200">
                  <OfferGuidance
                    suggestedOffer={deal.suggestedOffer}
                    walkAway={deal.walkAwayThreshold}
                    upside={deal.cascadiaValuation.upsideScenario?.potentialValue}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-surface-500">Occupancy</p>
                    <p className="text-xl font-semibold text-surface-900">
                      {formatPercent(deal.census.occupancy, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">EBITDAR Margin</p>
                    <p className="text-xl font-semibold text-surface-900">
                      {formatPercent(deal.financials.ebitdarMargin, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Agency Labor</p>
                    <p className="text-xl font-semibold text-status-warning">
                      {formatPercent(deal.financials.agencyPercent, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">CMS Rating</p>
                    <p className="text-xl font-semibold text-surface-900">
                      {deal.regulatory.cmsRating}/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regulatory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-surface-50 rounded-lg">
                    <p className="text-2xl font-bold text-surface-900">{deal.regulatory.cmsRating}</p>
                    <p className="text-xs text-surface-500 mt-1">Overall</p>
                  </div>
                  <div className="text-center p-4 bg-surface-50 rounded-lg">
                    <p className="text-2xl font-bold text-surface-900">{deal.regulatory.healthRating}</p>
                    <p className="text-xs text-surface-500 mt-1">Health</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-status-warning">{deal.regulatory.staffingRating}</p>
                    <p className="text-xs text-surface-500 mt-1">Staffing</p>
                  </div>
                  <div className="text-center p-4 bg-surface-50 rounded-lg">
                    <p className="text-2xl font-bold text-surface-900">{deal.regulatory.qualityRating}</p>
                    <p className="text-xs text-surface-500 mt-1">Quality</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-surface-500">
                  Last survey: {deal.regulatory.lastSurveyDate} • {deal.regulatory.recentDeficiencies} deficiencies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confidence */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <ConfidenceIndicator
                  score={deal.cascadiaValuation.confidenceScore}
                  narrative={deal.cascadiaValuation.confidenceNarrative}
                />
                <div className="mt-6 pt-6 border-t border-surface-200">
                  <ConfidenceBreakdown assumptions={deal.assumptions} />
                </div>
              </CardContent>
            </Card>

            {/* CapEx */}
            <Card>
              <CardHeader>
                <CardTitle>CapEx Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-600">Immediate</span>
                    <span className="font-medium text-status-error">{formatCurrency(deal.capEx.immediate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-600">Deferred</span>
                    <span className="font-medium text-status-warning">{formatCurrency(deal.capEx.deferred)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-600">Competitive</span>
                    <span className="font-medium text-surface-700">{formatCurrency(deal.capEx.competitive)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-surface-200">
                    <span className="font-medium text-surface-900">Total</span>
                    <span className="font-bold text-surface-900">{formatCurrency(deal.capEx.total)}</span>
                  </div>
                  <p className="text-xs text-surface-500">
                    {formatCurrency(deal.capEx.perBed)} per bed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-surface-500">Address</span>
                    <span className="text-surface-700 text-right">{deal.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Year Built</span>
                    <span className="text-surface-700">{deal.yearBuilt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Last Renovation</span>
                    <span className="text-surface-700">{deal.lastRenovation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Square Footage</span>
                    <span className="text-surface-700">{deal.sqft.toLocaleString()} SF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Broker</span>
                    <span className="text-surface-700">{deal.broker}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Dual Valuation Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* External View */}
            <Card variant="external">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-surface-500" />
                  <CardTitle>External / Lender View</CardTitle>
                </div>
                <CardDescription>
                  Conservative, yield-driven assumptions typical of banks and REITs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ValueRange
                  low={deal.externalValuation.valueLow}
                  base={deal.externalValuation.valueBase}
                  high={deal.externalValuation.valueHigh}
                  compact
                />

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-200">
                  <div>
                    <p className="text-sm text-surface-500">Cap Rate Range</p>
                    <p className="font-medium text-surface-900">
                      {formatPercent(deal.externalValuation.capRateHigh, 1)} - {formatPercent(deal.externalValuation.capRateLow, 1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">NOI Used</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(deal.externalValuation.noiUsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Price/Bed</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(deal.externalValuation.pricePerBed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Confidence</p>
                    <p className="font-medium text-surface-900">
                      {deal.externalValuation.confidenceScore}/100
                    </p>
                  </div>
                </div>

                <p className="text-sm text-surface-600 italic">
                  {deal.externalValuation.confidenceNarrative}
                </p>
              </CardContent>
            </Card>

            {/* Cascadia View */}
            <Card variant="cascadia">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <CardTitle>Cascadia Execution View</CardTitle>
                </div>
                <CardDescription>
                  Opportunity-aware assumptions based on Cascadia's operational capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ValueRange
                  low={deal.cascadiaValuation.valueLow}
                  base={deal.cascadiaValuation.valueBase}
                  high={deal.cascadiaValuation.valueHigh}
                  compact
                />

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-200">
                  <div>
                    <p className="text-sm text-surface-500">Cap Rate Range</p>
                    <p className="font-medium text-surface-900">
                      {formatPercent(deal.cascadiaValuation.capRateHigh, 1)} - {formatPercent(deal.cascadiaValuation.capRateLow, 1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">NOI Used</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(deal.cascadiaValuation.noiUsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Price/Bed</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(deal.cascadiaValuation.pricePerBed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Confidence</p>
                    <p className="font-medium text-surface-900">
                      {deal.cascadiaValuation.confidenceScore}/100
                    </p>
                  </div>
                </div>

                {deal.cascadiaValuation.upsideScenario && (
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-sm font-medium text-accent mb-1">Upside Scenario</p>
                    <p className="text-sm text-surface-700">
                      {deal.cascadiaValuation.upsideScenario.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-lg font-bold text-accent">
                        {formatCurrency(deal.cascadiaValuation.upsideScenario.potentialValue, true)}
                      </span>
                      <span className="text-xs text-surface-500">
                        in {deal.cascadiaValuation.upsideScenario.timelineMonths} months
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-surface-600 italic">
                  {deal.cascadiaValuation.confidenceNarrative}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Offer Guidance */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Guidance</CardTitle>
              <CardDescription>
                Based on dual valuation analysis and market positioning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-sm text-surface-500 mb-2">Suggested Starting Offer</p>
                  <p className="text-3xl font-bold text-accent">{formatCurrency(deal.suggestedOffer, true)}</p>
                  <p className="text-xs text-surface-500 mt-2">Conservative entry point</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-status-warning/5 border border-status-warning/20">
                  <p className="text-sm text-surface-500 mb-2">Walk-Away Threshold</p>
                  <p className="text-3xl font-bold text-status-warning">{formatCurrency(deal.walkAwayThreshold, true)}</p>
                  <p className="text-xs text-surface-500 mt-2">Maximum defensible price</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-surface-50">
                  <p className="text-sm text-surface-500 mb-2">Asking Price</p>
                  <p className="text-3xl font-bold text-surface-700">{formatCurrency(deal.askingPrice, true)}</p>
                  <p className="text-xs text-surface-500 mt-2">Broker listed price</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capital Partner Matches */}
          <Card>
            <CardHeader>
              <CardTitle>Capital Partner Simulation</CardTitle>
              <CardDescription>
                Best-fit partners based on deal characteristics and partner preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Expected Yield</TableHead>
                    <TableHead>Probability of Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deal.partnerMatches.map((partner, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-surface-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${partner.matchScore}%` }}
                            />
                          </div>
                          <span className="text-sm">{partner.matchScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPercent(partner.expectedYield, 1)}</TableCell>
                      <TableCell>
                        <Badge variant={partner.probabilityOfClose >= 0.85 ? 'success' : 'warning'}>
                          {formatPercent(partner.probabilityOfClose, 0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Payor</CardTitle>
              <CardDescription>Trailing 12-month revenue distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-surface-600">Total Revenue</span>
                  <span className="text-xl font-bold text-surface-900">
                    {formatCurrency(deal.financials.totalRevenue)}
                  </span>
                </div>
                <div className="space-y-3 pt-4 border-t border-surface-200">
                  {[
                    { label: 'Medicare', value: deal.financials.medicareRevenue, percent: deal.census.medicarePercent, color: 'bg-blue-500' },
                    { label: 'Medicaid', value: deal.financials.medicaidRevenue, percent: deal.census.medicaidPercent, color: 'bg-green-500' },
                    { label: 'Managed Care', value: deal.financials.managedCareRevenue, percent: deal.census.managedCarePercent, color: 'bg-purple-500' },
                    { label: 'Private Pay', value: deal.financials.privatePayRevenue, percent: deal.census.privatePayPercent, color: 'bg-orange-500' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-600">{item.label}</span>
                        <span className="font-medium text-surface-900">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.percent * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-surface-500 text-right">{formatPercent(item.percent, 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Labor Analysis</CardTitle>
              <CardDescription>Staffing costs and agency exposure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-surface-600">Total Labor Cost</span>
                  <span className="text-xl font-bold text-surface-900">
                    {formatCurrency(deal.financials.laborCost)}
                  </span>
                </div>
                <div className="space-y-3 pt-4 border-t border-surface-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600">Core Labor</span>
                    <span className="font-medium text-surface-900">
                      {formatCurrency(deal.financials.coreLabor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-surface-600">Agency Labor</span>
                      {deal.financials.agencyPercent > 0.10 && (
                        <AlertTriangle className="w-4 h-4 text-status-warning" />
                      )}
                    </div>
                    <span className="font-medium text-status-warning">
                      {formatCurrency(deal.financials.agencyLabor)}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-status-warning/10 border border-status-warning/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-700">Agency % of Nursing</span>
                    <span className="text-lg font-bold text-status-warning">
                      {formatPercent(deal.financials.agencyPercent, 0)}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 mt-2">
                    Industry healthy: &lt;5% | This facility: opportunity for labor arbitrage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profitability */}
          <Card>
            <CardHeader>
              <CardTitle>Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-surface-200">
                  <span className="text-sm text-surface-600">EBITDAR</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-surface-900">
                      {formatCurrency(deal.financials.ebitdar)}
                    </span>
                    <span className="text-sm text-surface-500 ml-2">
                      ({formatPercent(deal.financials.ebitdarMargin, 0)} margin)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-surface-600">Normalized NOI</span>
                  <span className="text-xl font-bold text-accent">
                    {formatCurrency(deal.financials.normalizedNoi)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Census */}
          <Card>
            <CardHeader>
              <CardTitle>Census Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-surface-50">
                    <p className="text-3xl font-bold text-surface-900">{deal.census.averageDailyCensus}</p>
                    <p className="text-xs text-surface-500 mt-1">Average Daily Census</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/10">
                    <p className="text-3xl font-bold text-accent">{formatPercent(deal.census.occupancy, 0)}</p>
                    <p className="text-xs text-surface-500 mt-1">Occupancy Rate</p>
                  </div>
                </div>
                <p className="text-sm text-surface-500">
                  Licensed beds: {deal.beds} | Certified beds: {deal.certifiedBeds}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'ic' && (
        <div className="space-y-6">
          {/* IC Summary Header */}
          <Card>
            <CardContent className="py-8">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-surface-900 mb-2">{deal.name}</h2>
                <p className="text-surface-500 mb-6">
                  Investment Committee Summary | {deal.assetType} | {deal.beds} Beds | {deal.city}, {deal.state}
                </p>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-sm text-surface-500">Suggested Offer</p>
                    <p className="text-2xl font-bold text-accent">{formatCurrency(deal.suggestedOffer, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Walk-Away</p>
                    <p className="text-2xl font-bold text-status-warning">{formatCurrency(deal.walkAwayThreshold, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Confidence</p>
                    <p className="text-2xl font-bold text-surface-900">{deal.cascadiaValuation.confidenceScore}/100</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-status-success" />
                  <CardTitle>What Must Go Right First</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {deal.whatMustGoRightFirst.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                      <span className="w-5 h-5 rounded-full bg-status-success/10 text-status-success text-xs flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-status-error" />
                  <CardTitle>What Cannot Go Wrong</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {deal.whatCannotGoWrong.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                      <span className="w-5 h-5 rounded-full bg-status-error/10 text-status-error text-xs flex items-center justify-center mt-0.5">
                        !
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-status-warning" />
                  <CardTitle>What Breaks This Deal</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {deal.whatBreaksThisDeal.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                      <span className="w-5 h-5 rounded-full bg-status-warning/10 text-status-warning text-xs flex items-center justify-center mt-0.5">
                        X
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <CardTitle>What Risk Is Underpriced</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {deal.whatRiskIsUnderpriced.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center mt-0.5">
                        $
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Print/Export Section */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">
                    This summary is designed to be board-ready and printable
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary">
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button>
                    Present to IC
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
