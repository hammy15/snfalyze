'use client';

import { useSearchParams } from 'next/navigation';

export interface DealContext {
  dealId?: string;
  dealName?: string;
  askingPrice?: number;
  beds?: number;
  assetType?: string;
  stage?: string;
  noi?: number;
  occupancy?: number;
  capRate?: number;
}

/**
 * Hook that extracts deal context from URL search params.
 * Used by tool pages to pre-fill inputs when launched from a deal workbench.
 *
 * URL pattern: /app/tools/cap-rate?dealId=xxx&dealName=Sunrise&askingPrice=20000000&beds=120
 */
export function useDealContext(): DealContext {
  const params = useSearchParams();

  return {
    dealId: params.get('dealId') || undefined,
    dealName: params.get('dealName') || undefined,
    askingPrice: params.get('askingPrice') ? Number(params.get('askingPrice')) : undefined,
    beds: params.get('beds') ? Number(params.get('beds')) : undefined,
    assetType: params.get('assetType') || undefined,
    stage: params.get('stage') || undefined,
    noi: params.get('noi') ? Number(params.get('noi')) : undefined,
    occupancy: params.get('occupancy') ? Number(params.get('occupancy')) : undefined,
    capRate: params.get('capRate') ? Number(params.get('capRate')) : undefined,
  };
}

/**
 * Build URL search params string from deal data for linking tools.
 */
export function buildDealParams(deal: {
  id?: string;
  name?: string;
  askingPrice?: number;
  beds?: number;
  assetType?: string;
  stage?: string;
}): string {
  const params = new URLSearchParams();
  if (deal.id) params.set('dealId', deal.id);
  if (deal.name) params.set('dealName', deal.name);
  if (deal.askingPrice) params.set('askingPrice', String(deal.askingPrice));
  if (deal.beds) params.set('beds', String(deal.beds));
  if (deal.assetType) params.set('assetType', deal.assetType);
  if (deal.stage) params.set('stage', deal.stage);
  return params.toString();
}
