import { NextRequest, NextResponse } from 'next/server';
import {
  leaseBuyoutCalculator,
  type LeaseBuyoutInput,
  type LeaseAcquisition,
} from '@/lib/financial-models';

// POST - Run lease buyout analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      facilities,
      buyoutAmount,
      amortizationYears,
      buyoutInterestRate,
      newLeaseTermYears,
      newBaseRent,
      newEscalation,
      minimumCoverageRatio,
    } = body;

    // Validate required fields
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one facility is required' },
        { status: 400 }
      );
    }

    if (buyoutAmount === undefined || buyoutAmount === null) {
      return NextResponse.json(
        { success: false, error: 'Buyout amount is required' },
        { status: 400 }
      );
    }

    // Validate facility data
    for (const facility of facilities) {
      if (!facility.facilityId || !facility.facilityName) {
        return NextResponse.json(
          { success: false, error: 'Each facility must have facilityId and facilityName' },
          { status: 400 }
        );
      }
      if (!facility.existingLease?.currentAnnualRent) {
        return NextResponse.json(
          { success: false, error: 'Each facility must have existingLease.currentAnnualRent' },
          { status: 400 }
        );
      }
    }

    // Convert to proper format
    const facilityData: LeaseAcquisition[] = facilities.map((f: Record<string, unknown>) => ({
      facilityId: f.facilityId as string,
      facilityName: f.facilityName as string,
      assetType: (f.assetType as 'SNF' | 'ALF' | 'ILF') ?? 'SNF',
      beds: (f.beds as number) ?? 100,
      existingLease: {
        currentAnnualRent: (f.existingLease as Record<string, unknown>)?.currentAnnualRent as number ?? (f.currentRent as number) ?? 0,
        remainingYears: (f.existingLease as Record<string, unknown>)?.remainingYears as number ?? (f.remainingLeaseYears as number) ?? 5,
        annualEscalation: (f.existingLease as Record<string, unknown>)?.annualEscalation as number ?? (f.currentEscalation as number) ?? 0.025,
        renewalOptions: (f.existingLease as Record<string, unknown>)?.renewalOptions as { terms: number; yearsEach: number } | undefined,
      },
      facilityEbitdar: (f.facilityEbitdar as number) ?? 0,
      facilityRevenue: (f.facilityRevenue as number) ?? 0,
    }));

    const input: LeaseBuyoutInput = {
      facilities: facilityData,
      buyoutAmount,
      amortizationYears,
      buyoutInterestRate,
      newLeaseTermYears,
      newBaseRent,
      newEscalation,
      minimumCoverageRatio,
    };

    const result = leaseBuyoutCalculator.runFullAnalysis(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running lease buyout analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run lease buyout analysis' },
      { status: 500 }
    );
  }
}

// GET - Get lease buyout calculation parameters info
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        description: 'Lease buyout analysis for acquiring operating leases. Buyout amount is amortized as additional rent over remaining lease term.',
        parameters: {
          facilities: {
            description: 'Array of facilities with lease data',
            required: true,
            fields: {
              facilityId: 'Unique identifier',
              facilityName: 'Facility name',
              assetType: 'SNF, ALF, or ILF (default: SNF)',
              beds: 'Number of beds',
              existingLease: {
                currentAnnualRent: 'Current annual rent (required)',
                remainingYears: 'Years remaining on lease',
                annualEscalation: 'Annual rent escalation rate (default 2.5%)',
                renewalOptions: 'Optional renewal terms',
              },
              facilityEbitdar: 'Facility EBITDAR for coverage analysis',
              facilityRevenue: 'Total facility revenue',
            },
          },
          buyoutAmount: {
            description: 'Total amount paid to acquire leases',
            required: true,
          },
          amortizationYears: {
            description: 'Years to amortize buyout (defaults to remaining lease term)',
          },
          buyoutInterestRate: {
            description: 'Implicit interest rate on buyout amortization',
          },
          newLeaseTermYears: {
            description: 'New lease term after buyout (if renegotiating)',
          },
          newBaseRent: {
            description: 'New base rent (if renegotiating)',
          },
          newEscalation: {
            description: 'New escalation rate (if renegotiating)',
          },
          minimumCoverageRatio: {
            description: 'Minimum EBITDAR coverage ratio required (default: 1.4)',
          },
        },
        example: {
          facilities: [
            {
              facilityId: 'facility-1',
              facilityName: 'Example SNF',
              assetType: 'SNF',
              beds: 120,
              existingLease: {
                currentAnnualRent: 2500000,
                remainingYears: 8,
                annualEscalation: 0.025,
              },
              facilityEbitdar: 3500000,
              facilityRevenue: 15000000,
            },
          ],
          buyoutAmount: 5000000,
          minimumCoverageRatio: 1.4,
        },
      },
    });
  } catch (error) {
    console.error('Error getting lease buyout info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get lease buyout info' },
      { status: 500 }
    );
  }
}
