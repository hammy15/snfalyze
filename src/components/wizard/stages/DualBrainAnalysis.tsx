'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Shield,
  AlertTriangle,
  Building2,
  DollarSign,
  HelpCircle,
  Lightbulb,
  Zap,
  Target,
  BarChart3,
  Clock,
  Users,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DualBrainAnalysisProps {
  dualBrainResult: any; // DualBrainResult
  analysisResult: any;  // Legacy result for fallback data
}

const NEWO_COLOR = 'text-teal-600';
const NEWO_BG = 'bg-teal-50 dark:bg-teal-950/30';
const NEWO_BORDER = 'border-teal-200 dark:border-teal-800';
const DEV_COLOR = 'text-orange-600';
const DEV_BG = 'bg-orange-50 dark:bg-orange-950/30';
const DEV_BORDER = 'border-orange-200 dark:border-orange-800';

export function DualBrainAnalysis({ dualBrainResult, analysisResult }: DualBrainAnalysisProps) {
  const [activeTab, setActiveTab] = useState('unified');

  const { newo, dev, synthesis, metadata } = dualBrainResult;

  const recLabel = synthesis.recommendation;
  const recColor = recLabel === 'pursue'
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
    : recLabel === 'conditional'
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40';

  const formatCurrency = (value: number) => {
    if (!value) return '$0';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Brain Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unified Recommendation */}
        <Card variant="flat" className="md:col-span-1">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-surface-500 mb-1">Unified Recommendation</p>
            <Badge className={cn('text-lg px-4 py-2', recColor)}>
              {recLabel === 'pursue' ? 'PURSUE' : recLabel === 'conditional' ? 'CONDITIONAL' : 'PASS'}
            </Badge>
            <p className="text-sm text-surface-500 mt-2">
              Confidence: {synthesis.confidence}%
            </p>
          </CardContent>
        </Card>

        {/* Brain Status Cards */}
        <Card variant="flat" className={cn('border', NEWO_BORDER)}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className={cn('w-4 h-4', NEWO_COLOR)} />
              <span className={cn('font-semibold text-sm', NEWO_COLOR)}>Newo</span>
              <span className="text-xs text-surface-400">Operations</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn('text-xs', NEWO_COLOR)}>
                {newo.recommendation.toUpperCase()}
              </Badge>
              <span className="text-xs text-surface-500">
                {newo.confidenceScore}% · {(metadata.newoLatencyMs / 1000).toFixed(1)}s
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="flat" className={cn('border', DEV_BORDER)}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={cn('w-4 h-4', DEV_COLOR)} />
              <span className={cn('font-semibold text-sm', DEV_COLOR)}>Dev</span>
              <span className="text-xs text-surface-400">Strategy</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn('text-xs', DEV_COLOR)}>
                {dev.recommendation.toUpperCase()}
              </Badge>
              <span className="text-xs text-surface-500">
                {dev.confidenceScore}% · {(metadata.devLatencyMs / 1000).toFixed(1)}s
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Tab Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="unified"><Lightbulb className="w-3 h-3 mr-1" /> Unified</TabsTrigger>
          <TabsTrigger value="newo"><Building2 className="w-3 h-3 mr-1" /> Newo</TabsTrigger>
          <TabsTrigger value="dev"><TrendingUp className="w-3 h-3 mr-1" /> Dev</TabsTrigger>
          <TabsTrigger value="tension"><Zap className="w-3 h-3 mr-1" /> Tensions</TabsTrigger>
          <TabsTrigger value="valuation"><DollarSign className="w-3 h-3 mr-1" /> Valuation</TabsTrigger>
          <TabsTrigger value="risk"><Shield className="w-3 h-3 mr-1" /> Risk</TabsTrigger>
          <TabsTrigger value="questions"><HelpCircle className="w-3 h-3 mr-1" /> Critical Qs</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: Unified Thesis */}
        {/* ============================================================ */}
        <TabsContent value="unified">
          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {synthesis.unifiedNarrative.split('\n').map((line: string, i: number) => {
                  if (line.startsWith('**')) {
                    const match = line.match(/\*\*(.*?)\*\*:?\s*(.*)/);
                    if (match) {
                      return (
                        <div key={i} className="mb-3">
                          <h4 className="font-semibold text-surface-900 dark:text-surface-100">{match[1]}</h4>
                          {match[2] && <p className="text-surface-600 dark:text-surface-300">{match[2]}</p>}
                        </div>
                      );
                    }
                  }
                  return line ? <p key={i} className="text-surface-600 dark:text-surface-300">{line}</p> : <br key={i} />;
                })}
              </div>
              <div className={cn('rounded-lg p-4 mt-4', 'bg-surface-50 dark:bg-surface-800/50')}>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
                  <Lightbulb className="w-4 h-4 inline mr-1 text-amber-500" />
                  Key Insight
                </p>
                <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">{synthesis.keyInsight}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: Newo (Operations) */}
        {/* ============================================================ */}
        <TabsContent value="newo">
          <div className="space-y-4">
            {/* Operational Viability */}
            <Card variant="flat" className={cn('border', NEWO_BORDER)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className={cn('w-4 h-4', NEWO_COLOR)} />
                    <h4 className="font-semibold">Operational Viability</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${newo.operationalViability?.score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono">{newo.operationalViability?.score}/100</span>
                  </div>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-300">{newo.operationalViability?.assessment}</p>
              </CardContent>
            </Card>

            {/* Staffing Analysis */}
            {newo.staffingAnalysis && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-teal-500" /> Staffing Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricBox label="Current HPPD" value={newo.staffingAnalysis.currentHPPD?.toFixed(1) || '—'} target={`Target: ${newo.staffingAnalysis.targetHPPD}`} />
                    <MetricBox label="Agency %" value={newo.staffingAnalysis.currentAgencyPercent != null ? `${newo.staffingAnalysis.currentAgencyPercent}%` : '—'} target="Target: <5%" />
                    <MetricBox label="Turnover" value={newo.staffingAnalysis.turnoverRate != null ? `${newo.staffingAnalysis.turnoverRate}%` : '—'} target={`Natl avg: ${newo.staffingAnalysis.nationalAvgTurnover}%`} />
                    <MetricBox label="Staffing Delta" value={formatCurrency(newo.staffingAnalysis.annualStaffingCostDelta)} target="Annual cost to normalize" />
                  </div>
                  <p className="text-xs text-surface-500 mt-2">{newo.staffingAnalysis.laborMarketAssessment}</p>
                </CardContent>
              </Card>
            )}

            {/* Quality Remediation */}
            {newo.qualityRemediation && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-teal-500" /> Quality Remediation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricBox label="Annual Cost" value={formatCurrency(newo.qualityRemediation.annualCostEstimate)} />
                    <MetricBox label="Timeline" value={`${newo.qualityRemediation.timelineMonths} months`} />
                    <MetricBox label="Deficiency Rate" value={newo.qualityRemediation.deficiencyRate?.toFixed(1) || '—'} target={`Natl avg: ${newo.qualityRemediation.nationalAvgDeficiencyRate}`} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {newo.qualityRemediation.keyActions?.map((action: string, i: number) => (
                      <p key={i} className="text-xs text-surface-500">• {action}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Platform Upside */}
            {newo.platformUpside?.totalAnnualSynergies > 0 && (
              <Card variant="flat" className={cn('border', NEWO_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-teal-500" /> Cascadia Platform Upside
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricBox label="Mgmt Fee Savings" value={formatCurrency(newo.platformUpside.managementFeeReduction)} />
                    <MetricBox label="GPO Savings" value={formatCurrency(newo.platformUpside.purchasingPowerSavings)} />
                    <MetricBox label="Billing Uplift" value={formatCurrency(newo.platformUpside.billingOptimization)} />
                    <MetricBox label="Total Synergies" value={`${formatCurrency(newo.platformUpside.totalAnnualSynergies)}/yr`} highlight />
                  </div>
                  <p className="text-xs text-surface-500 mt-2">
                    Timeline to realize: {newo.platformUpside.timelineToRealize}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Newo Narrative */}
            <Card variant="flat">
              <CardContent className="py-4">
                <h4 className="font-semibold mb-2">Newo&apos;s Assessment</h4>
                <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{newo.narrative}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 3: Dev (Deal Intelligence) */}
        {/* ============================================================ */}
        <TabsContent value="dev">
          <div className="space-y-4">
            {/* Deal Structure */}
            {dev.dealStructure && (
              <Card variant="flat" className={cn('border', DEV_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-orange-500" /> Deal Structure
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <MetricBox label="Opening Bid" value={formatCurrency(dev.dealStructure.openingBid)} />
                    <MetricBox label="Target Price" value={formatCurrency(dev.dealStructure.targetPrice)} highlight />
                    <MetricBox label="Walk-Away" value={formatCurrency(dev.dealStructure.walkAwayCeiling)} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-surface-500">
                    <span>Structure: {dev.dealStructure.txStructure?.replace('_', ' ')}</span>
                    <span>Escrow: {dev.dealStructure.escrowPercent}%</span>
                    {dev.dealStructure.earnoutTerms && <span>Earnout: {dev.dealStructure.earnoutTerms}</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Valuation Scenarios */}
            {dev.valuationScenarios && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-orange-500" /> Valuation Scenarios
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['bear', 'base', 'bull', 'cascadiaNormalized'] as const).map((scenario) => {
                      const s = dev.valuationScenarios[scenario];
                      if (!s) return null;
                      const label = scenario === 'cascadiaNormalized' ? 'Cascadia' : scenario.charAt(0).toUpperCase() + scenario.slice(1);
                      return (
                        <div key={scenario} className={cn(
                          'rounded-lg p-3 text-center',
                          scenario === 'cascadiaNormalized' ? DEV_BG : 'bg-surface-50 dark:bg-surface-800/50'
                        )}>
                          <p className="text-xs text-surface-500 mb-1">{label}</p>
                          <p className="text-lg font-bold">{formatCurrency(s.value)}</p>
                          <p className="text-xs text-surface-400">{s.ebitdarMultiple}x EBITDAR</p>
                          <p className="text-xs text-surface-400">{formatCurrency(s.perBed)}/bed</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Intelligence */}
            {dev.companyIntelligence && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-orange-500" /> Company Intelligence
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-surface-500">Ownership:</span> <span className="font-medium">{dev.companyIntelligence.ownershipStructure}</span></div>
                    <div><span className="text-surface-500">Type:</span> <span className="font-medium">{dev.companyIntelligence.ownershipType?.replace('_', ' ')}</span></div>
                    <div><span className="text-surface-500">Seller Motivation:</span> <MotivationBadge level={dev.companyIntelligence.sellerMotivation} /></div>
                    {dev.companyIntelligence.peExitWindow && (
                      <div><span className="text-surface-500">PE Exit:</span> <span className="font-medium">{dev.companyIntelligence.peExitWindow}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategic Fit + IPO Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dev.strategicFit && (
                <Card variant="flat">
                  <CardContent className="py-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-orange-500" /> Strategic Fit
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${dev.strategicFit.overallScore}%` }} />
                      </div>
                      <span className="text-sm font-mono">{dev.strategicFit.overallScore}/100</span>
                    </div>
                    <p className="text-xs text-surface-500">{dev.strategicFit.geographicOverlap}</p>
                  </CardContent>
                </Card>
              )}
              {dev.ipoImpact && (
                <Card variant="flat">
                  <CardContent className="py-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-orange-500" /> IPO Impact
                    </h4>
                    <p className="text-sm">
                      {dev.ipoImpact.currentCascadiaOps} → <span className="font-bold">{dev.ipoImpact.postAcquisitionOps}</span> operations
                    </p>
                    <Badge variant="outline" className={cn('text-xs mt-1',
                      dev.ipoImpact.ipoReadiness === 'ready' ? 'text-emerald-600' :
                      dev.ipoImpact.ipoReadiness === 'close' ? 'text-amber-600' : 'text-surface-500'
                    )}>
                      {dev.ipoImpact.ipoReadiness === 'ready' ? 'IPO Ready' :
                       dev.ipoImpact.ipoReadiness === 'close' ? 'Approaching IPO' : 'Not Yet IPO Scale'}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pipeline Ranking */}
            {dev.pipelineRanking && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Pipeline Ranking</h4>
                      <p className="text-sm text-surface-500">{dev.pipelineRanking.actionRequired}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={cn(
                        dev.pipelineRanking.tier === 1 ? 'bg-emerald-100 text-emerald-700' :
                        dev.pipelineRanking.tier === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-surface-100 text-surface-600'
                      )}>
                        Tier {dev.pipelineRanking.tier}
                      </Badge>
                      <p className="text-xs text-surface-500 mt-1">{dev.pipelineRanking.confidenceToClose}% close confidence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dev Narrative */}
            <Card variant="flat">
              <CardContent className="py-4">
                <h4 className="font-semibold mb-2">Dev&apos;s Assessment</h4>
                <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{dev.narrative}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 4: Tension Points */}
        {/* ============================================================ */}
        <TabsContent value="tension">
          {synthesis.tensionPoints.length === 0 ? (
            <Card variant="flat" className="text-center py-8">
              <CardContent>
                <Brain className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
                <p className="font-medium text-emerald-600">Brains Aligned</p>
                <p className="text-sm text-surface-500">Newo and Dev agree on this analysis — no significant disagreements.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {synthesis.tensionPoints.map((tp: any, i: number) => (
                <Card key={i} variant="flat" className="overflow-hidden">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        {tp.title}
                      </h4>
                      <Badge className={cn(
                        tp.significance === 'high' ? 'bg-rose-100 text-rose-700' :
                        tp.significance === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-surface-100 text-surface-600'
                      )}>
                        {tp.significance}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className={cn('rounded-lg p-3 border', NEWO_BORDER, NEWO_BG)}>
                        <p className={cn('text-xs font-semibold mb-1', NEWO_COLOR)}>Newo (Operations)</p>
                        <p className="text-sm text-surface-700 dark:text-surface-200">{tp.newoPosition}</p>
                      </div>
                      <div className={cn('rounded-lg p-3 border', DEV_BORDER, DEV_BG)}>
                        <p className={cn('text-xs font-semibold mb-1', DEV_COLOR)}>Dev (Strategy)</p>
                        <p className="text-sm text-surface-700 dark:text-surface-200">{tp.devPosition}</p>
                      </div>
                    </div>
                    <div className="mt-3 px-3 py-2 bg-surface-50 dark:bg-surface-800/50 rounded text-xs text-surface-600 dark:text-surface-300">
                      <span className="font-medium">Resolution:</span> {tp.resolutionHint}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 5: Valuation */}
        {/* ============================================================ */}
        <TabsContent value="valuation">
          <div className="space-y-4">
            {/* Existing valuation methods from legacy result */}
            {analysisResult?.valuations?.map((v: any, idx: number) => (
              <Card key={idx} variant="flat">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-primary-500" />
                      <div>
                        <p className="font-medium">{v.label || v.method}</p>
                        <p className="text-sm text-surface-500">{v.notes || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary-600">{formatCurrency(v.value)}</p>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(v.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Dev Valuation Scenarios */}
            {dev.valuationScenarios && (
              <Card variant="flat" className={cn('border', DEV_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className={cn('w-4 h-4', DEV_COLOR)} />
                    Dev&apos;s Strategic Valuation
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(['bear', 'base', 'bull', 'cascadiaNormalized'] as const).map((key) => {
                      const s = dev.valuationScenarios[key];
                      if (!s) return null;
                      return (
                        <div key={key} className="text-center p-2 rounded bg-surface-50 dark:bg-surface-800/50">
                          <p className="text-xs text-surface-500">{s.label || key}</p>
                          <p className="font-bold">{formatCurrency(s.value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Newo Platform-Adjusted Value */}
            {newo.platformUpside?.totalAnnualSynergies > 0 && (
              <Card variant="flat" className={cn('border', NEWO_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Building2 className={cn('w-4 h-4', NEWO_COLOR)} />
                    Newo&apos;s Platform-Adjusted Upside
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricBox label="Annual Synergies" value={`${formatCurrency(newo.platformUpside.totalAnnualSynergies)}/yr`} highlight />
                    <MetricBox label="Reimbursement Upside" value={`${formatCurrency(newo.reimbursementUpside?.totalAnnualUpside || 0)}/yr`} />
                    <MetricBox label="Remediation Cost" value={`${formatCurrency(newo.qualityRemediation?.annualCostEstimate || 0)}/yr`} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 6: Risk */}
        {/* ============================================================ */}
        <TabsContent value="risk">
          <div className="space-y-4">
            {/* Operational Risks (Newo) */}
            {newo.operationalRisks?.length > 0 && (
              <Card variant="flat" className={cn('border', NEWO_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Building2 className={cn('w-4 h-4', NEWO_COLOR)} />
                    Operational Risks (Newo)
                  </h4>
                  <div className="space-y-2">
                    {newo.operationalRisks.map((risk: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                        <SeverityBadge severity={risk.severity} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{risk.risk}</p>
                          <div className="flex gap-3 text-xs text-surface-500 mt-1">
                            {risk.mitigationCost > 0 && <span>Cost: {formatCurrency(risk.mitigationCost)}</span>}
                            <span>{risk.mitigationTimeline}</span>
                            <span>{risk.cascadiaCanFix ? '✓ Cascadia can fix' : '✗ Cannot fix'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategic Risks (Dev) */}
            {dev.strategicRisks?.length > 0 && (
              <Card variant="flat" className={cn('border', DEV_BORDER)}>
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className={cn('w-4 h-4', DEV_COLOR)} />
                    Strategic Risks (Dev)
                  </h4>
                  <div className="space-y-2">
                    {dev.strategicRisks.map((risk: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                        <SeverityBadge severity={risk.severity} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{risk.risk}</p>
                          <div className="flex gap-3 text-xs text-surface-500 mt-1">
                            <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                            <span>{risk.mitigation}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Due Diligence Priorities */}
            {dev.dueDiligence?.length > 0 && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Due Diligence Priorities
                  </h4>
                  <div className="space-y-2">
                    {dev.dueDiligence.slice(0, 8).map((dd: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <Badge className={cn('text-xs',
                          dd.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                          dd.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                          'bg-surface-100 text-surface-600'
                        )}>
                          {dd.priority}
                        </Badge>
                        <span className="text-sm">{dd.item}</span>
                        <Badge variant="outline" className="text-xs ml-auto">{dd.category}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 7: Critical Questions */}
        {/* ============================================================ */}
        <TabsContent value="questions">
          <div className="space-y-4">
            <QuestionCategory
              title="What Must Go Right First"
              icon={<Target className="w-4 h-4 text-emerald-500" />}
              questions={synthesis.criticalQuestions.whatMustGoRightFirst}
            />
            <QuestionCategory
              title="What Cannot Go Wrong"
              icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
              questions={synthesis.criticalQuestions.whatCannotGoWrong}
            />
            <QuestionCategory
              title="What Breaks This Deal"
              icon={<Shield className="w-4 h-4 text-rose-500" />}
              questions={synthesis.criticalQuestions.whatBreaksThisDeal}
            />
            <QuestionCategory
              title="What Risk Is Underpriced"
              icon={<DollarSign className="w-4 h-4 text-orange-500" />}
              questions={synthesis.criticalQuestions.whatRiskIsUnderpriced}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Performance footer */}
      <div className="flex items-center justify-center gap-4 text-xs text-surface-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Total: {(metadata.totalLatencyMs / 1000).toFixed(1)}s
        </span>
        <span className={NEWO_COLOR}>Newo: {(metadata.newoLatencyMs / 1000).toFixed(1)}s</span>
        <span className={DEV_COLOR}>Dev: {(metadata.devLatencyMs / 1000).toFixed(1)}s</span>
        <span>Synthesis: {metadata.synthesisLatencyMs}ms</span>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MetricBox({ label, value, target, highlight }: { label: string; value: string; target?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-lg p-3 text-center', highlight ? 'bg-teal-50 dark:bg-teal-950/30' : 'bg-surface-50 dark:bg-surface-800/50')}>
      <p className="text-xs text-surface-500">{label}</p>
      <p className={cn('font-bold', highlight ? 'text-teal-600' : '')}>{value}</p>
      {target && <p className="text-xs text-surface-400">{target}</p>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === 'critical' ? 'bg-rose-100 text-rose-700' :
    severity === 'high' ? 'bg-amber-100 text-amber-700' :
    severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
    'bg-surface-100 text-surface-600';
  return <Badge className={cn('text-xs', color)}>{severity}</Badge>;
}

function MotivationBadge({ level }: { level: string }) {
  const color = level === 'high' ? 'text-emerald-600' :
    level === 'medium' ? 'text-amber-600' :
    level === 'low' ? 'text-rose-600' : 'text-surface-500';
  return <span className={cn('font-medium', color)}>{level}</span>;
}

function QuestionCategory({ title, icon, questions }: { title: string; icon: React.ReactNode; questions: string[] }) {
  if (!questions?.length) return null;
  return (
    <Card variant="flat">
      <CardContent className="py-4">
        <h4 className="font-semibold flex items-center gap-2 mb-3">{icon} {title}</h4>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const isNewo = q.startsWith('[Newo]');
            const isDev = q.startsWith('[Dev]');
            return (
              <div key={i} className="flex items-start gap-2">
                {isNewo && <Badge variant="outline" className={cn('text-xs shrink-0', NEWO_COLOR)}>Newo</Badge>}
                {isDev && <Badge variant="outline" className={cn('text-xs shrink-0', DEV_COLOR)}>Dev</Badge>}
                <p className="text-sm text-surface-600 dark:text-surface-300">
                  {q.replace(/^\[(Newo|Dev)\]\s*/, '')}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
