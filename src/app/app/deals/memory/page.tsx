'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DealMemory } from '@/components/deals';
import {
  type Deal,
  type DealSynthesis,
  type DealOutcome,
} from '@/lib/deals/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Mock data for deals with outcomes
const mockDealsWithOutcomes: (Deal & { synthesis?: DealSynthesis; outcome?: DealOutcome })[] = [
  {
    id: '1',
    deal_id: 'CAS-2023-042',
    name: 'Lakeside Portfolio',
    asset_types: ['snf'],
    is_portfolio: true,
    facility_count: 2,
    total_beds: 180,
    states: ['WA'],
    source: 'broker',
    source_name: 'CBRE',
    received_date: new Date('2023-08-01'),
    initial_hypothesis: 'stabilized',
    current_hypothesis: 'stabilized',
    status: 'closed',
    current_stage: 'synthesis',
    asking_price: 24000000,
    created_at: new Date('2023-08-01'),
    updated_at: new Date('2024-01-15'),
    outcome: {
      id: '1',
      deal_id: '1',
      outcome: 'won',
      final_price: 22000000,
      close_date: new Date('2024-01-15'),
      what_we_got_right: [
        'Census stabilization projections were accurate',
        'Labor market assumptions held',
        'Correctly identified value-add opportunities',
      ],
      what_we_got_wrong: [
        'Underestimated CapEx for roof repairs',
        'Overestimated payer mix improvement timeline',
      ],
      surprises: [
        'Seller provided additional transition support',
        'Local hospital referral partnership opportunity discovered',
      ],
      comparable_deal_tags: ['portfolio', 'stabilized', 'washington', 'snf'],
      created_at: new Date('2024-01-20'),
    },
  },
  {
    id: '2',
    deal_id: 'CAS-2023-039',
    name: 'Valley View SNF',
    asset_types: ['snf'],
    is_portfolio: false,
    facility_count: 1,
    total_beds: 85,
    states: ['OR'],
    source: 'seller_direct',
    received_date: new Date('2023-06-15'),
    initial_hypothesis: 'turnaround',
    current_hypothesis: 'distressed_fixable',
    status: 'passed',
    current_stage: 'synthesis',
    asking_price: 12000000,
    created_at: new Date('2023-06-15'),
    updated_at: new Date('2023-09-01'),
    outcome: {
      id: '2',
      deal_id: '2',
      outcome: 'passed',
      what_we_got_right: [
        'Identified regulatory concerns early',
        'Correctly assessed high agency dependency risk',
      ],
      what_we_got_wrong: [],
      surprises: [
        'Facility received additional survey deficiencies after our pass',
      ],
      comparable_deal_tags: ['turnaround', 'oregon', 'regulatory_risk', 'snf'],
      created_at: new Date('2023-09-05'),
    },
  },
  {
    id: '3',
    deal_id: 'CAS-2023-051',
    name: 'Sunrise Care Center',
    asset_types: ['snf'],
    is_portfolio: false,
    facility_count: 1,
    total_beds: 120,
    states: ['CA'],
    source: 'auction',
    source_name: 'JLL',
    received_date: new Date('2023-10-01'),
    initial_hypothesis: 'value_add',
    current_hypothesis: 'value_add',
    status: 'dead',
    current_stage: 'valuation',
    asking_price: 18000000,
    created_at: new Date('2023-10-01'),
    updated_at: new Date('2023-11-15'),
    outcome: {
      id: '3',
      deal_id: '3',
      outcome: 'lost_to_competitor',
      final_price: 19500000,
      what_we_got_right: [
        'Valuation range was appropriate',
        'Correctly identified payer mix improvement opportunity',
      ],
      what_we_got_wrong: [
        'Underestimated competitor interest',
        'Should have moved faster on LOI',
      ],
      surprises: [
        'Winning bidder paid 8% premium over asking',
      ],
      comparable_deal_tags: ['value_add', 'california', 'competitive_market', 'snf'],
      created_at: new Date('2023-11-20'),
    },
  },
  {
    id: '4',
    deal_id: 'CAS-2024-003',
    name: 'Mountain View ALF',
    asset_types: ['alf'],
    is_portfolio: false,
    facility_count: 1,
    total_beds: 65,
    states: ['CO'],
    source: 'broker',
    source_name: 'Blueprint Healthcare',
    received_date: new Date('2024-01-10'),
    initial_hypothesis: 'stabilized',
    status: 'active',
    current_stage: 'financial_reconstruction',
    asking_price: 8500000,
    created_at: new Date('2024-01-10'),
    updated_at: new Date(),
    outcome: {
      id: '4',
      deal_id: '4',
      outcome: 'still_active',
      what_we_got_right: [],
      what_we_got_wrong: [],
      surprises: [],
      comparable_deal_tags: ['alf', 'colorado', 'stabilized'],
      created_at: new Date(),
    },
  },
  {
    id: '5',
    deal_id: 'CAS-2023-028',
    name: 'Desert Palms Portfolio',
    asset_types: ['snf', 'alf'],
    is_portfolio: true,
    facility_count: 4,
    total_beds: 320,
    states: ['AZ', 'NV'],
    source: 'off_market',
    received_date: new Date('2023-04-01'),
    initial_hypothesis: 'turnaround',
    current_hypothesis: 'turnaround',
    status: 'closed',
    current_stage: 'synthesis',
    asking_price: 38000000,
    created_at: new Date('2023-04-01'),
    updated_at: new Date('2023-10-01'),
    outcome: {
      id: '5',
      deal_id: '5',
      outcome: 'won',
      final_price: 35000000,
      close_date: new Date('2023-10-01'),
      what_we_got_right: [
        'Turnaround thesis proven correct',
        'Census improvement on track',
        'Successfully reduced agency by 40%',
        'Correctly identified operational inefficiencies',
      ],
      what_we_got_wrong: [
        'Timeline for stabilization longer than expected',
        'Nevada facility required more management attention',
      ],
      surprises: [
        'One facility administrator resigned during transition',
        'Local competitor closure boosted referrals',
      ],
      comparable_deal_tags: ['turnaround', 'portfolio', 'arizona', 'nevada', 'snf', 'alf', 'multi_state'],
      created_at: new Date('2023-10-15'),
    },
  },
];

export default function DealMemoryPage() {
  const [deals, setDeals] = useState(mockDealsWithOutcomes);

  const handleRecordOutcome = (
    dealId: string,
    outcome: Omit<DealOutcome, 'id' | 'deal_id' | 'created_at'>
  ) => {
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              outcome: {
                ...outcome,
                id: Date.now().toString(),
                deal_id: dealId,
                created_at: new Date(),
              },
            }
          : deal
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/deals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Deal Memory</h1>
            <p className="text-muted-foreground">
              Learn from past deals to improve future analysis
            </p>
          </div>
        </div>
      </div>

      {/* Deal Memory Component */}
      <DealMemory deals={deals} onRecordOutcome={handleRecordOutcome} />
    </div>
  );
}
