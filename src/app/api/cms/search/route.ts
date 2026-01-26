import { NextRequest, NextResponse } from 'next/server';
import { searchProvidersByName } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const state = searchParams.get('state') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const providers = await searchProvidersByName(query, state, Math.min(limit, 100));

    return NextResponse.json({
      success: true,
      data: providers,
      count: providers.length,
    });
  } catch (error) {
    console.error('Error searching CMS providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search providers' },
      { status: 500 }
    );
  }
}
