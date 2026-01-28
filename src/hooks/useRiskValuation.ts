'use client';

import { useState, useCallback } from 'react';

export interface RiskAdjustment {
  category: 'quality' | 'operations' | 'compliance' | 'capital' | 'market' | 'other';
  factor: string;
  description: string;
  basisPoints: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface FacilityRiskProfile {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  keyRisks: string[];
  mitigatingFactors: string[];
}

export interface FacilityValuation {
  id: string;
  name: string;
  baseCapRate: number;
  baseValue: number;
  riskAdjustedCapRate: number;
  riskAdjustedValue: number;
  totalRiskPremium: number;
  pricePerBed: number;
  confidence: 'high' | 'medium' | 'low';
  riskProfile: FacilityRiskProfile;
  adjustments: RiskAdjustment[];
}

export interface QualityDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface PortfolioRiskProfile {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  qualityDistribution: QualityDistribution[];
  concentrationRisk: number;
  geographicDiversification: number;
  complianceRisk: number;
  operationalRisk: number;
  marketRisk: number;
  capitalNeedsRisk: number;
  staffingRisk: number;
}

export interface RiskValuationResponse {
  dealId: string;
  dealName: string;
  assetType: string;
  portfolio: {
    totalFacilities: number;
    totalBeds: number;
    totalBaseValue: number;
    totalRiskAdjustedValue: number;
    valueImpact: number;
    portfolioRiskPremium: number;
    weightedCapRate: number;
    weightedRiskAdjustedCapRate: number;
    diversificationBenefit: number;
  };
  riskProfile: PortfolioRiskProfile;
  facilities: FacilityValuation[];
  recommendations: string[];
}

interface UseRiskValuationReturn {
  data: RiskValuationResponse | null;
  loading: boolean;
  error: string | null;
  runAnalysis: () => Promise<void>;
  reset: () => void;
}

export function useRiskValuation(dealId: string): UseRiskValuationReturn {
  const [data, setData] = useState<RiskValuationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/risk-valuation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Risk valuation failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Risk valuation failed');
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
