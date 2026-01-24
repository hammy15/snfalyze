import { NextRequest, NextResponse } from 'next/server';
import { getFullProviderProfile } from '@/lib/cms';

/**
 * GET /api/cms/provider/[ccn]/full
 *
 * Returns comprehensive CMS data for a provider including:
 * - Provider info (ratings, beds, ownership, etc.)
 * - All deficiencies (last 3 years)
 * - All penalties (last 3 years)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ccn: string }> }
) {
  try {
    const { ccn } = await params;

    if (!ccn) {
      return NextResponse.json(
        { success: false, error: 'CCN is required' },
        { status: 400 }
      );
    }

    // Validate CCN format (6 digits)
    const normalizedCCN = ccn.replace(/\D/g, '');
    if (normalizedCCN.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid CCN format. Expected 6 digits.' },
        { status: 400 }
      );
    }

    const profile = await getFullProviderProfile(normalizedCCN);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Provider not found in CMS database' },
        { status: 404 }
      );
    }

    // Compute additional summary statistics
    const deficiencyStats = {
      total: profile.deficiencies.length,
      corrected: profile.deficiencies.filter(d => d.corrected).length,
      uncorrected: profile.deficiencies.filter(d => !d.corrected).length,
      bySeverity: profile.deficiencies.reduce((acc, d) => {
        const severity = d.scopeSeverity || 'Unknown';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const penaltyStats = {
      total: profile.penalties.length,
      totalAmount: profile.penalties.reduce((sum, p) => sum + (p.amount || 0), 0),
      byType: profile.penalties.reduce((acc, p) => {
        const type = p.type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Risk indicators
    const riskIndicators = {
      isSff: profile.isSff,
      isSffCandidate: profile.isSffCandidate,
      abuseIcon: profile.abuseIcon,
      overallRating: profile.overallRating,
      hasLowRating: profile.overallRating !== null && profile.overallRating <= 2,
      hasHighDeficiencies: deficiencyStats.total > 15,
      hasSignificantFines: penaltyStats.totalAmount > 50000,
      riskLevel: calculateRiskLevel(profile, deficiencyStats, penaltyStats),
    };

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        deficiencyStats,
        penaltyStats,
        riskIndicators,
      },
    });
  } catch (error) {
    console.error('Error fetching full CMS provider profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch provider data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall risk level for the facility
 */
function calculateRiskLevel(
  profile: Awaited<ReturnType<typeof getFullProviderProfile>>,
  deficiencyStats: { total: number },
  penaltyStats: { totalAmount: number }
): 'critical' | 'high' | 'moderate' | 'low' {
  if (!profile) return 'moderate';

  // Critical: SFF or abuse icon
  if (profile.isSff || profile.abuseIcon) {
    return 'critical';
  }

  // High: 1-star rating, SFF candidate, or severe issues
  if (
    profile.overallRating === 1 ||
    profile.isSffCandidate ||
    deficiencyStats.total > 25 ||
    penaltyStats.totalAmount > 100000
  ) {
    return 'high';
  }

  // Moderate: 2-star rating or notable issues
  if (
    profile.overallRating === 2 ||
    (profile.healthInspectionRating && profile.healthInspectionRating <= 2) ||
    deficiencyStats.total > 10 ||
    penaltyStats.totalAmount > 25000
  ) {
    return 'moderate';
  }

  return 'low';
}
