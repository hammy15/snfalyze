import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_ALGORITHM_SETTINGS,
  validateSettings,
  type AlgorithmSettings,
} from '@/lib/admin/algorithm-settings';
import {
  AdminSettings,
  DEFAULT_ADMIN_SETTINGS,
  SettingsCategoryId,
} from '@/lib/admin/settings-schema';

// In-memory storage for now (replace with database in production)
let currentSettings: AlgorithmSettings = DEFAULT_ALGORITHM_SETTINGS;
let currentAdminSettings: AdminSettings = { ...DEFAULT_ADMIN_SETTINGS };
let settingsHistory: { settings: AlgorithmSettings; timestamp: string; changedBy: string }[] = [];

// God mode password for super admin access (from environment variable)
const GOD_MODE_PASSWORD = process.env.ADMIN_PASSWORD || '';

function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-password');
  return authHeader === GOD_MODE_PASSWORD && GOD_MODE_PASSWORD !== '';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const category = searchParams.get('category') as SettingsCategoryId | null;
  const requireAuth = searchParams.get('auth') === 'true';

  // If auth required or accessing admin settings, validate password
  if (requireAuth || type === 'admin') {
    if (!validateAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid password' },
        { status: 401 }
      );
    }
  }

  try {
    // Return admin settings (requires auth)
    if (type === 'admin') {
      if (category && category in currentAdminSettings) {
        return NextResponse.json({
          success: true,
          data: {
            category,
            settings: currentAdminSettings[category as keyof AdminSettings],
            lastUpdated: currentAdminSettings.lastUpdated,
            updatedBy: currentAdminSettings.updatedBy,
          },
        });
      }
      return NextResponse.json({
        success: true,
        data: currentAdminSettings,
      });
    }

    // Return algorithm settings (public read)
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
  // Always require auth for PUT
  if (!validateAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Invalid password' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { type, settings, category, changedBy = 'super_admin' } = body;

    // Update admin settings
    if (type === 'admin') {
      if (category && settings) {
        // Update specific category
        if (!(category in currentAdminSettings)) {
          return NextResponse.json(
            { success: false, error: `Invalid category: ${category}` },
            { status: 400 }
          );
        }
        (currentAdminSettings as any)[category] = {
          ...(currentAdminSettings as any)[category],
          ...settings,
        };
      } else if (settings) {
        // Full replacement
        currentAdminSettings = {
          ...DEFAULT_ADMIN_SETTINGS,
          ...settings,
        };
      }
      currentAdminSettings.lastUpdated = new Date().toISOString();
      currentAdminSettings.updatedBy = changedBy;

      return NextResponse.json({
        success: true,
        message: category ? `${category} settings updated` : 'Admin settings updated',
        data: category ? (currentAdminSettings as any)[category] : currentAdminSettings,
      });
    }

    // Update algorithm settings
    const algorithmSettings = settings as AlgorithmSettings;
    const validation = validateSettings(algorithmSettings);
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
      ...algorithmSettings,
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
    const { action, type } = body;

    // Actions requiring auth
    const protectedActions = ['reset', 'rollback', 'reset-admin'];
    if (protectedActions.includes(action)) {
      if (!validateAuth(request)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Invalid password' },
          { status: 401 }
        );
      }
    }

    switch (action) {
      case 'verify-password':
        const isValid = validateAuth(request);
        return NextResponse.json({
          success: true,
          valid: isValid,
        });

      case 'reset':
        // Reset algorithm settings to defaults
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
          message: 'Algorithm settings reset to defaults',
        });

      case 'reset-admin':
        const { category } = body;
        if (category && category in DEFAULT_ADMIN_SETTINGS) {
          (currentAdminSettings as any)[category] = { ...(DEFAULT_ADMIN_SETTINGS as any)[category] };
        } else {
          currentAdminSettings = { ...DEFAULT_ADMIN_SETTINGS };
        }
        currentAdminSettings.lastUpdated = new Date().toISOString();
        currentAdminSettings.updatedBy = 'admin_reset';
        return NextResponse.json({
          success: true,
          data: currentAdminSettings,
          message: category ? `${category} settings reset to defaults` : 'All admin settings reset to defaults',
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

      case 'export':
        return NextResponse.json({
          success: true,
          data: {
            algorithm: currentSettings,
            admin: currentAdminSettings,
            exportedAt: new Date().toISOString(),
          },
        });

      case 'import':
        if (!validateAuth(request)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized - Invalid password' },
            { status: 401 }
          );
        }
        const { importData } = body;
        if (importData.algorithm) {
          currentSettings = {
            ...importData.algorithm,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'import',
          };
        }
        if (importData.admin) {
          currentAdminSettings = {
            ...importData.admin,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'import',
          };
        }
        return NextResponse.json({
          success: true,
          message: 'Settings imported successfully',
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
