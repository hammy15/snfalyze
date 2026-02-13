import { NextRequest, NextResponse } from 'next/server';

/**
 * CMS Provider Lookup by CCN
 * Uses CMS public data APIs to fetch facility information
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ccn = searchParams.get('ccn');

  if (!ccn) {
    return NextResponse.json(
      { success: false, error: 'CCN parameter required' },
      { status: 400 }
    );
  }

  try {
    // Try CMS Provider API (public data)
    const cmsUrl = `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][property]=federal_provider_number&conditions[0][value]=${encodeURIComponent(ccn)}&conditions[0][operator]=%3D&limit=1`;

    const cmsResponse = await fetch(cmsUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }, // Cache for 24h
    });

    if (!cmsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'CMS API unavailable',
        fallback: true,
      });
    }

    const cmsData = await cmsResponse.json();
    const results = cmsData?.results || [];

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No facility found for CCN: ${ccn}`,
      });
    }

    const provider = results[0];

    // Map CMS data to our facility format
    const facility = {
      name: provider.provider_name || provider.facility_name || `Facility ${ccn}`,
      ccn,
      address: provider.provider_address || provider.address,
      city: provider.provider_city || provider.city,
      state: provider.provider_state || provider.state,
      zipCode: provider.provider_zip_code || provider.zip_code,
      assetType: inferAssetTypeFromCMS(provider),
      licensedBeds: parseInt(provider.number_of_certified_beds) || parseInt(provider.number_of_all_beds) || undefined,
      certifiedBeds: parseInt(provider.number_of_certified_beds) || undefined,
      cmsRating: parseInt(provider.overall_rating) || undefined,
      healthRating: parseInt(provider.health_inspection_rating) || undefined,
      staffingRating: parseInt(provider.staffing_rating) || undefined,
      qualityRating: parseInt(provider.quality_measure_rating) || undefined,
      isSff: provider.special_focus_status === 'SFF',
      confidence: 95,
    };

    return NextResponse.json({
      success: true,
      data: facility,
    });
  } catch (error) {
    console.error('CMS lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up CMS data' },
      { status: 500 }
    );
  }
}

function inferAssetTypeFromCMS(provider: any): 'SNF' | 'ALF' | 'ILF' | 'HOSPICE' {
  const name = (provider.provider_name || '').toLowerCase();
  if (name.includes('hospice')) return 'HOSPICE';
  if (name.includes('assisted living') || name.includes('alf')) return 'ALF';
  if (name.includes('independent') || name.includes('ilf')) return 'ILF';
  return 'SNF'; // Default for nursing facilities
}
