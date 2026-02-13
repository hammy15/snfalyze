'use client';

import { useState, useEffect } from 'react';
import { MethodBreakdown } from './MethodBreakdown';
import { RefreshCw } from 'lucide-react';

interface ValuationBreakdownWrapperProps {
  dealId: string;
}

export function ValuationBreakdownWrapper({ dealId }: ValuationBreakdownWrapperProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchValuation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/deals/${dealId}/risk-valuation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to fetch valuation');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError('Failed to load valuation data');
      } finally {
        setLoading(false);
      }
    }
    fetchValuation();
  }, [dealId]);

  if (loading) {
    return (
      <div className="neu-card p-8 text-center">
        <RefreshCw className="w-6 h-6 mx-auto text-surface-400 animate-spin mb-3" />
        <p className="text-sm text-surface-500">Running valuation engine...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="neu-card p-6 text-center">
        <p className="text-sm text-surface-500">{error || 'No valuation data available'}</p>
        <p className="text-xs text-surface-400 mt-1">
          Upload financial documents and run analysis to generate valuations
        </p>
      </div>
    );
  }

  // Map the portfolio risk valuation data to MethodBreakdown format
  const portfolio = data.portfolio;
  if (!portfolio) {
    return (
      <div className="neu-card p-6 text-center">
        <p className="text-sm text-surface-500">No portfolio valuation available</p>
      </div>
    );
  }

  // Build method results from facility-level data
  // The risk-valuation returns per-facility data with cap-rate based valuations
  // We'll synthesize method-level breakdown from the portfolio aggregates
  const totalValue = portfolio.totalRiskAdjustedValue || 0;
  const totalBaseValue = portfolio.totalBaseValue || 0;
  const avgCapRate = portfolio.weightedAverageCapRate || 0.12;
  const totalBeds = data.facilities?.reduce((sum: number, f: any) => sum + (f.beds || 0), 0) || 0;

  const methods: Record<string, any> = {};

  // Cap Rate method (primary — always available from risk valuation)
  if (totalValue > 0) {
    methods.capRate = {
      name: 'Cap Rate',
      value: totalValue,
      confidence: portfolio.overallRisk === 'low' ? 'high' : portfolio.overallRisk === 'moderate' ? 'medium' : 'low',
      weight: 0.35,
      weightedValue: totalValue * 0.35,
      inputs: {
        'Risk-Adjusted Cap Rate': `${(avgCapRate * 100).toFixed(2)}%`,
        'Base Cap Rate': `${((portfolio.weightedAverageBaseCapRate || 0.12) * 100).toFixed(2)}%`,
        'Total Risk Premium': `${((portfolio.totalRiskPremium || 0) * 100).toFixed(0)} bps`,
        'Facilities': data.facilities?.length || 0,
      },
      adjustments: (portfolio.riskBreakdown || []).slice(0, 5).map((r: any) => ({
        description: r.category || r.factor || 'Risk adjustment',
        impact: -(r.basisPoints || 0) / 10000,
      })),
    };
  }

  // Price Per Bed method (synthesized from data)
  if (totalBeds > 0 && totalValue > 0) {
    const pricePerBed = totalValue / totalBeds;
    methods.pricePerBed = {
      name: 'Price Per Bed',
      value: pricePerBed * totalBeds,
      confidence: 'medium' as const,
      weight: 0.25,
      weightedValue: pricePerBed * totalBeds * 0.25,
      inputs: {
        'Price Per Bed': pricePerBed,
        'Total Beds': totalBeds,
        'Avg CMS Rating': portfolio.avgCmsRating || '—',
      },
    };
  }

  // Base Value (pre-risk) as a reference method
  if (totalBaseValue > 0 && totalBaseValue !== totalValue) {
    methods.noiMultiple = {
      name: 'NOI Multiple (Pre-Risk)',
      value: totalBaseValue,
      confidence: 'medium' as const,
      weight: 0.20,
      weightedValue: totalBaseValue * 0.20,
      inputs: {
        'Base Value': totalBaseValue,
        'vs Risk-Adjusted': `${(((totalValue - totalBaseValue) / totalBaseValue) * 100).toFixed(1)}%`,
      },
    };
  }

  // Calculate reconciled from weighted methods
  const enabledMethods = Object.values(methods).filter(Boolean);
  const totalWeight = enabledMethods.reduce((sum: number, m: any) => sum + m.weight, 0);
  const reconciledValue = enabledMethods.reduce((sum: number, m: any) => sum + m.value * (m.weight / totalWeight), 0);

  return (
    <MethodBreakdown
      methods={methods}
      reconciledValue={reconciledValue}
      valueLow={reconciledValue * 0.85}
      valueMid={reconciledValue}
      valueHigh={reconciledValue * 1.15}
      overallConfidence={
        portfolio.overallRisk === 'low' ? 'high' :
        portfolio.overallRisk === 'moderate' ? 'medium' : 'low'
      }
    />
  );
}
