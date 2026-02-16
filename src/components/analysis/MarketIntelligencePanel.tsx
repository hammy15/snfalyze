'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  MapPin,
  TrendingUp,
  Shield,
  Users,
  Star,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Landmark,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getGeographicCapRate,
  getRegion,
  getMarketTier,
  isCONState,
  getCONData,
  REIMBURSEMENT_OPTIMIZATION,
  STATE_REIMBURSEMENT_PROGRAMS,
  QUALITY_REVENUE_IMPACT,
  BUYER_PROFILES,
  SNF_OPERATIONAL_TIERS,
  MARKET_DEMOGRAPHICS,
  ALF_MEMORY_CARE,
  SNF_VALUATION_MULTIPLES,
  ALF_VALUATION_MULTIPLES,
  type OperationalTier,
  type MarketTier,
  type Region,
} from '@/lib/analysis/knowledge';

// ============================================================================
// Types
// ============================================================================

export interface MarketIntelligencePanelProps {
  state: string;
  assetType: string;
  beds?: number;
  cmsRating?: number;
  occupancy?: number;
  ebitdarMargin?: number;
  revenuePerBedDay?: number;
  agencyPercent?: number;
  currentRevenue?: number;
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function IntelCard({
  title,
  icon: Icon,
  children,
  className,
  accentColor = 'blue',
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  accentColor?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'emerald';
}) {
  const colors = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    violet: 'border-l-violet-500',
    emerald: 'border-l-emerald-500',
  };

  return (
    <Card className={cn('border-l-4', colors[accentColor], className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  badge,
  badgeVariant = 'outline',
}: {
  label: string;
  value: string;
  badge?: string;
  badgeVariant?: 'outline' | 'default' | 'secondary' | 'destructive';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: OperationalTier }) {
  const config = {
    strong: { label: 'Strong Performer', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    average: { label: 'Average Performer', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    weak: { label: 'Weak / Distressed', className: 'bg-rose-100 text-rose-800 border-rose-300' },
  };
  const c = config[tier];
  return <Badge className={c.className}>{c.label}</Badge>;
}

function MarketTierBadge({ tier }: { tier: MarketTier }) {
  const config = {
    premium: { label: 'Premium Market', className: 'bg-violet-100 text-violet-800 border-violet-300' },
    growth: { label: 'Growth Market', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    value: { label: 'Value Market', className: 'bg-slate-100 text-slate-800 border-slate-300' },
  };
  const c = config[tier];
  return <Badge className={c.className}>{c.label}</Badge>;
}

// ============================================================================
// Classify operational tier from metrics
// ============================================================================

function classifyTier(props: MarketIntelligencePanelProps): OperationalTier {
  const tiers = SNF_OPERATIONAL_TIERS;
  let strongCount = 0;
  let weakCount = 0;
  let total = 0;

  if (props.occupancy != null) {
    total++;
    if (props.occupancy >= tiers.strong.occupancy.min) strongCount++;
    else if (props.occupancy < tiers.weak.occupancy.max) weakCount++;
  }
  if (props.ebitdarMargin != null) {
    total++;
    if (props.ebitdarMargin >= tiers.strong.ebitdarMargin.min) strongCount++;
    else if (props.ebitdarMargin < tiers.weak.ebitdarMargin.max) weakCount++;
  }
  if (props.revenuePerBedDay != null) {
    total++;
    if (props.revenuePerBedDay >= tiers.strong.revenuePerBedDay.min) strongCount++;
    else if (props.revenuePerBedDay < tiers.weak.revenuePerBedDay.max) weakCount++;
  }
  if (props.agencyPercent != null) {
    total++;
    if (props.agencyPercent <= tiers.strong.agencyPercent.max) strongCount++;
    else if (props.agencyPercent > tiers.weak.agencyPercent.min) weakCount++;
  }

  if (total === 0) return 'average';
  if (strongCount >= Math.ceil(total / 2)) return 'strong';
  if (weakCount >= Math.ceil(total / 2)) return 'weak';
  return 'average';
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketIntelligencePanel(props: MarketIntelligencePanelProps) {
  const { state, assetType, beds = 100, cmsRating, className } = props;

  const region = getRegion(state);
  const marketTier = getMarketTier(state);
  const geoCapRate = getGeographicCapRate(state, assetType);
  const conData = isCONState(state) ? getCONData(state) : null;
  const stateProgram = STATE_REIMBURSEMENT_PROGRAMS[state?.toUpperCase()];
  const operationalTier = classifyTier(props);
  const isALF = assetType?.toUpperCase() === 'ALF';
  const multiples = isALF ? ALF_VALUATION_MULTIPLES[marketTier] : SNF_VALUATION_MULTIPLES[marketTier];
  const qualityImpact = cmsRating ? QUALITY_REVENUE_IMPACT.find((q) => q.starRating === cmsRating) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">
            Institutional knowledge from Cascadia&apos;s deal database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MarketTierBadge tier={marketTier} />
          <TierBadge tier={operationalTier} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Market Position */}
        <IntelCard title="Market Position" icon={MapPin} accentColor="blue">
          <MetricRow label="State" value={state?.toUpperCase() || 'Unknown'} />
          <MetricRow label="Region" value={region.replace('_', ' ')} />
          <MetricRow label="Market Tier" value={marketTier} badge={marketTier === 'premium' ? 'Institutional' : marketTier === 'growth' ? 'Expanding' : 'Turnaround'} />
          {geoCapRate && (
            <MetricRow
              label="Geographic Cap Rate"
              value={`${(geoCapRate.low * 100).toFixed(1)}% - ${(geoCapRate.high * 100).toFixed(1)}%`}
            />
          )}
          <MetricRow
            label="Valuation Multiples"
            value={`${multiples.ebitdaMultiple.low}-${multiples.ebitdaMultiple.high}x EBITDA`}
          />
          <MetricRow
            label="Per-Bed Range"
            value={`$${(multiples.pricePerBed.low / 1000).toFixed(0)}K - $${(multiples.pricePerBed.high / 1000).toFixed(0)}K`}
          />
          <p className="text-xs text-muted-foreground mt-2">{multiples.description}</p>
        </IntelCard>

        {/* Operational Tier */}
        <IntelCard title="Operational Performance" icon={Building2} accentColor={operationalTier === 'strong' ? 'emerald' : operationalTier === 'weak' ? 'rose' : 'amber'}>
          <div className="space-y-2">
            {props.revenuePerBedDay != null && (
              <MetricRow
                label="Revenue/Bed/Day"
                value={`$${props.revenuePerBedDay.toFixed(0)}`}
                badge={props.revenuePerBedDay >= 150 ? 'Strong' : props.revenuePerBedDay < 100 ? 'Weak' : 'Avg'}
                badgeVariant={props.revenuePerBedDay >= 150 ? 'default' : props.revenuePerBedDay < 100 ? 'destructive' : 'secondary'}
              />
            )}
            {props.occupancy != null && (
              <MetricRow
                label="Occupancy"
                value={`${props.occupancy.toFixed(1)}%`}
                badge={props.occupancy >= 95 ? 'Strong' : props.occupancy < 80 ? 'Weak' : 'Avg'}
                badgeVariant={props.occupancy >= 95 ? 'default' : props.occupancy < 80 ? 'destructive' : 'secondary'}
              />
            )}
            {props.ebitdarMargin != null && (
              <MetricRow
                label="EBITDAR Margin"
                value={`${props.ebitdarMargin.toFixed(1)}%`}
                badge={props.ebitdarMargin >= 20 ? 'Strong' : props.ebitdarMargin < 10 ? 'Weak' : 'Avg'}
                badgeVariant={props.ebitdarMargin >= 20 ? 'default' : props.ebitdarMargin < 10 ? 'destructive' : 'secondary'}
              />
            )}
            {props.agencyPercent != null && (
              <MetricRow
                label="Agency Usage"
                value={`${props.agencyPercent.toFixed(1)}%`}
                badge={props.agencyPercent <= 3 ? 'Strong' : props.agencyPercent > 10 ? 'Weak' : 'Avg'}
                badgeVariant={props.agencyPercent <= 3 ? 'default' : props.agencyPercent > 10 ? 'destructive' : 'secondary'}
              />
            )}
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {SNF_OPERATIONAL_TIERS[operationalTier].description}
            </p>
          </div>
        </IntelCard>

        {/* Reimbursement Opportunity */}
        <IntelCard title="Reimbursement Opportunity" icon={DollarSign} accentColor="green">
          <MetricRow
            label="PDPM Optimization"
            value={`${(REIMBURSEMENT_OPTIMIZATION.pdpmPotential.low * 100).toFixed(0)}-${(REIMBURSEMENT_OPTIMIZATION.pdpmPotential.high * 100).toFixed(0)}% revenue increase`}
          />
          {qualityImpact && (
            <>
              <MetricRow
                label="Quality Bonus/Bed"
                value={`$${qualityImpact.revenuePerBed.low.toLocaleString()} - $${qualityImpact.revenuePerBed.high.toLocaleString()}`}
              />
              <MetricRow
                label="Total Quality Revenue"
                value={`$${(qualityImpact.revenuePerBed.low * beds / 1000).toFixed(0)}K - $${(qualityImpact.revenuePerBed.high * beds / 1000).toFixed(0)}K`}
                badge={`${qualityImpact.roi.low}-${qualityImpact.roi.high}% ROI`}
              />
              <MetricRow
                label="Payback Period"
                value={`${qualityImpact.paybackMonths.low}-${qualityImpact.paybackMonths.high} months`}
              />
            </>
          )}
          {stateProgram && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium">{stateProgram.name}</p>
              <MetricRow
                label="State Program Benefit"
                value={`$${stateProgram.perBedBenefit.low.toLocaleString()} - $${stateProgram.perBedBenefit.high.toLocaleString()}/bed`}
              />
            </div>
          )}
          {!stateProgram && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              No state-specific supplement program mapped for {state?.toUpperCase()}
            </p>
          )}
        </IntelCard>

        {/* Regulatory Context */}
        <IntelCard title="Regulatory Context" icon={Shield} accentColor={conData ? 'amber' : 'green'}>
          {conData ? (
            <>
              <MetricRow label="CON State" value="Yes" badge="Supply Protection" />
              <MetricRow label="Investment Score" value={`${conData.investmentScore}/10`} />
              <MetricRow label="Approval Rate" value={`${(conData.approvalRate * 100).toFixed(0)}%`} />
              <MetricRow
                label="Timeline"
                value={`${conData.timelineMonths.fast}-${conData.timelineMonths.extended}mo`}
              />
              <MetricRow
                label="Application Cost"
                value={`$${(conData.applicationCost.low / 1000).toFixed(0)}-${(conData.applicationCost.high / 1000).toFixed(0)}K`}
              />
              <MetricRow
                label="Reform Risk"
                value={conData.reformRisk}
                badge={conData.reformRisk}
                badgeVariant={conData.reformRisk === 'high' ? 'destructive' : conData.reformRisk === 'moderate' ? 'secondary' : 'outline'}
              />
              <p className="text-xs text-muted-foreground pt-2 border-t">{conData.notes}</p>
            </>
          ) : (
            <>
              <MetricRow label="CON State" value="No" badge="Open Market" />
              <p className="text-xs text-muted-foreground">
                No Certificate of Need requirements — lower regulatory barrier but also less supply protection for existing operators.
              </p>
              <MetricRow label="IRR Target" value="15-18%" badge="Non-CON" />
            </>
          )}
        </IntelCard>

        {/* Competitive Landscape */}
        <IntelCard title="Competitive Landscape" icon={Users} accentColor="violet">
          <MetricRow
            label="65+ Growth"
            value={`${(MARKET_DEMOGRAPHICS.seniorGrowthRate65Plus * 100).toFixed(1)}%/yr`}
            badge="Tailwind"
          />
          <MetricRow
            label="85+ Growth"
            value={`${(MARKET_DEMOGRAPHICS.seniorGrowthRate85Plus * 100).toFixed(1)}%/yr`}
            badge="Primary Driver"
          />
          <MetricRow
            label="Family-Owned"
            value={`${(MARKET_DEMOGRAPHICS.familyOwnedOperatorPercent * 100).toFixed(0)}% of operators`}
          />
          <MetricRow
            label="Succession Deal Flow"
            value={`$${(MARKET_DEMOGRAPHICS.estimatedSuccessionDealFlow.low / 1e9).toFixed(0)}-${(MARKET_DEMOGRAPHICS.estimatedSuccessionDealFlow.high / 1e9).toFixed(0)}B`}
          />
          <div className="pt-2 border-t space-y-1">
            <p className="text-xs font-medium">Buyer Competition</p>
            <div className="flex gap-2">
              <Badge variant="outline">PE {(MARKET_DEMOGRAPHICS.buyerCompetitionBreakdown.privateEquity * 100).toFixed(0)}%</Badge>
              <Badge variant="outline">REITs {(MARKET_DEMOGRAPHICS.buyerCompetitionBreakdown.reits * 100).toFixed(0)}%</Badge>
              <Badge variant="outline">Strategic {(MARKET_DEMOGRAPHICS.buyerCompetitionBreakdown.strategicBuyers * 100).toFixed(0)}%</Badge>
            </div>
          </div>
        </IntelCard>

        {/* Quality Revenue Impact */}
        {cmsRating && (
          <IntelCard title="Quality Revenue Path" icon={Star} accentColor={cmsRating >= 4 ? 'emerald' : cmsRating >= 3 ? 'amber' : 'rose'}>
            <MetricRow label="Current Rating" value={`${cmsRating} Star`} badge={cmsRating >= 4 ? 'High' : cmsRating >= 3 ? 'Average' : 'Low'} badgeVariant={cmsRating >= 4 ? 'default' : cmsRating >= 3 ? 'secondary' : 'destructive'} />
            {cmsRating < 4 && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-2">Improvement Targets</p>
                  {QUALITY_REVENUE_IMPACT.filter((q) => q.starRating > cmsRating && q.starRating <= 5).map((target) => (
                    <div key={target.starRating} className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground">→ {target.starRating}-Star</span>
                      <span className="font-medium text-emerald-600">
                        +${(target.revenuePerBed.low * beds / 1000).toFixed(0)}-${(target.revenuePerBed.high * beds / 1000).toFixed(0)}K/yr
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {cmsRating >= 4 && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Facility is already a high performer. Focus on maintaining quality status and optimizing existing payer contracts for premium rates.
              </p>
            )}
          </IntelCard>
        )}

        {/* ALF/Memory Care Intelligence (only if ALF) */}
        {isALF && (
          <IntelCard title="ALF / Memory Care Intel" icon={Landmark} accentColor="blue">
            <MetricRow
              label="Memory Care Premium"
              value={`${(ALF_MEMORY_CARE.memoryCareRevenuePremium.low * 100).toFixed(0)}-${(ALF_MEMORY_CARE.memoryCareRevenuePremium.high * 100).toFixed(0)}% over traditional`}
            />
            <MetricRow
              label="High-Barrier Premium"
              value={`${(ALF_MEMORY_CARE.highBarrierPremium.low * 100).toFixed(0)}-${(ALF_MEMORY_CARE.highBarrierPremium.high * 100).toFixed(0)}%`}
            />
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-medium">Per-Unit Values by Region</p>
              {Object.entries(ALF_MEMORY_CARE.perUnitValues).map(([region, range]) => (
                <MetricRow
                  key={region}
                  label={region.replace(/([A-Z])/g, ' $1').trim()}
                  value={`$${(range.low / 1000).toFixed(0)}-${(range.high / 1000).toFixed(0)}K`}
                />
              ))}
            </div>
          </IntelCard>
        )}

        {/* Top Capital Partners */}
        <IntelCard title="Capital Partner Matches" icon={TrendingUp} accentColor="emerald">
          {BUYER_PROFILES
            .filter((p) => p.assetFocus.includes(assetType?.toUpperCase() || 'SNF'))
            .slice(0, 5)
            .map((partner) => (
              <div key={partner.name} className="flex items-center justify-between py-1">
                <div>
                  <span className="font-medium text-xs">{partner.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">({partner.type.toUpperCase()})</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    ${partner.dealSizeRange.min}-{partner.dealSizeRange.max}M
                  </span>
                </div>
              </div>
            ))}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Showing partners with {assetType?.toUpperCase()} focus. Full matching available in analysis.
          </p>
        </IntelCard>
      </div>
    </div>
  );
}
