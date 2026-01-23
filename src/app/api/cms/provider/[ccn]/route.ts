import { NextRequest, NextResponse } from 'next/server';
import { lookupProviderByCCN, getFullProviderProfile } from '@/lib/cms';

export async function GET(
  request: NextRequest,
  { params }: { params: { ccn: string } }
) {
  try {
    const { ccn } = params;
    const { searchParams } = new URL(request.url);
    const includeDeficiencies = searchParams.get('includeDeficiencies') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!ccn) {
      return NextResponse.json(
        { success: false, error: 'CCN is required' },
        { status: 400 }
      );
    }

    let provider;

    if (includeDeficiencies) {
      provider = await getFullProviderProfile(ccn);
    } else {
      provider = await lookupProviderByCCN(ccn, { forceRefresh });
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error fetching CMS provider:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch provider data' },
      { status: 500 }
    );
  }
}
