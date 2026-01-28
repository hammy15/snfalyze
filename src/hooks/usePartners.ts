'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PartnerEconomics {
  targetCapRate: number;
  targetYield: number;
  minCoverage: number;
  targetCoverage: number;
}

export interface PartnerLeaseTerms {
  structure: string;
  initialTermYears: number;
  renewalOptions: number;
  renewalTermYears: number;
  escalationType: string;
  fixedEscalation?: number;
}

export interface Partner {
  id: string;
  name: string;
  type: string;
  riskTolerance: string;
  economics: PartnerEconomics;
  leaseTerms: PartnerLeaseTerms;
}

interface UsePartnersReturn {
  partners: Partner[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePartners(dealId: string): UsePartnersReturn {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/master-lease`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch partners');
      setPartners(json.partners || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return { partners, loading, error, refetch: fetchPartners };
}
