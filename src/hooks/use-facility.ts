'use client';

import { useState, useEffect, useCallback } from 'react';

interface FacilityFinancials {
  revenue: number;
  expenses: number;
  noi: number;
  ebitdar: number;
  ebitda: number;
}

interface FacilityMarketData {
  marketCapRate: number;
  marketPricePerBed: number;
}

interface FacilityData {
  id: string;
  dealId?: string | null;
  name: string;
  ccn?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  assetType?: string | null;
  licensedBeds?: number | null;
  certifiedBeds?: number | null;
  yearBuilt?: number | null;
  lastRenovation?: number | null;
  squareFootage?: number | null;
  acres?: string | null;
  cmsRating?: number | null;
  healthRating?: number | null;
  staffingRating?: number | null;
  qualityRating?: number | null;
  isSff?: boolean | null;
  isSffWatch?: boolean | null;
  hasImmediateJeopardy?: boolean | null;
  financials?: FacilityFinancials | null;
  marketData?: FacilityMarketData | null;
  census?: any;
  payerRates?: any;
}

interface UseFacilityResult {
  facility: FacilityData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFacility(facilityId: string): UseFacilityResult {
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacility = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/facilities/${facilityId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch facility');
      }

      setFacility(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch facility';
      setError(message);
      console.error('Error fetching facility:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchFacility();
  }, [fetchFacility]);

  return {
    facility,
    isLoading,
    error,
    refetch: fetchFacility,
  };
}

// Hook for fetching multiple facilities
export function useFacilities(dealId?: string) {
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacilities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = dealId
        ? `/api/deals/${dealId}/facilities`
        : '/api/facilities';

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch facilities');
      }

      setFacilities(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch facilities';
      setError(message);
      console.error('Error fetching facilities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  return {
    facilities,
    isLoading,
    error,
    refetch: fetchFacilities,
  };
}

// Hook for fetching facility financial data
export function useFacilityFinancials(facilityId: string, months = 12) {
  const [financials, setFinancials] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/facilities/${facilityId}/financial?months=${months}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch financial data');
      }

      setFinancials(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch financial data';
      setError(message);
      console.error('Error fetching facility financials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId, months]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return {
    financials,
    isLoading,
    error,
    refetch: fetchFinancials,
  };
}

// Hook for fetching facility census data
export function useFacilityCensus(facilityId: string) {
  const [census, setCensus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCensus = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/facilities/${facilityId}/census`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch census data');
      }

      setCensus(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch census data';
      setError(message);
      console.error('Error fetching facility census:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchCensus();
  }, [fetchCensus]);

  return {
    census,
    isLoading,
    error,
    refetch: fetchCensus,
  };
}

// Hook for fetching facility payer rates
export function useFacilityPayerRates(facilityId: string) {
  const [rates, setRates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/facilities/${facilityId}/payer-rates`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch payer rates');
      }

      setRates(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch payer rates';
      setError(message);
      console.error('Error fetching facility payer rates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    isLoading,
    error,
    refetch: fetchRates,
  };
}
