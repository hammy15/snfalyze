'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Target,
  Shield,
  Calculator,
  FileText,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancingOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
  pros: string[];
  cons: string[];
  metrics: {
    label: string;
    value: string;
    highlight?: boolean;
  }[];
  suitability: 'excellent' | 'good' | 'fair' | 'poor';
  riskLevel: 'low' | 'moderate' | 'high';
}

interface DealFinancials {
  purchasePrice: number;
  noi: number;
  ebitdar: number;
  beds: number;
  occupancy: number;
  dealName: string;
}

export default function DealOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [financials, setFinancials] = useState<DealFinancials | null>(null);
  const [options, setOptions] = useState<FinancingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDealData() {
      try {
        const response = await fetch(`/api/deals/${dealId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const deal = data.data;

          // Calculate financials from facilities
          let totalNoi = 0;
          let totalEbitdar = 0;
          let totalBeds = 0;
          let totalOccupancy = 0;
          const facilityCount = deal.facilities?.length || 1;

          deal.facilities?.forEach((f: any) => {
            totalNoi += f.trailingTwelveMonthEbitda || 0;
            totalEbitdar += (f.trailingTwelveMonthEbitda || 0) * 1.1;
            totalBeds += f.licensedBeds || f.certifiedBeds || 0;
            totalOccupancy += f.currentOccupancy || 0;
          });

          setFinancials({
            purchasePrice: deal.askingPrice || totalNoi * 12,
            noi: totalNoi,
            ebitdar: totalEbitdar,
            beds: totalBeds,
            occupancy: facilityCount > 0 ? totalOccupancy / facilityCount : 0,
            dealName: deal.name,
          });
        }
      } catch (error) {
        console.error('Failed to fetch deal data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDealData();
  }, [dealId]);

  useEffect(() => {
    if (financials) {
      generateOptions(financials);
    }
  }, [financials]);

  const generateOptions = (fin: DealFinancials) => {
    const capRate = fin.noi / fin.purchasePrice;
    const pricePerBed = fin.purchasePrice / fin.beds;

    // Calculate metrics for each option
    const saleLeasebackRent = fin.purchasePrice * 0.085;
    const slbCoverage = fin.noi / saleLeasebackRent;

    const conventionalLtv = 0.70;
    const conventionalLoan = fin.purchasePrice * conventionalLtv;
    const conventionalEquity = fin.purchasePrice - conventionalLoan;
    const conventionalRate = 0.075;
    const conventionalDebtService = conventionalLoan * (conventionalRate / 12 * Math.pow(1 + conventionalRate / 12, 300)) / (Math.pow(1 + conventionalRate / 12, 300) - 1) * 12;
    const conventionalDscr = fin.noi / conventionalDebtService;
    const conventionalCashOnCash = (fin.noi - conventionalDebtService) / conventionalEquity;

    const newOptions: FinancingOption[] = [
      {
        id: 'sale-leaseback',
        name: 'Sale-Leaseback',
        description: 'Sell the property to a REIT/investor and lease it back with a triple-net master lease.',
        icon: ArrowLeftRight,
        recommended: slbCoverage >= 1.4 && fin.occupancy > 0.75,
        pros: [
          'No equity capital required',
          'Preserves operational control',
          'Off-balance sheet transaction',
          'Predictable fixed rent expenses',
          'Access to institutional capital',
        ],
        cons: [
          'Long-term rent obligation (15-20 years)',
          'Annual rent escalations (2-3%)',
          'Loss of property appreciation upside',
          'Requires strong operational performance',
          'Triple-net expenses remain your responsibility',
        ],
        metrics: [
          { label: 'Purchase Price', value: formatCurrency(fin.purchasePrice), highlight: true },
          { label: 'Annual Rent', value: formatCurrency(saleLeasebackRent) },
          { label: 'Coverage Ratio', value: `${slbCoverage.toFixed(2)}x`, highlight: slbCoverage >= 1.5 },
          { label: 'Implied Cap Rate', value: `${(capRate * 100).toFixed(2)}%` },
          { label: 'Rent/Bed/Month', value: formatCurrency(saleLeasebackRent / fin.beds / 12) },
        ],
        suitability: slbCoverage >= 1.5 ? 'excellent' : slbCoverage >= 1.3 ? 'good' : 'fair',
        riskLevel: 'moderate',
      },
      {
        id: 'conventional',
        name: 'Conventional Financing',
        description: 'Traditional bank loan with 70% LTV, 25-year amortization, and 5-year term.',
        icon: Landmark,
        recommended: conventionalDscr >= 1.25 && conventionalCashOnCash > 0.08,
        pros: [
          'Build equity through amortization',
          'Retain property appreciation upside',
          'Lower total cost over long term',
          'More flexibility on operations',
          'Can refinance as rates change',
        ],
        cons: [
          `${formatCurrency(conventionalEquity)} equity required`,
          'Personal/corporate guarantees required',
          'Balloon payment at maturity',
          'Interest rate risk on refinance',
          'Stricter lending covenants',
        ],
        metrics: [
          { label: 'Loan Amount', value: formatCurrency(conventionalLoan) },
          { label: 'Equity Required', value: formatCurrency(conventionalEquity), highlight: true },
          { label: 'DSCR', value: `${conventionalDscr.toFixed(2)}x`, highlight: conventionalDscr >= 1.25 },
          { label: 'Cash-on-Cash', value: `${(conventionalCashOnCash * 100).toFixed(1)}%` },
          { label: 'Annual Debt Service', value: formatCurrency(conventionalDebtService) },
        ],
        suitability: conventionalDscr >= 1.35 ? 'excellent' : conventionalDscr >= 1.25 ? 'good' : 'fair',
        riskLevel: 'moderate',
      },
      {
        id: 'cash-purchase',
        name: 'All-Cash Purchase',
        description: 'Direct acquisition with no debt financing.',
        icon: DollarSign,
        pros: [
          'No debt service obligations',
          'Maximum operational flexibility',
          '100% of NOI as cash flow',
          'No refinance or balloon risk',
          'Strongest negotiating position',
        ],
        cons: [
          `${formatCurrency(fin.purchasePrice)} capital required`,
          'Lower IRR vs leveraged returns',
          'Capital concentrated in single asset',
          'Opportunity cost of capital',
          'No mortgage interest deduction',
        ],
        metrics: [
          { label: 'Total Investment', value: formatCurrency(fin.purchasePrice), highlight: true },
          { label: 'Unlevered Return', value: `${(capRate * 100).toFixed(2)}%` },
          { label: 'Annual Cash Flow', value: formatCurrency(fin.noi) },
          { label: 'Price/Bed', value: formatCurrency(pricePerBed) },
          { label: 'Payback Period', value: `${(fin.purchasePrice / fin.noi).toFixed(1)} years` },
        ],
        suitability: capRate >= 0.09 ? 'excellent' : capRate >= 0.07 ? 'good' : 'fair',
        riskLevel: 'low',
      },
      {
        id: 'hud-232',
        name: 'HUD 232 Financing',
        description: 'FHA-insured long-term financing for healthcare facilities.',
        icon: Building2,
        pros: [
          'Up to 85% LTV',
          '35-year amortization',
          'Non-recourse financing',
          'Fixed rate for full term',
          'Lower debt service than conventional',
        ],
        cons: [
          '6-12 month approval timeline',
          'Extensive documentation required',
          'HUD compliance requirements',
          'Mortgage insurance premiums',
          'Prepayment penalties',
        ],
        metrics: [
          { label: 'Est. Loan Amount', value: formatCurrency(fin.purchasePrice * 0.85) },
          { label: 'Est. Rate', value: '5.5-6.5%' },
          { label: 'Term', value: '35 years' },
          { label: 'LTV', value: '85%' },
          { label: 'Processing Time', value: '6-12 months' },
        ],
        suitability: fin.occupancy >= 0.85 ? 'good' : 'fair',
        riskLevel: 'low',
      },
      {
        id: 'bridge',
        name: 'Bridge Financing',
        description: 'Short-term financing for acquisition with planned refinance.',
        icon: RefreshCw,
        pros: [
          'Fast closing (30-60 days)',
          'More flexible underwriting',
          'Works with transitional assets',
          'Interest-only available',
          'Time to stabilize operations',
        ],
        cons: [
          'Higher interest rates (9-12%)',
          'Short term (1-3 years)',
          'Refinance risk at maturity',
          'Extension fees if needed',
          'Floating rate exposure',
        ],
        metrics: [
          { label: 'Est. Loan Amount', value: formatCurrency(fin.purchasePrice * 0.65) },
          { label: 'Est. Rate', value: '9-12%' },
          { label: 'Term', value: '2-3 years' },
          { label: 'LTV', value: '65-70%' },
          { label: 'Closing Time', value: '30-60 days' },
        ],
        suitability: fin.occupancy < 0.8 ? 'good' : 'fair',
        riskLevel: 'high',
      },
    ];

    setOptions(newOptions);
    // Auto-select recommended option
    const recommended = newOptions.find((o) => o.recommended);
    if (recommended) {
      setSelectedOption(recommended.id);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const getSuitabilityConfig = (suitability: FinancingOption['suitability']) => {
    const configs = {
      excellent: { label: 'Excellent Fit', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      good: { label: 'Good Fit', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      fair: { label: 'Fair Fit', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      poor: { label: 'Poor Fit', color: 'bg-red-100 text-red-800 border-red-200' },
    };
    return configs[suitability];
  };

  const getRiskConfig = (risk: FinancingOption['riskLevel']) => {
    const configs = {
      low: { label: 'Low Risk', color: 'text-emerald-600' },
      moderate: { label: 'Moderate Risk', color: 'text-amber-600' },
      high: { label: 'High Risk', color: 'text-red-600' },
    };
    return configs[risk];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-2"></div>
            <div className="h-4 w-96 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="h-6 w-40 bg-muted rounded"></div>
                  <div className="h-4 w-full bg-muted rounded"></div>
                  <div className="h-4 w-3/4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deal Financing Options</h1>
            <p className="text-muted-foreground">
              {financials?.dealName} · Compare financing structures and recommendations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/deals/${dealId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Deal
            </Button>
          </Link>
          <Link href={`/app/deals/${dealId}/sale-leaseback`}>
            <Button>
              <Calculator className="h-4 w-4 mr-1" />
              Full SLB Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Summary */}
      {financials && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <DollarSign className="h-6 w-6 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Purchase Price</p>
              <p className="font-bold">{formatCurrency(financials.purchasePrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
              <p className="text-xs text-muted-foreground">NOI</p>
              <p className="font-bold">{formatCurrency(financials.noi)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Target className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">Cap Rate</p>
              <p className="font-bold">
                {((financials.noi / financials.purchasePrice) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Building2 className="h-6 w-6 mx-auto text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Total Beds</p>
              <p className="font-bold">{financials.beds}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Shield className="h-6 w-6 mx-auto text-purple-500 mb-1" />
              <p className="text-xs text-muted-foreground">Occupancy</p>
              <p className="font-bold">{(financials.occupancy * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const suitabilityConfig = getSuitabilityConfig(option.suitability);
          const riskConfig = getRiskConfig(option.riskLevel);
          const isSelected = selectedOption === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all',
                isSelected && 'ring-2 ring-primary',
                option.recommended && 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
              )}
              onClick={() => setSelectedOption(option.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        option.recommended
                          ? 'bg-emerald-100 dark:bg-emerald-900'
                          : 'bg-muted'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-6 w-6',
                          option.recommended ? 'text-emerald-600' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {option.name}
                        {option.recommended && (
                          <Badge className="bg-emerald-500 text-white text-xs">
                            Recommended
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {option.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Suitability and Risk */}
                <div className="flex items-center gap-2">
                  <Badge className={suitabilityConfig.color}>
                    {suitabilityConfig.label}
                  </Badge>
                  <span className={cn('text-xs font-medium', riskConfig.color)}>
                    {riskConfig.label}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {option.metrics.slice(0, 4).map((metric, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2 rounded',
                        metric.highlight ? 'bg-primary/10' : 'bg-muted/50'
                      )}
                    >
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p
                        className={cn(
                          'font-semibold',
                          metric.highlight && 'text-primary'
                        )}
                      >
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pros/Cons Preview */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-medium text-emerald-600 mb-1">Pros</p>
                    <ul className="space-y-0.5">
                      {option.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="flex items-start gap-1 text-muted-foreground">
                          <CheckCircle className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                          <span className="line-clamp-1">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-amber-600 mb-1">Cons</p>
                    <ul className="space-y-0.5">
                      {option.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="flex items-start gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                          <span className="line-clamp-1">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Option Detail */}
      {selectedOption && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {options.find((o) => o.id === selectedOption)?.name} - Full Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const option = options.find((o) => o.id === selectedOption);
              if (!option) return null;

              return (
                <div className="grid grid-cols-3 gap-6">
                  {/* All Metrics */}
                  <div>
                    <h4 className="font-semibold mb-3">Key Metrics</h4>
                    <div className="space-y-2">
                      {option.metrics.map((metric, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-1 border-b border-border/50"
                        >
                          <span className="text-muted-foreground">{metric.label}</span>
                          <span className="font-medium">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Pros */}
                  <div>
                    <h4 className="font-semibold text-emerald-600 mb-3">Advantages</h4>
                    <ul className="space-y-2">
                      {option.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                          <span className="text-sm">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* All Cons */}
                  <div>
                    <h4 className="font-semibold text-amber-600 mb-3">Considerations</h4>
                    <ul className="space-y-2">
                      {option.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                          <span className="text-sm">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Recommendation Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Recommendation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {options.filter((o) => o.recommended).length > 0 ? (
              <>
                <p className="text-sm">
                  Based on the deal metrics, the following financing structures are recommended:
                </p>
                <div className="flex flex-wrap gap-2">
                  {options
                    .filter((o) => o.recommended)
                    .map((option) => (
                      <Badge
                        key={option.id}
                        className="bg-emerald-100 text-emerald-800 border border-emerald-200"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {option.name}
                      </Badge>
                    ))}
                </div>
                <div className="pt-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Key factors:</strong> The recommended options offer the best balance
                    of capital efficiency, risk management, and operational flexibility for this
                    portfolio's specific characteristics.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Analyzing deal characteristics to generate recommendations...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
