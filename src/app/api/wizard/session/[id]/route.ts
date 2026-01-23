import { NextRequest, NextResponse } from 'next/server';
import { db, wizardSessions } from '@/db';
import { eq } from 'drizzle-orm';

// Wizard stages in order
const WIZARD_STAGES = [
  'document_upload',
  'review_analysis',
  'facility_verification',
  'document_extraction',
  'coa_mapping_review',
  'financial_consolidation',
] as const;

type WizardStage = typeof WIZARD_STAGES[number];

// GET - Get a specific wizard session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessions = await db
      .select()
      .from(wizardSessions)
      .where(eq(wizardSessions.id, id));

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Wizard session not found' },
        { status: 404 }
      );
    }

    const session = sessions[0];
    const currentStageIndex = WIZARD_STAGES.indexOf(session.currentStage as WizardStage);

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        currentStageIndex,
        totalStages: WIZARD_STAGES.length,
        stages: WIZARD_STAGES,
        canGoBack: currentStageIndex > 0,
        canGoForward: currentStageIndex < WIZARD_STAGES.length - 1,
        isLastStage: currentStageIndex === WIZARD_STAGES.length - 1,
      },
    });
  } catch (error) {
    console.error('Error fetching wizard session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wizard session' },
      { status: 500 }
    );
  }
}

// PATCH - Update wizard session (stage, data, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentStage, stageData, mergeStageData, advanceStage, goBack } = body;

    // Fetch existing session
    const sessions = await db
      .select()
      .from(wizardSessions)
      .where(eq(wizardSessions.id, id));

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Wizard session not found' },
        { status: 404 }
      );
    }

    const session = sessions[0];

    if (session.isComplete) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify a completed wizard session' },
        { status: 400 }
      );
    }

    const currentStageIndex = WIZARD_STAGES.indexOf(session.currentStage as WizardStage);
    let newStage = session.currentStage;
    let newStageData = session.stageData as Record<string, unknown>;

    // Handle stage navigation
    if (advanceStage && currentStageIndex < WIZARD_STAGES.length - 1) {
      newStage = WIZARD_STAGES[currentStageIndex + 1];
    } else if (goBack && currentStageIndex > 0) {
      newStage = WIZARD_STAGES[currentStageIndex - 1];
    } else if (currentStage && WIZARD_STAGES.includes(currentStage)) {
      newStage = currentStage;
    }

    // Handle stage data
    if (stageData) {
      if (mergeStageData) {
        // Deep merge stage data - merge each section individually
        newStageData = { ...newStageData };
        for (const key of Object.keys(stageData)) {
          if (typeof stageData[key] === 'object' && stageData[key] !== null && !Array.isArray(stageData[key])) {
            // Deep merge objects
            newStageData[key] = {
              ...(newStageData[key] as Record<string, unknown> || {}),
              ...stageData[key],
            };
          } else {
            // Replace arrays and primitives
            newStageData[key] = stageData[key];
          }
        }
      } else {
        // Replace stage data
        newStageData = stageData;
      }
    }

    // Update session
    const [updatedSession] = await db
      .update(wizardSessions)
      .set({
        currentStage: newStage as typeof wizardSessions.$inferSelect['currentStage'],
        stageData: newStageData,
        updatedAt: new Date(),
      })
      .where(eq(wizardSessions.id, id))
      .returning();

    const newStageIndex = WIZARD_STAGES.indexOf(updatedSession.currentStage as WizardStage);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSession,
        currentStageIndex: newStageIndex,
        totalStages: WIZARD_STAGES.length,
        stages: WIZARD_STAGES,
        canGoBack: newStageIndex > 0,
        canGoForward: newStageIndex < WIZARD_STAGES.length - 1,
        isLastStage: newStageIndex === WIZARD_STAGES.length - 1,
      },
    });
  } catch (error) {
    console.error('Error updating wizard session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update wizard session' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a wizard session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessions = await db
      .select()
      .from(wizardSessions)
      .where(eq(wizardSessions.id, id));

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Wizard session not found' },
        { status: 404 }
      );
    }

    await db.delete(wizardSessions).where(eq(wizardSessions.id, id));

    return NextResponse.json({
      success: true,
      message: 'Wizard session deleted',
    });
  } catch (error) {
    console.error('Error deleting wizard session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete wizard session' },
      { status: 500 }
    );
  }
}
