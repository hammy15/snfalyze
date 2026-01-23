'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabList, Tab, TabsContent as TabPanel } from '@/components/ui/tabs';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { StatCard } from '@/components/ui/stat-card';
import { RiskBadge, QualityRating, StatusPill } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Star,
  Phone,
  Mail,
  Globe,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Plus,
  ExternalLink,
  Edit,
  Share2,
  MoreHorizontal,
  Download,
  MessageSquare,
  History,
  Clipboard,
  PieChart,
} from 'lucide-react';

// Mock facility data
const mockFacility = {
  id: '1',
  name: 'Sunrise Care Center',
  address: '1234 Healthcare Ave',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90210',
  county: 'Los Angeles County',
  type: 'snf' as const,
  beds: 120,
  certifiedBeds: 118,
  occupancy: 87,
  averageOccupancy: 85,
  riskLevel: 'high' as const,
  riskScore: 78,
  previousRiskScore: 65,
  qualityRating: 3 as const,
  healthRating: 2 as const,
  staffingRating: 3 as const,
  qmRating: 4 as const,
  owner: 'ABC Healthcare Holdings',
  operator: 'Sunrise Operations LLC',
  managementCompany: 'Sunrise Management Inc',
  phone: '(310) 555-1234',
  fax: '(310) 555-1235',
  email: 'admin@sunrisecare.example.com',
  website: 'https://sunrisecare.example.com',
  cmsId: '555123',
  licenseNumber: 'CA-SNF-2024-1234',
  lastSurvey: new Date('2024-01-15'),
  deficiencies: 8,
  iJDeficiencies: 0,
  complaints: 3,
  fines: 25000,
  payerMix: {
    medicare: 32,
    medicaid: 45,
    private: 18,
    other: 5,
  },
  staffing: {
    rnHPRD: 0.45,
    totalNurseHPRD: 3.2,
    rnTurnover: 28,
    adminTurnover: 15,
  },
  financials: {
    estimatedRevenue: 12500000,
    pricePerBed: 95000,
    marketValue: 11400000,
  },
  isTarget: true,
  targetStatus: 'diligence' as const,
};

const surveyHistory: TimelineItem[] = [
  {
    id: '1',
    type: 'survey',
    title: 'Standard Health Survey',
    description: '8 deficiencies cited. Tags: F-684, F-689, F-756, F-880.',
    date: new Date('2024-01-15'),
    metadata: { 'Scope & Severity': 'D, E, F' },
  },
  {
    id: '2',
    type: 'survey',
    title: 'Complaint Investigation',
    description: 'Complaint substantiated. 1 deficiency cited.',
    date: new Date('2023-11-20'),
    metadata: { 'Tags': 'F-684' },
  },
  {
    id: '3',
    type: 'survey',
    title: 'Standard Health Survey',
    description: '5 deficiencies cited. No immediate jeopardy.',
    date: new Date('2023-01-10'),
    metadata: { 'Scope & Severity': 'D, E' },
  },
  {
    id: '4',
    type: 'survey',
    title: 'Fire Safety Survey',
    description: 'No deficiencies cited.',
    date: new Date('2022-08-05'),
  },
];

const ownershipHistory: TimelineItem[] = [
  {
    id: '1',
    type: 'ownership',
    title: 'Current: ABC Healthcare Holdings',
    description: 'Acquired from XYZ Senior Care for $11.2M ($93k/bed)',
    date: new Date('2022-03-15'),
  },
  {
    id: '2',
    type: 'ownership',
    title: 'Previous: XYZ Senior Care',
    description: 'Owned for 8 years',
    date: new Date('2014-06-01'),
  },
  {
    id: '3',
    type: 'ownership',
    title: 'Original: Community Health Partners',
    description: 'Facility opened',
    date: new Date('2001-01-15'),
  },
];

const activityFeed: TimelineItem[] = [
  {
    id: '1',
    type: 'risk',
    title: 'Risk Score Increased',
    description: 'Risk score changed from 65 → 78 due to staffing decline and survey results.',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'note',
    title: 'Note Added by Sarah Chen',
    description: 'Spoke with operator about staffing challenges. They are actively recruiting.',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'stage',
    title: 'Deal Stage Updated',
    description: 'Moved to Diligence stage by Mike R.',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'survey',
    title: 'Survey Results Published',
    description: 'CMS published survey results with 8 deficiencies.',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
];

const notes = [
  {
    id: '1',
    author: 'Sarah Chen',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    content: 'Spoke with operator regarding staffing challenges. They mentioned difficulty recruiting RNs in the LA market. Planning to offer sign-on bonuses starting Q2.',
  },
  {
    id: '2',
    author: 'Mike Rodriguez',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    content: 'Site visit completed. Building is in good condition. Kitchen was recently renovated. Parking lot needs repaving.',
  },
  {
    id: '3',
    author: 'You',
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    content: 'Initial assessment complete. Strong location with favorable demographics. Current owner appears motivated to sell.',
  },
];

export default function FacilityDetailPage({ params }: { params: { id: string } }) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const facility = mockFacility;

  const typeLabels = {
    snf: 'Skilled Nursing Facility',
    alf: 'Assisted Living Facility',
    ilf: 'Independent Living Facility',
    ccrc: 'Continuing Care Retirement Community',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
        <Link
          href="/app/facilities"
          className="flex items-center gap-1 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Facilities
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">{facility.name}</span>
      </div>

      {/* Page Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {facility.name}
              </h1>
              {facility.isTarget && (
                <StatusPill status={facility.targetStatus} size="sm" />
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {facility.address}, {facility.city}, {facility.state} {facility.zip}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {typeLabels[facility.type]}
              </span>
              <span className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
                CMS: {facility.cmsId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {facility.isTarget ? (
              <Link href={`/app/deals/${facility.id}`} className="btn btn-primary btn-sm">
                <FileText className="w-4 h-4" />
                View Deal
              </Link>
            ) : (
              <button className="btn btn-primary btn-sm">
                <Target className="w-4 h-4" />
                Add to Targets
              </button>
            )}
            <button className="btn btn-secondary btn-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="btn btn-ghost btn-sm p-2"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreActions(false)} />
                  <div className="dropdown-menu right-0 left-auto z-20 w-48">
                    <button className="dropdown-item w-full text-left">
                      <Download className="w-4 h-4" />
                      Export PDF
                    </button>
                    <button className="dropdown-item w-full text-left">
                      <ExternalLink className="w-4 h-4" />
                      View on CMS
                    </button>
                    <button className="dropdown-item w-full text-left">
                      <Edit className="w-4 h-4" />
                      Edit Details
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-[var(--color-border-muted)]">
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
              {facility.beds}
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Licensed Beds</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
              {facility.occupancy}%
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Occupancy</div>
          </div>
          <div className="text-center">
            <RiskBadge level={facility.riskLevel} score={facility.riskScore} showScore />
          </div>
          <div className="text-center">
            <QualityRating rating={facility.qualityRating} showLabel />
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
              {facility.deficiencies}
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Deficiencies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
              ${(facility.financials.pricePerBed / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Est. $/Bed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview" icon={<PieChart className="w-4 h-4" />}>Overview</Tab>
          <Tab id="surveys" icon={<Clipboard className="w-4 h-4" />} badge={surveyHistory.length}>Surveys</Tab>
          <Tab id="financials" icon={<DollarSign className="w-4 h-4" />}>Financials</Tab>
          <Tab id="ownership" icon={<History className="w-4 h-4" />}>Ownership</Tab>
          <Tab id="notes" icon={<MessageSquare className="w-4 h-4" />} badge={notes.length}>Notes</Tab>
        </TabList>

        {/* Overview Tab */}
        <TabPanel id="overview">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Risk Analysis */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Risk Analysis
                  </h2>
                </div>
                <div className="card-body">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-[var(--color-text-secondary)]">Current Risk Score</span>
                        <RiskBadge level={facility.riskLevel} score={facility.riskScore} showScore />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {facility.riskScore > facility.previousRiskScore ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-[var(--status-error-icon)]" />
                            <span className="text-[var(--status-error-text)]">
                              +{facility.riskScore - facility.previousRiskScore} from last assessment
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-[var(--status-success-icon)]" />
                            <span className="text-[var(--status-success-text)]">
                              {facility.riskScore - facility.previousRiskScore} from last assessment
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Risk Drivers</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[var(--status-error-icon)]" />
                          <span className="text-sm">Staffing below benchmark (3.2 vs 3.8 HPRD)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[var(--status-warning-icon)]" />
                          <span className="text-sm">8 deficiencies in last survey</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-[var(--status-success-icon)]" />
                          <span className="text-sm">No immediate jeopardy citations</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Ratings */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Quality Ratings (CMS 5-Star)
                  </h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                      <QualityRating rating={facility.qualityRating} />
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Overall</div>
                    </div>
                    <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                      <QualityRating rating={facility.healthRating}  />
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Health Inspection</div>
                    </div>
                    <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                      <QualityRating rating={facility.staffingRating}  />
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Staffing</div>
                    </div>
                    <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                      <QualityRating rating={facility.qmRating}  />
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Quality Measures</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staffing */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Staffing Metrics
                  </h2>
                </div>
                <div className="card-body">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-3">Hours Per Resident Day</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">RN HPRD</span>
                          <span className={cn(
                            'font-medium tabular-nums',
                            facility.staffing.rnHPRD < 0.5 ? 'text-[var(--status-error-text)]' : 'text-[var(--color-text-primary)]'
                          )}>
                            {facility.staffing.rnHPRD.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">Total Nurse HPRD</span>
                          <span className={cn(
                            'font-medium tabular-nums',
                            facility.staffing.totalNurseHPRD < 3.5 ? 'text-[var(--status-warning-text)]' : 'text-[var(--color-text-primary)]'
                          )}>
                            {facility.staffing.totalNurseHPRD.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-3">Turnover Rates</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">RN Turnover</span>
                          <span className={cn(
                            'font-medium tabular-nums',
                            facility.staffing.rnTurnover > 25 ? 'text-[var(--status-error-text)]' : 'text-[var(--color-text-primary)]'
                          )}>
                            {facility.staffing.rnTurnover}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">Admin Turnover</span>
                          <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                            {facility.staffing.adminTurnover}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Activity & Contact */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Recent Activity
                  </h2>
                </div>
                <div className="card-body">
                  <Timeline items={activityFeed.slice(0, 4)} />
                </div>
              </div>

              {/* Contact Info */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Contact Information
                  </h2>
                </div>
                <div className="card-body space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--color-text-disabled)]" />
                    <a href={`tel:${facility.phone}`} className="text-sm text-[var(--accent-solid)] hover:underline">
                      {facility.phone}
                    </a>
                  </div>
                  {facility.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-[var(--color-text-disabled)]" />
                      <a href={`mailto:${facility.email}`} className="text-sm text-[var(--accent-solid)] hover:underline">
                        {facility.email}
                      </a>
                    </div>
                  )}
                  {facility.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[var(--color-text-disabled)]" />
                      <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent-solid)] hover:underline truncate">
                        {facility.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Ownership Summary */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Ownership
                  </h2>
                </div>
                <div className="card-body space-y-3">
                  <div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Owner</div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{facility.owner}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Operator</div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{facility.operator}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Management</div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{facility.managementCompany}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* Surveys Tab */}
        <TabPanel id="surveys">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Survey History
                </h2>
                <a
                  href={`https://www.medicare.gov/care-compare/details/nursing-home/${facility.cmsId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  View on CMS
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-[var(--gray-50)] rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                    {facility.deficiencies}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Total Deficiencies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[var(--status-success-text)] tabular-nums">
                    {facility.iJDeficiencies}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Immediate Jeopardy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                    {facility.complaints}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Complaints (3yr)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-[var(--status-error-text)] tabular-nums">
                    ${(facility.fines / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Fines (3yr)</div>
                </div>
              </div>
              <Timeline items={surveyHistory} />
            </div>
          </div>
        </TabPanel>

        {/* Financials Tab */}
        <TabPanel id="financials">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Payer Mix
                </h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {Object.entries(facility.payerMix).map(([payer, percent]) => (
                    <div key={payer}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[var(--color-text-secondary)] capitalize">{payer}</span>
                        <span className="text-sm font-medium tabular-nums">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            payer === 'medicare' && 'bg-blue-500',
                            payer === 'medicaid' && 'bg-green-500',
                            payer === 'private' && 'bg-purple-500',
                            payer === 'other' && 'bg-gray-400'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Valuation Estimates
                </h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-muted)]">
                    <span className="text-sm text-[var(--color-text-secondary)]">Estimated Revenue</span>
                    <span className="text-lg font-semibold tabular-nums">
                      ${(facility.financials.estimatedRevenue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-muted)]">
                    <span className="text-sm text-[var(--color-text-secondary)]">Est. Price/Bed</span>
                    <span className="text-lg font-semibold tabular-nums">
                      ${(facility.financials.pricePerBed / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-[var(--color-text-secondary)]">Est. Market Value</span>
                    <span className="text-lg font-semibold tabular-nums">
                      ${(facility.financials.marketValue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
                  * Estimates based on comparable transactions and market data. Not investment advice.
                </p>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* Ownership Tab */}
        <TabPanel id="ownership">
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Ownership History
              </h2>
            </div>
            <div className="card-body">
              <Timeline items={ownershipHistory} />
            </div>
          </div>
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel id="notes">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Notes & Comments
                </h2>
                <button className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-muted)]">
              {notes.map((note) => (
                <div key={note.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {note.author.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                          {note.author}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          {note.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] pl-10">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
