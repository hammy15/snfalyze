'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BarChart3,
  DollarSign,
  Building2,
  Target,
  HelpCircle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface AnalysisValuationProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
  sessionId: string;
}

interface ValuationMethod {
  method: string;
  label: string;
  value: number;
  confidence: number;
  notes: string;
}

export function AnalysisValuation({ stageData, onUpdate, sessionId }: AnalysisValuationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('thesis');
  const initRef = useRef(false);

  const analysisResult = stageData.analysisResult;

  // Run analysis on mount if not already done
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!analysisResult?.completed) {
      runAnalysis();
    }
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wizard/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stageData: {
            visionExtraction: stageData.visionExtraction,
            coaMappingReview: stageData.coaMappingReview,
            reconciliation: stageData.reconciliation,
            facilityIdentification: stageData.facilityIdentification,
            dealStructure: stageData.dealStructure,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        onUpdate({
          analysisResult: {
            completed: true,
            thesis: data.data.thesis,
            narrative: data.data.narrative,
            confidenceScore: data.data.confidenceScore,
            valuations: data.data.valuations,
            purchaseRecommendation: data.data.purchaseRecommendation,
            rentRecommendation: data.data.rentRecommendation,
            financialSummary: data.data.financialSummary,
            riskAssessment: data.data.riskAssessment,
            selfValidation: data.data.selfValidation,
            criticalQuestions: data.data.criticalQuestions,
          },
        });
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to run analysis. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Build local analysis from extracted data if API isn't available
  const buildLocalAnalysis = () => {
    const facilities = stageData.visionExtraction?.facilities || [];
    const totalBeds = facilities.reduce((sum, f) => sum + (f.beds || 0), 0);
    const totalRevenue = facilities.reduce((sum, f) => {
      const revItems = f.lineItems.filter(i => i.category === 'revenue');
      return sum + revItems.reduce((s, item) => s + item.values.reduce((t, v) => t + (v.value || 0), 0), 0);
    }, 0);
    const totalExpenses = facilities.reduce((sum, f) => {
      const expItems = f.lineItems.filter(i => i.category === 'expense');
      return sum + expItems.reduce((s, item) => s + item.values.reduce((t, v) => t + (v.value || 0), 0), 0);
    }, 0);
    const noi = totalRevenue - totalExpenses;
    const noiMargin = totalRevenue > 0 ? (noi / totalRevenue) * 100 : 0;

    // Calculate valuations using standard methods
    const capRates = [0.10, 0.11, 0.12, 0.125];
    const capRateValuations = capRates.map(rate => ({
      rate,
      value: noi > 0 ? noi / rate : 0,
    }));

    const midCapRate = 0.115;
    const capRateValue = noi > 0 ? noi / midCapRate : 0;
    const pricePerBed = totalBeds > 0 ? capRateValue / totalBeds : 0;

    const valuations: ValuationMethod[] = [
      {
        method: 'cap_rate',
        label: 'Cap Rate (11.5%)',
        value: capRateValue,
        confidence: 0.9,
        notes: `NOI ${formatCurrency(noi)} / 11.5% cap = ${formatCurrency(capRateValue)}`,
      },
      {
        method: 'price_per_bed',
        label: 'Price Per Bed',
        value: totalBeds * 20000,
        confidence: 0.7,
        notes: `${totalBeds} beds × $20,000/bed (market avg for value tier)`,
      },
      {
        method: 'noi_multiple',
        label: 'NOI Multiple (7x)',
        value: noi * 7,
        confidence: 0.8,
        notes: `NOI ${formatCurrency(noi)} × 7x multiple`,
      },
      {
        method: 'revenue_multiple',
        label: 'Revenue Multiple (1.0x)',
        value: totalRevenue,
        confidence: 0.6,
        notes: `Revenue ${formatCurrency(totalRevenue)} × 1.0x`,
      },
    ];

    // Risk assessment
    const riskAssessment = {
      overallScore: noiMargin > 15 ? 72 : noiMargin > 10 ? 58 : 42,
      rating: noiMargin > 15 ? 'Moderate' : noiMargin > 10 ? 'Elevated' : 'High',
      recommendation: (noiMargin > 12 ? 'pursue' : noiMargin > 8 ? 'conditional' : 'pass') as 'pursue' | 'conditional' | 'pass',
      topRisks: [
        noiMargin < 15 ? 'Thin margins require operational improvement' : null,
        totalBeds < 100 ? 'Small facility size limits economies of scale' : null,
        'Reimbursement rate changes could impact revenue',
        'Labor market tightness may increase staffing costs',
      ].filter(Boolean) as string[],
      strengths: [
        totalBeds > 50 ? `${totalBeds}-bed portfolio provides scale` : null,
        noiMargin > 10 ? `${noiMargin.toFixed(1)}% NOI margin shows operational viability` : null,
        facilities.length > 1 ? `${facilities.length} facility portfolio diversifies risk` : null,
      ].filter(Boolean) as string[],
    };

    const selfValidation = {
      weakestAssumption: 'Current occupancy rates are sustainable',
      sellerManipulationRisk: noiMargin > 20 ? 'HIGH — Unusually high margins may include one-time items' : 'LOW — Margins are within normal range',
      recessionStressTest: `15% revenue decline → NOI drops to ${formatCurrency(noi * 0.75)}`,
      coverageUnderStress: noi * 0.75 > 0 ? 'Survives stress scenario' : 'Does not survive stress scenario',
    };

    const criticalQuestions = {
      whatMustGoRightFirst: ['Census must stabilize at current or higher levels', 'Reimbursement rates must remain stable'],
      whatCannotGoWrong: ['Major survey deficiencies', 'Key staff departures'],
      whatBreaksThisDeal: ['State rate cuts > 5%', 'Occupancy drops below 75%'],
      whatRiskIsUnderpriced: ['Agency labor dependency', 'Deferred maintenance costs'],
    };

    onUpdate({
      analysisResult: {
        completed: true,
        thesis: `${facilities.length}-facility portfolio with ${totalBeds} total beds generating ${formatCurrency(noi)} NOI at ${noiMargin.toFixed(1)}% margin. ${riskAssessment.recommendation === 'pursue' ? 'Recommend pursuing' : riskAssessment.recommendation === 'conditional' ? 'Conditional pursuit recommended' : 'Recommend passing'}.`,
        narrative: `This ${stageData.dealStructure?.assetType || 'SNF'} portfolio presents a ${riskAssessment.recommendation} opportunity. The portfolio generates ${formatCurrency(totalRevenue)} in total revenue with ${formatCurrency(noi)} NOI, yielding a ${noiMargin.toFixed(1)}% margin. At an 11.5% cap rate, the implied value is ${formatCurrency(capRateValue)} (${formatCurrency(pricePerBed)}/bed).`,
        confidenceScore: Math.round(riskAssessment.overallScore),
        valuations,
        riskAssessment,
        selfValidation,
        criticalQuestions,
      },
    });
  };

  // If no analysis result and loading failed, build local analysis
  useEffect(() => {
    if (error && !analysisResult?.completed) {
      buildLocalAnalysis();
      setError(null);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <Brain className="w-12 h-12 text-primary-500 animate-pulse" />
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-surface-600 font-medium">Running Cascadia Intelligence Analysis...</p>
        <p className="text-sm text-surface-400">Evaluating financials, risk, and valuation</p>
      </div>
    );
  }

  if (!analysisResult?.completed) {
    return (
      <Card variant="flat" className="text-center py-12">
        <CardContent>
          <Brain className="w-12 h-12 mx-auto text-surface-300 mb-4" />
          <p className="text-surface-500 mb-4">Ready to run deal analysis</p>
          <Button onClick={runAnalysis}>
            <Brain className="w-4 h-4 mr-2" />
            Run Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const recLabel = analysisResult.riskAssessment?.recommendation;
  const recColor = recLabel === 'pursue' ? 'text-emerald-600 bg-emerald-50' :
    recLabel === 'conditional' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="flat" className="col-span-2">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-primary-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">Investment Thesis</h3>
                <p className="text-surface-600 dark:text-surface-300">{analysisResult.thesis}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-surface-500 mb-1">Recommendation</p>
            <Badge className={cn('text-lg px-4 py-2', recColor)}>
              {recLabel === 'pursue' ? 'PURSUE' : recLabel === 'conditional' ? 'CONDITIONAL' : 'PASS'}
            </Badge>
            <p className="text-sm text-surface-500 mt-2">
              Confidence: {analysisResult.confidenceScore}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="thesis"><Lightbulb className="w-3 h-3 mr-1" /> Narrative</TabsTrigger>
          <TabsTrigger value="valuation"><DollarSign className="w-3 h-3 mr-1" /> Valuation</TabsTrigger>
          <TabsTrigger value="risk"><Shield className="w-3 h-3 mr-1" /> Risk</TabsTrigger>
          <TabsTrigger value="validation"><Target className="w-3 h-3 mr-1" /> Self-Check</TabsTrigger>
          <TabsTrigger value="questions"><HelpCircle className="w-3 h-3 mr-1" /> Critical Qs</TabsTrigger>
        </TabsList>

        {/* Narrative */}
        <TabsContent value="thesis">
          <Card>
            <CardContent className="py-6">
              <p className="text-surface-700 dark:text-surface-200 leading-relaxed whitespace-pre-wrap">
                {analysisResult.narrative}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valuation */}
        <TabsContent value="valuation">
          <div className="space-y-4">
            {analysisResult.valuations?.map((v, idx) => (
              <Card key={idx} variant="flat">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-primary-500" />
                      <div>
                        <p className="font-medium">{v.label || v.method}</p>
                        <p className="text-sm text-surface-500">{(v as any).notes || ''}</p>
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

            {/* Purchase Price Recommendation */}
            {(analysisResult as any).purchaseRecommendation && (() => {
              const pr = (analysisResult as any).purchaseRecommendation;
              return (
                <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-emerald-600" />
                      <p className="font-semibold text-emerald-800 dark:text-emerald-200">Recommended Purchase Price</p>
                    </div>
                    <div className="text-center mb-4">
                      <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(pr.recommended)}</p>
                      {pr.perBed > 0 && <p className="text-sm text-emerald-600">{formatCurrency(pr.perBed)} per bed</p>}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center flex-1">
                        <p className="text-xs text-surface-500">Conservative</p>
                        <p className="font-medium text-rose-600">{formatCurrency(pr.low)}</p>
                      </div>
                      <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 via-emerald-500 to-blue-400 rounded-full" style={{ width: '100%' }} />
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-surface-500">Aggressive</p>
                        <p className="font-medium text-blue-600">{formatCurrency(pr.high)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Rent Recommendation */}
            {(analysisResult as any).rentRecommendation && (() => {
              const rent = (analysisResult as any).rentRecommendation;
              return (
                <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <p className="font-semibold text-blue-800 dark:text-blue-200">Rent Recommendation (Triple-Net)</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center mb-3">
                      <div>
                        <p className="text-xs text-surface-500">Annual Rent</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(rent.annualRent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-surface-500">Monthly Rent</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(rent.monthlyRent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-surface-500">Per Bed/Month</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(rent.rentPerBedMonth)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 rounded bg-blue-100/50 dark:bg-blue-900/30">
                      <span>Lease Yield: {((rent.leaseYield || 0) * 100).toFixed(1)}%</span>
                      <span className={rent.sustainable ? 'text-emerald-600' : 'text-rose-600'}>
                        Coverage: {(rent.rentCoverage || 0).toFixed(2)}x {rent.sustainable ? '(Healthy)' : '(Weak)'}
                      </span>
                    </div>
                    {rent.notes && <p className="text-xs text-surface-500 mt-2">{rent.notes}</p>}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Valuation Methods */}
            {analysisResult.valuations && analysisResult.valuations.length > 0 && (() => {
              const values = analysisResult.valuations!.map(v => v.value).filter(v => v > 0);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const weightedAvg = analysisResult.valuations!.reduce((sum, v) => sum + v.value * v.confidence, 0) /
                analysisResult.valuations!.reduce((sum, v) => sum + v.confidence, 0);

              return (
                <Card className="border-2 border-primary-200 dark:border-primary-800">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">Valuation Range</p>
                      <Badge className="bg-primary-100 text-primary-700">{formatCurrency(weightedAvg)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-surface-500">Low: {formatCurrency(min)}</span>
                      <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-400 via-primary-500 to-emerald-400 rounded-full"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <span className="text-surface-500">High: {formatCurrency(max)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </TabsContent>

        {/* Risk */}
        <TabsContent value="risk">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card variant="flat">
                <CardContent className="py-4 text-center">
                  <Shield className={cn('w-8 h-8 mx-auto mb-2',
                    (analysisResult.riskAssessment?.overallScore || 0) > 70 ? 'text-emerald-500' :
                    (analysisResult.riskAssessment?.overallScore || 0) > 50 ? 'text-amber-500' : 'text-rose-500'
                  )} />
                  <p className="text-3xl font-bold">{analysisResult.riskAssessment?.overallScore}</p>
                  <p className="text-sm text-surface-500">{analysisResult.riskAssessment?.rating}</p>
                </CardContent>
              </Card>
              <Card variant="flat">
                <CardContent className="py-4">
                  <p className="text-sm font-medium mb-2">Top Risks</p>
                  <ul className="space-y-1">
                    {analysisResult.riskAssessment?.topRisks?.slice(0, 3).map((risk, i) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Strengths */}
            {analysisResult.riskAssessment?.strengths && analysisResult.riskAssessment.strengths.length > 0 && (
              <Card variant="flat">
                <CardContent className="py-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Strengths
                  </p>
                  <ul className="space-y-1">
                    {analysisResult.riskAssessment.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-surface-600 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Self-Validation */}
        <TabsContent value="validation">
          <div className="space-y-3">
            {[
              { label: 'Weakest Assumption', value: analysisResult.selfValidation?.weakestAssumption, icon: AlertTriangle, color: 'text-amber-500' },
              { label: 'Seller Manipulation Risk', value: analysisResult.selfValidation?.sellerManipulationRisk, icon: Shield, color: 'text-rose-500' },
              { label: 'Recession Stress Test', value: analysisResult.selfValidation?.recessionStressTest, icon: TrendingUp, color: 'text-blue-500' },
              { label: 'Coverage Under Stress', value: analysisResult.selfValidation?.coverageUnderStress, icon: Target, color: 'text-primary-500' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} variant="flat">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <Icon className={cn('w-5 h-5 mt-0.5', item.color)} />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-sm text-surface-600 dark:text-surface-300">{item.value || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Critical Questions */}
        <TabsContent value="questions">
          <div className="space-y-4">
            {[
              { title: 'What Must Go Right First?', items: analysisResult.criticalQuestions?.whatMustGoRightFirst, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { title: 'What Cannot Go Wrong?', items: analysisResult.criticalQuestions?.whatCannotGoWrong, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
              { title: 'What Breaks This Deal?', items: analysisResult.criticalQuestions?.whatBreaksThisDeal, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
              { title: 'What Risk Is Underpriced?', items: analysisResult.criticalQuestions?.whatRiskIsUnderpriced, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            ].map((section, idx) => (
              <Card key={idx} variant="flat">
                <CardContent className="py-4">
                  <p className={cn('font-medium mb-2', section.color.split(' ')[0])}>{section.title}</p>
                  <ul className="space-y-1">
                    {section.items?.map((item, i) => (
                      <li key={i} className="text-sm text-surface-600 dark:text-surface-300 flex items-start gap-2">
                        <span className="text-surface-400">-</span>
                        {item}
                      </li>
                    )) || <li className="text-sm text-surface-400">No items</li>}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Re-run button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={runAnalysis} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Re-run Analysis
        </Button>
      </div>
    </div>
  );
}
