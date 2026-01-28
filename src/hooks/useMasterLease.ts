'use client';

import { useState, useCallback } from 'react';

export interface YearlyProjection {
  year: number;
  phase: 'initial' | 'renewal_1' | 'renewal_2' | 'renewal_3';
  annualRent: number;
  cumulativeRent: number;
  discountFactor: number;
  presentValue: number;
  projectedEbitdar: number;
  projectedCoverage: number;
}

export interface LeaseProjection {
  initialTermYears: number;
  renewalOptions: number;
  renewalTermYears: number;
  totalPotentialYears: number;
  leaseNpv: number;
  totalLeaseObligation: number;
  avgAnnualRent: number;
  renewalOptionValue: number;
  purchaseOptionIrr?: number;
  yearlyProjections: YearlyProjection[];
}

export interface SensitivityPoint {
  capRate: number;
  purchasePrice: number;
  annualRent: number;
  coverage: number;
}

export interface Sensitivity {
  capRateSensitivity: SensitivityPoint[];
  noiSensitivity: Array<{ noiChange: number; purchasePrice: number; coverage: number }>;
  occupancySensitivity: Array<{ occupancy: number; projectedNoi: number; coverage: number }>;
  escalationSensitivity: Array<{ escalation: number; year5Rent: number; year10Rent: number; totalLeaseObligation: number }>;
  breakEvenOccupancy: number;
  breakEvenNoiDecline: number;
  cushionToBreakeven: number;
}

export interface BuyVsLeaseAnalysis {
  purchase: {
    totalCost: number;
    equityRequired: number;
    debtService: number;
    netCashFlow: number;
    yearOneReturn: number;
    fiveYearIrr: number;
  };
  lease: {
    yearOneRent: number;
    fiveYearRent: number;
    tenYearRent: number;
    effectiveCost: number;
  };
  recommendation: 'purchase' | 'lease' | 'either';
  rationale: string;
}

export interface DecisionFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface MasterLeaseDecision {
  recommendation: 'proceed' | 'negotiate' | 'pass';
  confidence: 'high' | 'medium' | 'low';
  positiveFactors: DecisionFactor[];
  negativeFactors: DecisionFactor[];
  riskMitigations: string[];
  suggestedPurchasePrice: { low: number; mid: number; high: number };
  suggestedRent: { low: number; mid: number; high: number };
  buyVsLeaseAnalysis: BuyVsLeaseAnalysis;
}

export interface FacilityEconomics {
  id: string;
  name: string;
  beds: number;
  state: string;
  cmsRating?: number;
  ttmNoi: number;
  ttmEbitdar: number;
  occupancyRate: number;
  purchasePrice: number;
  annualRent: number;
  coverageRatio: number;
  recommendation: 'include' | 'exclude' | 'negotiate';
  underwritingScore: number;
  underwritingPasses: boolean;
  issues: string[];
}

export interface MasterLeaseSummary {
  totalFacilities: number;
  includedFacilities: number;
  excludedFacilities: number;
  totalBeds: number;
  includedBeds: number;
  totalRevenue: number;
  totalEbitdar: number;
  totalNoi: number;
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalMonthlyRent: number;
  weightedCapRate: number;
  weightedYield: number;
  portfolioCoverageRatio: number;
  coverageStatus: 'healthy' | 'warning' | 'critical';
  avgPricePerBed: number;
  avgRentPerBed: number;
  avgNoiPerBed: number;
  avgEbitdarMargin: number;
  riskAdjustedCapRate: number;
  riskAdjustedPurchasePrice: number;
  avgCmsRating: number;
  avgOccupancy: number;
  portfolioHealthScore: number;
}

export interface MasterLeaseResponse {
  dealId: string;
  dealName: string;
  partner: {
    id: string;
    name: string;
    type: string;
  };
  summary: MasterLeaseSummary;
  facilityAnalysis: FacilityEconomics[];
  leaseProjection: LeaseProjection;
  sensitivity: Sensitivity;
  decision: MasterLeaseDecision;
  warnings: string[];
  recommendations: string[];
}

export interface MasterLeaseRequest {
  partnerId?: string;
  options?: {
    discountRate?: number;
    projectionYears?: number;
    includeRenewals?: boolean;
    noiGrowthRate?: number;
  };
}

interface UseMasterLeaseReturn {
  data: MasterLeaseResponse | null;
  loading: boolean;
  error: string | null;
  runAnalysis: (options?: MasterLeaseRequest) => Promise<void>;
  reset: () => void;
}

export function useMasterLease(dealId: string): UseMasterLeaseReturn {
  const [data, setData] = useState<MasterLeaseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (options?: MasterLeaseRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/master-lease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Master lease analysis failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Master lease analysis failed');
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
