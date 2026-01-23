import { NextRequest, NextResponse } from 'next/server';
import { lookupProviderByCCN, searchProvidersByName } from '@/lib/cms';

// Unified CMS provider search endpoint
// Supports: ?ccn=XXXXXX or ?name=provider+name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ccn = searchParams.get('ccn');
    const name = searchParams.get('name');
    const state = searchParams.get('state') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // CCN lookup (exact match)
    if (ccn) {
      const provider = await lookupProviderByCCN(ccn);

      if (!provider) {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
        });
      }

      // Normalize to array format and map to expected interface
      return NextResponse.json({
        success: true,
        data: [
          {
            ccn: provider.ccn,
            providerName: provider.providerName,
            address: provider.address,
            city: provider.city,
            state: provider.state,
            zipCode: provider.zipCode,
            numberOfBeds: provider.numberOfBeds,
            overallRating: provider.overallRating,
            healthInspectionRating: provider.healthInspectionRating,
            staffingRating: provider.staffingRating,
            qualityMeasureRating: provider.qualityMeasureRating,
            isSff: provider.isSff || false,
            isSffCandidate: provider.isSffCandidate || false,
          },
        ],
        count: 1,
      });
    }

    // Name search (returns simplified results)
    if (name) {
      if (name.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters' },
          { status: 400 }
        );
      }

      const providers = await searchProvidersByName(name, state, Math.min(limit, 100));

      // Map search results to expected interface
      // Note: search results have limited fields, so some are null
      const mappedProviders = providers.map((p) => ({
        ccn: p.ccn,
        providerName: p.name, // search returns 'name' not 'providerName'
        address: '', // not available in search results
        city: p.city,
        state: p.state,
        zipCode: '', // not available in search results
        numberOfBeds: p.beds, // search returns 'beds' not 'numberOfBeds'
        overallRating: p.overallRating,
        healthInspectionRating: null as number | null,
        staffingRating: null as number | null,
        qualityMeasureRating: null as number | null,
        isSff: p.isSff || false,
        isSffCandidate: false, // not available in search results
      }));

      return NextResponse.json({
        success: true,
        data: mappedProviders,
        count: mappedProviders.length,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Either ccn or name parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error searching CMS providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search providers' },
      { status: 500 }
    );
  }
}
