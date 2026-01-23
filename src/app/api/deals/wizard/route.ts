import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, analysisStages, saleLeaseback, capitalPartners } from '@/db';
import { eq } from 'drizzle-orm';
import { DEFAULT_CAP_RATES, DEFAULT_MIN_COVERAGE_RATIOS, AssetType } from '@/lib/sale-leaseback';

interface WizardFacilityInput {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
}

interface WizardInput {
  dealName: string;
  dealStructure: 'purchase' | 'lease' | 'sale_leaseback' | 'acquisition_financing';
  assetType: 'SNF' | 'ALF' | 'ILF';
  isAllOrNothing: boolean;
  buyerPartnerId?: string;
  specialCircumstances?: string;
  facilities: WizardFacilityInput[];
}

// GET - Fetch qualifying questions for deal wizard
export async function GET() {
  try {
    const questions = {
      dealStructure: {
        question: 'What type of transaction is this?',
        options: [
          {
            value: 'purchase',
            label: 'Direct Purchase',
            description: 'Acquire real estate and operations outright',
          },
          {
            value: 'lease',
            label: 'Lease',
            description: 'Lease real estate from existing owner',
          },
          {
            value: 'sale_leaseback',
            label: 'Sale-Leaseback',
            description: 'Sell real estate to investor, lease back to operate',
          },
          {
            value: 'acquisition_financing',
            label: 'Acquisition Financing',
            description: 'Purchase with debt/equity financing structure',
          },
        ],
      },
      saleLeasebackQuestions: {
        buyerYieldRequirement: {
          question: 'What is the buyer yield requirement?',
          hint: 'Typically ranges from cap rate to cap rate + 200bps',
          defaultByAssetType: {
            SNF: 0.125, // 12.5% for SNF
            ALF: 0.09, // 9% for ALF
            ILF: 0.085, // 8.5% for ILF
          },
        },
        minimumCoverageRatio: {
          question: 'What is the minimum EBITDAR coverage ratio?',
          hint: 'Most buyers require 1.4x or higher',
          defaultByAssetType: {
            SNF: 1.4,
            ALF: 1.35,
            ILF: 1.3,
          },
        },
        leaseTermYears: {
          question: 'What is the initial lease term?',
          hint: 'Typically 10-20 years with renewal options',
          options: [10, 12, 15, 20],
          default: 15,
        },
        rentEscalation: {
          question: 'What is the annual rent escalation?',
          hint: 'Fixed percentage or CPI-linked',
          options: [
            { value: 0.02, label: '2% Fixed' },
            { value: 0.025, label: '2.5% Fixed' },
            { value: 0.03, label: '3% Fixed' },
            { value: 'cpi', label: 'CPI-Linked' },
          ],
          default: 0.025,
        },
      },
      defaultCapRates: DEFAULT_CAP_RATES,
      defaultMinCoverageRatios: DEFAULT_MIN_COVERAGE_RATIOS,
    };

    // Also fetch available capital partners for sale-leaseback deals
    const partners = await db
      .select()
      .from(capitalPartners)
      .where(eq(capitalPartners.status, 'active'));

    const saleLeasebackPartners = partners.filter(
      (p) =>
        p.preferredStructure?.toLowerCase().includes('leaseback') ||
        p.preferredDealStructures?.some((s) => s.toLowerCase().includes('leaseback'))
    );

    return NextResponse.json({
      success: true,
      data: {
        questions,
        saleLeasebackPartners: saleLeasebackPartners.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          minimumCoverageRatio: p.minimumCoverageRatio,
          targetYield: p.targetYield,
          leaseTermPreference: p.leaseTermPreference,
          rentEscalation: p.rentEscalation,
          minDealSize: p.minDealSize,
          maxDealSize: p.maxDealSize,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching wizard questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wizard questions' },
      { status: 500 }
    );
  }
}

// POST - Create a new deal with full wizard configuration
export async function POST(request: NextRequest) {
  try {
    const body: WizardInput = await request.json();

    const {
      dealName,
      dealStructure,
      assetType,
      isAllOrNothing,
      buyerPartnerId,
      specialCircumstances,
      facilities: facilityInputs,
    } = body;

    // Validate required fields
    if (!dealName || !dealStructure || !assetType) {
      return NextResponse.json(
        { success: false, error: 'Deal name, structure, and asset type are required' },
        { status: 400 }
      );
    }

    if (!facilityInputs || facilityInputs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one facility is required' },
        { status: 400 }
      );
    }

    // Calculate total beds
    const totalBeds = facilityInputs.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);

    // Get primary state from first facility or most common state
    const states = facilityInputs.map((f) => f.state).filter(Boolean);
    const primaryState = states[0] || null;

    // Create the deal
    const [newDeal] = await db
      .insert(deals)
      .values({
        name: dealName,
        assetType,
        dealStructure,
        isAllOrNothing,
        buyerPartnerId: buyerPartnerId || null,
        specialCircumstances,
        status: 'new',
        beds: totalBeds,
        primaryState,
      })
      .returning();

    // Create facilities
    const createdFacilities = await Promise.all(
      facilityInputs.map(async (facilityInput) => {
        const [facility] = await db
          .insert(facilities)
          .values({
            dealId: newDeal.id,
            name: facilityInput.name,
            ccn: facilityInput.ccn,
            address: facilityInput.address,
            city: facilityInput.city,
            state: facilityInput.state,
            zipCode: facilityInput.zipCode,
            assetType: facilityInput.assetType,
            licensedBeds: facilityInput.licensedBeds,
            certifiedBeds: facilityInput.certifiedBeds,
            yearBuilt: facilityInput.yearBuilt,
          })
          .returning();
        return facility;
      })
    );

    // Create analysis stages for the pipeline
    const stageTypes = [
      'document_upload',
      'census_validation',
      'revenue_analysis',
      'expense_analysis',
      'cms_integration',
      'valuation_coverage',
    ] as const;

    await Promise.all(
      stageTypes.map((stage, index) =>
        db.insert(analysisStages).values({
          dealId: newDeal.id,
          stage,
          status: index === 0 ? 'in_progress' : 'pending',
          order: index + 1,
        })
      )
    );

    // If sale-leaseback, create placeholder records for each facility
    if (dealStructure === 'sale_leaseback') {
      await Promise.all(
        createdFacilities.map((facility) =>
          db.insert(saleLeaseback).values({
            dealId: newDeal.id,
            facilityId: facility.id,
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deal: newDeal,
        facilities: createdFacilities,
        message: `Created ${dealStructure.replace('_', '-')} deal with ${createdFacilities.length} facilities`,
      },
    });
  } catch (error) {
    console.error('Error creating deal via wizard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
