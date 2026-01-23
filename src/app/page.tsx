'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from '@/components/ui/confidence-indicator';
import { formatCurrency } from '@/lib/utils';
import {
  Upload,
  FolderKanban,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

// Mock data for demonstration
const recentDeals = [
  {
    id: '1',
    name: 'Sunrise Gardens SNF',
    status: 'analyzing',
    assetType: 'SNF',
    beds: 120,
    state: 'WA',
    confidence: 72,
    valueBase: 8500000,
  },
  {
    id: '2',
    name: 'Pacific Assisted Living Portfolio',
    status: 'reviewed',
    assetType: 'ALF',
    beds: 85,
    state: 'OR',
    confidence: 85,
    valueBase: 12200000,
  },
  {
    id: '3',
    name: 'Evergreen Care Center',
    status: 'under_loi',
    assetType: 'SNF',
    beds: 150,
    state: 'CA',
    confidence: 78,
    valueBase: 15800000,
  },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  new: { label: 'New', variant: 'info' },
  analyzing: { label: 'Analyzing', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'success' },
  under_loi: { label: 'Under LOI', variant: 'info' },
  due_diligence: { label: 'Due Diligence', variant: 'warning' },
  closed: { label: 'Closed', variant: 'success' },
  passed: { label: 'Passed', variant: 'default' },
};

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Cascadia Healthcare underwriting intelligence platform"
        actions={
          <Link href="/upload">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Deal
            </Button>
          </Link>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <FolderKanban className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">12</p>
                <p className="text-sm text-cascadia-500">Active Deals</p>
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
                <p className="text-2xl font-bold text-cascadia-900">3</p>
                <p className="text-sm text-cascadia-500">Under LOI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-warning/10">
                <Clock className="w-6 h-6 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cascadia-900">5</p>
                <p className="text-sm text-cascadia-500">Awaiting Review</p>
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
                <p className="text-2xl font-bold text-cascadia-900">$156M</p>
                <p className="text-sm text-cascadia-500">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-accent/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-accent/10">
                <Upload className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-cascadia-900 mb-2">
                  Upload Deal Information
                </h3>
                <p className="text-sm text-cascadia-600 mb-4">
                  Drop PDFs, Excel files, or images. SNFalyze will automatically extract,
                  normalize, and analyze all financial data.
                </p>
                <Link href="/upload">
                  <Button>
                    Start Analysis
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-cascadia-100">
                <Building2 className="w-8 h-8 text-cascadia-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-cascadia-900 mb-2">
                  View Portfolio
                </h3>
                <p className="text-sm text-cascadia-600 mb-4">
                  Review current holdings, assess capital concentration, and evaluate
                  new deals in portfolio context.
                </p>
                <Link href="/portfolio">
                  <Button variant="secondary">
                    View Portfolio
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Latest deals in your pipeline</CardDescription>
            </div>
            <Link href="/deals">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeals.map((deal) => {
              const status = statusConfig[deal.status];
              return (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="block p-4 rounded-lg border border-cascadia-200 hover:border-accent/50 hover:bg-cascadia-50/50 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-cascadia-900">{deal.name}</h4>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-cascadia-500">
                        <span>{deal.assetType}</span>
                        <span>{deal.beds} beds</span>
                        <span>{deal.state}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-cascadia-500">Base Value</p>
                        <p className="font-semibold text-cascadia-900 tabular-nums">
                          {formatCurrency(deal.valueBase, true)}
                        </p>
                      </div>
                      <div className="w-32">
                        <ConfidenceIndicator score={deal.confidence} showLabel={false} size="sm" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Capabilities</CardTitle>
          <CardDescription>
            SNFalyze analyzes deals using Cascadia's execution philosophy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-cascadia-900">Document Processing</h4>
              <ul className="text-sm text-cascadia-600 space-y-1">
                <li>OCR for scanned documents</li>
                <li>Multi-tab Excel extraction</li>
                <li>Automatic T12 reconstruction</li>
                <li>COA normalization</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-cascadia-900">Dual Valuation</h4>
              <ul className="text-sm text-cascadia-600 space-y-1">
                <li>External / lender view</li>
                <li>Cascadia execution view</li>
                <li>Value ranges, not point estimates</li>
                <li>Confidence scoring</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-cascadia-900">Deal Intelligence</h4>
              <ul className="text-sm text-cascadia-600 space-y-1">
                <li>Capital partner simulation</li>
                <li>Risk pricing, not avoidance</li>
                <li>Analog deal references</li>
                <li>Portfolio context</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
