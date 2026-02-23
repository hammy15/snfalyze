import { NextRequest, NextResponse } from 'next/server';
import { getProviderDeficiencies, getProviderPenalties } from '@/lib/cms/cms-client';
import { lookupProviderByCCN } from '@/lib/cms/provider-lookup';

interface SurveyItem {
  date: string;
  tag: string;
  description: string;
  scopeSeverity: string;
  corrected: boolean;
  correctionDate: string | null;
}

interface PenaltyItem {
  type: string;
  date: string;
  amount: number | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ccn: string }> }
) {
  try {
    const { ccn } = await params;

    if (!ccn || ccn.replace(/\D/g, '').length < 4) {
      return NextResponse.json(
        { error: 'Invalid CCN format' },
        { status: 400 }
      );
    }

    const [facility, deficiencies, penalties] = await Promise.all([
      lookupProviderByCCN(ccn),
      getProviderDeficiencies(ccn),
      getProviderPenalties(ccn),
    ]);

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Map deficiencies to survey items
    const surveys: SurveyItem[] = deficiencies.map((d) => ({
      date: d.survey_date || '',
      tag: `${d.deficiency_prefix || ''}${d.deficiency_tag_number || ''}`,
      description: d.deficiency_description || '',
      scopeSeverity: d.scope_severity_code || '',
      corrected: d.deficiency_corrected === 'Y',
      correctionDate: d.correction_date || null,
    }));

    // Map penalties to penalty items
    const penaltyItems: PenaltyItem[] = penalties.map((p) => ({
      type: p.penalty_type || '',
      date: p.penalty_date || '',
      amount: p.fine_amount ? parseFloat(p.fine_amount) || null : null,
    }));

    // Sort surveys by date descending
    surveys.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    // Sort penalties by date descending
    penaltyItems.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      facility: {
        name: facility.providerName,
        ccn: facility.ccn,
        state: facility.state,
        beds: facility.numberOfBeds,
        overallRating: facility.overallRating,
      },
      surveys,
      penalties: penaltyItems,
    });
  } catch (error) {
    console.error('Error fetching survey history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey history' },
      { status: 500 }
    );
  }
}
