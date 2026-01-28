'use client';

import { useState, useCallback } from 'react';

export interface DecisionPricing {
  askingPrice: number | null;
  riskAdjustedValue: number;
  suggestedPrice: {
    min: number;
    target: number;
    max: number;
  };
  suggestedRent: {
    atMinPrice: number;
    atTargetPrice: number;
    atMaxPrice: number;
  };
  impliedMetrics: {
    atTargetPrice: {
      capRate: number;
      coverage: number;
      pricePerBed: number;
    };
  };
}

export interface DecisionStructure {
  type: 'purchase' | 'sale_leaseback';
  rationale: string;
  equityRequired?: number;
  debtAmount?: number;
  initialTerm?: number;
  renewals?: number;
  escalation?: number;
}

export interface DecisionResult {
  recommendation: 'strong_buy' | 'buy' | 'negotiate' | 'pass';
  confidence: 'high' | 'medium' | 'low';
  score: number;
  priceAssessment: 'attractive' | 'fair' | 'expensive' | 'unknown';
  strengths: string[];
  concerns: string[];
  dealBreakers: string[];
  pricing: DecisionPricing;
  structure: DecisionStructure;
  nextSteps: string[];
}

export interface DecisionValuation {
  baseValue: number;
  riskAdjustedValue: number;
  valueDiscount: number;
  riskPremium: number;
  portfolioRisk: 'low' | 'moderate' | 'high' | 'critical';
}

export interface DecisionLease {
  purchasePrice: number;
  annualRent: number;
  coverage: number;
  coverageStatus: 'healthy' | 'warning' | 'critical';
  leaseNpv: number;
  totalLeaseObligation: number;
}

export interface DecisionMarket {
  state: string;
  medicaidRate: number;
  rateTrend: 'improving' | 'stable' | 'declining';
  reimbursementRisk: 'low' | 'moderate' | 'high';
}

export interface DecisionUnderwriting {
  passingFacilities: number;
  totalFacilities: number;
  avgScore: number;
  blockers: string[];
}

export interface FacilityDetail {
  id: string;
  name: string;
  beds: number;
  state: string;
  cmsRating?: number;
  ttmNoi: number;
  ttmEbitdar: number;
  occupancy: number;
}

export interface DecisionResponse {
  dealId: string;
  dealName: string;
  assetType: string;
  askingPrice: number | null;
  partner: {
    id: string;
    name: string;
    type: string;
    targetCapRate: number;
    targetYield: number;
    targetCoverage: number;
  };
  valuation: DecisionValuation;
  lease: DecisionLease;
  market: DecisionMarket;
  underwriting: DecisionUnderwriting;
  decision: DecisionResult;
  facilityDetails: FacilityDetail[];
}

export interface DecisionRequest {
  partnerId?: string;
  targetCapRate?: number;
  targetYield?: number;
  targetCoverage?: number;
}

interface UseDecisionAnalysisReturn {
  data: DecisionResponse | null;
  loading: boolean;
  error: string | null;
  runAnalysis: (options?: DecisionRequest) => Promise<void>;
  reset: () => void;
}

export function useDecisionAnalysis(dealId: string): UseDecisionAnalysisReturn {
  const [data, setData] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (options?: DecisionRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, runAnalysis, reset };
}
