import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_ALGORITHM_SETTINGS,
  validateSettings,
  type AlgorithmSettings,
} from '@/lib/admin/algorithm-settings';

// In-memory storage for now (replace with database in production)
let currentSettings: AlgorithmSettings = DEFAULT_ALGORITHM_SETTINGS;
let settingsHistory: { settings: AlgorithmSettings; timestamp: string; changedBy: string }[] = [];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: currentSettings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, changedBy = 'system' } = body as {
      settings: AlgorithmSettings;
      changedBy?: string;
    };

    // Validate settings
    const validation = validateSettings(settings);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Save to history
    settingsHistory.push({
      settings: currentSettings,
      timestamp: new Date().toISOString(),
      changedBy,
    });

    // Keep only last 50 versions
    if (settingsHistory.length > 50) {
      settingsHistory = settingsHistory.slice(-50);
    }

    // Update current settings
    currentSettings = {
      ...settings,
      lastUpdated: new Date().toISOString(),
      updatedBy: changedBy,
    };

    return NextResponse.json({
      success: true,
      data: currentSettings,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reset':
        // Reset to defaults
        settingsHistory.push({
          settings: currentSettings,
          timestamp: new Date().toISOString(),
          changedBy: 'system',
        });
        currentSettings = {
          ...DEFAULT_ALGORITHM_SETTINGS,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system',
        };
        return NextResponse.json({
          success: true,
          data: currentSettings,
          message: 'Settings reset to defaults',
        });

      case 'history':
        return NextResponse.json({
          success: true,
          data: settingsHistory.slice(-10).map((h, i) => ({
            version: settingsHistory.length - 10 + i + 1,
            timestamp: h.timestamp,
            changedBy: h.changedBy,
          })),
        });

      case 'rollback':
        const { version } = body;
        if (version < 1 || version > settingsHistory.length) {
          return NextResponse.json(
            { success: false, error: 'Invalid version' },
            { status: 400 }
          );
        }
        const targetSettings = settingsHistory[version - 1].settings;
        settingsHistory.push({
          settings: currentSettings,
          timestamp: new Date().toISOString(),
          changedBy: 'rollback',
        });
        currentSettings = {
          ...targetSettings,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'rollback',
        };
        return NextResponse.json({
          success: true,
          data: currentSettings,
          message: `Rolled back to version ${version}`,
        });

      case 'validate':
        const { settings: settingsToValidate } = body;
        const validationResult = validateSettings(settingsToValidate);
        return NextResponse.json({
          success: true,
          valid: validationResult.valid,
          errors: validationResult.errors,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing settings action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
