'use client';

import { useSearchParams } from 'next/navigation';
import { DealComparison } from '@/components/valuation/DealComparison';

export default function DealComparisonPage() {
  const searchParams = useSearchParams();
  const dealIds = searchParams.get('deals')?.split(',').filter(Boolean) || [];

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <DealComparison initialDealIds={dealIds} />
      </div>
    </div>
  );
}
