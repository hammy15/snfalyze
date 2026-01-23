import { NextRequest, NextResponse } from 'next/server';
import { validateSettings, type AlgorithmSettings } from '@/lib/admin/algorithm-settings';

// In-memory snapshot storage (replace with database in production)
interface Snapshot {
  id: string;
  name: string;
  description?: string;
  settings: AlgorithmSettings;
  createdBy: string;
  createdAt: string;
}

let snapshots: Snapshot[] = [];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: snapshots.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        version: s.settings.version,
      })),
    });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, settings, createdBy = 'system' } = body as {
      name: string;
      description?: string;
      settings: AlgorithmSettings;
      createdBy?: string;
    };

    if (!name || !settings) {
      return NextResponse.json(
        { success: false, error: 'Name and settings are required' },
        { status: 400 }
      );
    }

    // Validate settings
    const validation = validateSettings(settings);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid settings',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      settings,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    snapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (snapshots.length > 100) {
      snapshots = snapshots.slice(-100);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description,
        createdBy: snapshot.createdBy,
        createdAt: snapshot.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Snapshot ID is required' },
        { status: 400 }
      );
    }

    const index = snapshots.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    snapshots.splice(index, 1);

    return NextResponse.json({
      success: true,
      message: 'Snapshot deleted',
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete snapshot' },
      { status: 500 }
    );
  }
}
