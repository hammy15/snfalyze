'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Shield,
  FileText,
  PlayCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { usePartners } from '@/hooks/usePartners';
import { useDecisionAnalysis } from '@/hooks/useDecisionAnalysis';
import { useRiskValuation } from '@/hooks/useRiskValuation';
import { useMasterLease } from '@/hooks/useMasterLease';

import { PartnerSelector } from './PartnerSelector';
import { DecisionRecommendation } from './DecisionRecommendation';
import { PricingGuidance } from './PricingGuidance';
import { StrengthsConcernsList } from './StrengthsConcernsList';
import { RiskProfileGauge } from './RiskProfileGauge';
import { RiskAdjustmentWaterfall } from './RiskAdjustmentWaterfall';
import { FacilityRiskCards } from './FacilityRiskCards';
import { LeaseProjectionChart } from './LeaseProjectionChart';
import { CoverageIndicator } from './CoverageIndicator';
import { BuyVsLeaseComparison } from './BuyVsLeaseComparison';
import { SensitivityMatrix } from './SensitivityMatrix';

interface DecisionDashboardProps {
  dealId: string;
}

export function DecisionDashboard({ dealId }: DecisionDashboardProps) {
  const [activeTab, setActiveTab] = useState('decision');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  // Hooks
  const { partners, loading: partnersLoading, error: partnersError } = usePartners(dealId);
  const {
    data: decisionData,
    loading: decisionLoading,
    error: decisionError,
    runAnalysis: runDecisionAnalysis,
  } = useDecisionAnalysis(dealId);
  const {
    data: riskData,
    loading: riskLoading,
    error: riskError,
    runAnalysis: runRiskAnalysis,
  } = useRiskValuation(dealId);
  const {
    data: leaseData,
    loading: leaseLoading,
    error: leaseError,
    runAnalysis: runLeaseAnalysis,
  } = useMasterLease(dealId);

  // Auto-select first partner
  useEffect(() => {
    if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [partners, selectedPartnerId]);

  const isLoading = decisionLoading || riskLoading || leaseLoading;
  const hasError = decisionError || riskError || leaseError;

  const handleRunAnalysis = async () => {
    if (!selectedPartnerId) return;

    setHasRunAnalysis(true);

    // Run all analyses in parallel
    await Promise.all([
      runDecisionAnalysis({ partnerId: selectedPartnerId }),
      runRiskAnalysis(),
      runLeaseAnalysis({ partnerId: selectedPartnerId }),
    ]);
  };

  // Loading skeleton
  if (partnersLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading analysis tools...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (partnersError) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-red-600">
            <AlertCircle className="h-8 w-8" />
            <p>Failed to load partners: {partnersError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Partner Selection and Run Button */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Investment Analysis Dashboard
            </CardTitle>
            <Button
              size="lg"
              onClick={handleRunAnalysis}
              disabled={!selectedPartnerId || isLoading}
              className="min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PartnerSelector
            partners={partners}
            selectedPartnerId={selectedPartnerId}
            onSelectPartner={setSelectedPartnerId}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Error display */}
      {hasError && hasRunAnalysis && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>
                {decisionError || riskError || leaseError}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results - only show after analysis has been run */}
      {hasRunAnalysis && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="decision" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              Decision
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Risk Valuation
            </TabsTrigger>
            <TabsTrigger value="lease" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Master Lease
            </TabsTrigger>
          </TabsList>

          {/* Decision Tab */}
          <TabsContent value="decision" className="mt-4 space-y-4">
            {decisionLoading ? (
              <LoadingSkeleton />
            ) : decisionData?.decision ? (
              <>
                <DecisionRecommendation decision={decisionData.decision} />
                <div className="grid grid-cols-2 gap-4">
                  <PricingGuidance pricing={decisionData.decision.pricing} />
                  <div className="space-y-4">
                    {/* Market insights */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Market Context</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Primary State</p>
                            <p className="font-semibold">{decisionData.market.state}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Medicaid Rate</p>
                            <p className="font-semibold">
                              ${decisionData.market.medicaidRate.toFixed(2)}/day
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rate Trend</p>
                            <Badge
                              variant="outline"
                              className={
                                decisionData.market.rateTrend === 'improving'
                                  ? 'text-emerald-600'
                                  : decisionData.market.rateTrend === 'declining'
                                  ? 'text-red-600'
                                  : ''
                              }
                            >
                              {decisionData.market.rateTrend}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reimbursement Risk</p>
                            <Badge
                              variant="outline"
                              className={
                                decisionData.market.reimbursementRisk === 'low'
                                  ? 'text-emerald-600'
                                  : decisionData.market.reimbursementRisk === 'high'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }
                            >
                              {decisionData.market.reimbursementRisk}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Underwriting summary */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Underwriting</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Facilities Passing</span>
                          <span className="font-bold">
                            {decisionData.underwriting.passingFacilities} /{' '}
                            {decisionData.underwriting.totalFacilities}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${
                                (decisionData.underwriting.passingFacilities /
                                  decisionData.underwriting.totalFacilities) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Avg Score: {decisionData.underwriting.avgScore.toFixed(0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <StrengthsConcernsList
                  strengths={decisionData.decision.strengths}
                  concerns={decisionData.decision.concerns}
                  nextSteps={decisionData.decision.nextSteps}
                />
              </>
            ) : (
              <EmptyState message="Run analysis to see decision recommendation" />
            )}
          </TabsContent>

          {/* Risk Valuation Tab */}
          <TabsContent value="risk" className="mt-4 space-y-4">
            {riskLoading ? (
              <LoadingSkeleton />
            ) : riskData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <RiskProfileGauge
                    riskProfile={riskData.riskProfile}
                    baseCapRate={riskData.portfolio.weightedCapRate}
                    riskAdjustedCapRate={riskData.portfolio.weightedRiskAdjustedCapRate}
                  />
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Portfolio Value Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Base Value</p>
                          <p className="text-xl font-bold">
                            ${(riskData.portfolio.totalBaseValue / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Risk-Adjusted</p>
                          <p className="text-xl font-bold text-primary">
                            ${(riskData.portfolio.totalRiskAdjustedValue / 1000000).toFixed(1)}M
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">Value Impact</p>
                        <p
                          className={`text-2xl font-bold ${
                            riskData.portfolio.valueImpact >= 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {riskData.portfolio.valueImpact >= 0 ? '-' : '+'}$
                          {Math.abs(riskData.portfolio.valueImpact / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({((riskData.portfolio.valueImpact / riskData.portfolio.totalBaseValue) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {riskData.facilities.length > 0 && riskData.facilities[0].adjustments && (
                  <RiskAdjustmentWaterfall
                    baseCapRate={riskData.portfolio.weightedCapRate}
                    adjustedCapRate={riskData.portfolio.weightedRiskAdjustedCapRate}
                    adjustments={riskData.facilities.flatMap((f) => f.adjustments).slice(0, 10)}
                  />
                )}
                <FacilityRiskCards facilities={riskData.facilities} />
              </>
            ) : (
              <EmptyState message="Run analysis to see risk valuation" />
            )}
          </TabsContent>

          {/* Master Lease Tab */}
          <TabsContent value="lease" className="mt-4 space-y-4">
            {leaseLoading ? (
              <LoadingSkeleton />
            ) : leaseData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <CoverageIndicator
                    coverage={leaseData.summary.portfolioCoverageRatio}
                    targetCoverage={1.5}
                    status={leaseData.summary.coverageStatus}
                    annualRent={leaseData.summary.totalAnnualRent}
                    noi={leaseData.summary.totalNoi}
                  />
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Lease Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Purchase Price</p>
                          <p className="font-bold">
                            ${(leaseData.summary.totalPurchasePrice / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Annual Rent</p>
                          <p className="font-bold">
                            ${(leaseData.summary.totalAnnualRent / 1000000).toFixed(2)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cap Rate</p>
                          <p className="font-bold">
                            {(leaseData.summary.weightedCapRate * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Yield</p>
                          <p className="font-bold">
                            {(leaseData.summary.weightedYield * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price/Bed</p>
                          <p className="font-bold">
                            ${leaseData.summary.avgPricePerBed.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Included</p>
                          <p className="font-bold">
                            {leaseData.summary.includedFacilities}/{leaseData.summary.totalFacilities} facilities
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <LeaseProjectionChart projection={leaseData.leaseProjection} />
                <div className="grid grid-cols-2 gap-4">
                  <BuyVsLeaseComparison analysis={leaseData.decision.buyVsLeaseAnalysis} />
                  <SensitivityMatrix
                    sensitivity={leaseData.sensitivity}
                    currentCapRate={leaseData.summary.weightedCapRate}
                  />
                </div>
              </>
            ) : (
              <EmptyState message="Run analysis to see master lease details" />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Initial state before analysis */}
      {!hasRunAnalysis && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Brain className="h-16 w-16 text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold">Ready to Analyze</h3>
                <p className="text-muted-foreground mt-1">
                  Select an investment partner and click "Run Analysis" to generate
                  comprehensive decision support, risk valuation, and lease projections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="animate-pulse">
          <div className="h-48 bg-muted rounded-lg" />
        </div>
        <div className="animate-pulse">
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8">
        <p className="text-center text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
