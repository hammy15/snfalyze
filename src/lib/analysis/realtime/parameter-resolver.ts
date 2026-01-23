/**
 * Parameter Resolver
 *
 * Merges global algorithm settings with deal-specific overrides
 * to produce the effective parameters for valuation calculations.
 */

import { db } from '@/db';
import { dealAlgorithmOverrides, algorithmPresets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ValuationEngineSettings } from '../valuation/valuation-engine';

// ============================================================================
// Types
// ============================================================================

export interface ParameterSource {
  source: 'global' | 'preset' | 'deal_override' | 'user_input';
  originalValue: unknown;
  overriddenValue: unknown;
  overriddenBy?: string;
  overriddenAt?: Date;
}

export interface ResolvedParameters {
  settings: ValuationEngineSettings;
  sources: Record<string, ParameterSource>;
  activeOverrides: number;
  presetName?: string;
}

export interface OverrideInput {
  parameter: string;
  value: unknown;
  reason?: string;
}

// ============================================================================
// Default Global Settings
// ============================================================================

export const GLOBAL_VALUATION_SETTINGS: ValuationEngineSettings = {
  methodWeights: {
    capRate: 0.30,
    pricePerBed: 0.20,
    dcf: 0.20,
    noiMultiple: 0.10,
    comparableSales: 0.10,
    replacementCost: 0.10,
  },
  enabledMethods: {
    capRate: true,
    pricePerBed: true,
    dcf: true,
    noiMultiple: true,
    comparableSales: true,
    replacementCost: true,
  },
  reconciliation: {
    method: 'weighted_average',
    trimOutliers: true,
    outlierThreshold: 2.0,
    confidenceWeighting: true,
  },
  capRate: {
    baseCapRate: 0.095,
    adjustments: {
      quality: { enabled: true, ratings: [{ stars: 5, adjustment: -0.01 }, { stars: 3, adjustment: 0 }, { stars: 1, adjustment: 0.02 }] },
      location: { enabled: true, urban: -0.005, suburban: 0, rural: 0.01 },
      market: { enabled: true, strongMarket: -0.005, averageMarket: 0, weakMarket: 0.01 },
    },
  },
  pricePerBed: {
    basePricePerBed: 85000,
    adjustments: {
      quality: { enabled: true, ratings: [{ stars: 5, multiplier: 1.25 }, { stars: 3, multiplier: 1.0 }, { stars: 1, multiplier: 0.75 }] },
      age: { enabled: true, brackets: [{ minAge: 0, maxAge: 10, multiplier: 1.1 }, { minAge: 30, maxAge: 999, multiplier: 0.85 }] },
      occupancy: { enabled: true, brackets: [{ minOccupancy: 90, maxOccupancy: 100, multiplier: 1.1 }, { minOccupancy: 0, maxOccupancy: 70, multiplier: 0.85 }] },
    },
  },
  dcf: {
    holdPeriod: 10,
    discountRate: 0.10,
    exitCapRate: 0.10,
    revenueGrowthRate: 0.025,
    expenseGrowthRate: 0.03,
  },
  noiMultiple: {
    baseMultiple: 10,
    adjustments: {
      quality: { enabled: true, ratings: [{ stars: 5, adjustment: 2.0 }, { stars: 3, adjustment: 0 }, { stars: 1, adjustment: -2.0 }] },
      market: { enabled: true, strongMarket: 1.0, averageMarket: 0, weakMarket: -1.0 },
    },
  },
  comparableSales: {
    maxAgeDays: 730, // 24 months
    maxDistanceMiles: 50,
    minComparables: 3,
    maxComparables: 10,
    distanceWeight: 0.25,
    recencyWeight: 0.25,
    sizeWeight: 0.25,
    qualityWeight: 0.25,
    adjustments: {
      sizePerPercent: 0.002,
      agePerYear: 0.005,
      qualityPerStar: 0.03,
      occupancyPerPercent: 0.003,
      conditionGood: 0.05,
      conditionPoor: -0.10,
    },
  },
  replacementCost: {
    constructionCostPerSF: 250,
    regionalMultipliers: { northeast: 1.15, midwest: 0.95, south: 0.90, west: 1.10 },
    usefulLife: 40,
    deprecationMethod: 'straight_line',
    residualValuePercent: 0.10,
    softCostPercent: 0.20,
    ffeCostPerBed: 15000,
    entrepreneurialIncentive: 0.10,
    defaultAcresPerBed: 0.03,
  },
};

// ============================================================================
// Parameter Resolver Class
// ============================================================================

export class ParameterResolver {
  private globalSettings: ValuationEngineSettings;

  constructor(globalSettings?: Partial<ValuationEngineSettings>) {
    this.globalSettings = { ...GLOBAL_VALUATION_SETTINGS, ...globalSettings };
  }

  /**
   * Resolve effective parameters for a deal
   */
  async resolveForDeal(dealId: string): Promise<ResolvedParameters> {
    const sources: Record<string, ParameterSource> = {};
    let settings = structuredClone(this.globalSettings);
    let presetName: string | undefined;

    // Get deal overrides
    const overrides = await db
      .select()
      .from(dealAlgorithmOverrides)
      .where(
        and(
          eq(dealAlgorithmOverrides.dealId, dealId),
          eq(dealAlgorithmOverrides.isActive, true)
        )
      );

    // Apply preset if specified
    const presetOverride = overrides.find((o) => o.key === '__preset__');
    if (presetOverride) {
      const [preset] = await db
        .select()
        .from(algorithmPresets)
        .where(eq(algorithmPresets.id, String(presetOverride.overrideValue)))
        .limit(1);

      if (preset && preset.settings) {
        const presetSettings = preset.settings as Record<string, unknown>;
        settings = this.deepMerge(
          settings as unknown as Record<string, unknown>,
          presetSettings
        ) as unknown as ValuationEngineSettings;
        presetName = preset.name;

        // Track preset source
        sources['__preset__'] = {
          source: 'preset',
          originalValue: null,
          overriddenValue: preset.name,
          overriddenBy: presetOverride.appliedBy || undefined,
          overriddenAt: presetOverride.createdAt || undefined,
        };
      }
    }

    // Apply individual overrides
    for (const override of overrides) {
      if (override.key === '__preset__') continue;

      const parameterPath = `${override.category}.${override.key}`;
      const path = parameterPath.split('.');
      const originalValue = this.getNestedValue(this.globalSettings as unknown as Record<string, unknown>, path);
      const overrideValue = override.overrideValue;

      this.setNestedValue(settings as unknown as Record<string, unknown>, path, overrideValue);

      sources[parameterPath] = {
        source: 'deal_override',
        originalValue,
        overriddenValue: overrideValue,
        overriddenBy: override.appliedBy || undefined,
        overriddenAt: override.createdAt || undefined,
      };
    }

    return {
      settings,
      sources,
      activeOverrides: overrides.filter((o) => o.key !== '__preset__').length,
      presetName,
    };
  }

  /**
   * Resolve parameters with temporary user inputs
   */
  async resolveWithInputs(
    dealId: string,
    inputs: OverrideInput[]
  ): Promise<ResolvedParameters> {
    const resolved = await this.resolveForDeal(dealId);

    for (const input of inputs) {
      const path = input.parameter.split('.');
      const originalValue = this.getNestedValue(resolved.settings as unknown as Record<string, unknown>, path);

      this.setNestedValue(resolved.settings as unknown as Record<string, unknown>, path, input.value);

      resolved.sources[input.parameter] = {
        source: 'user_input',
        originalValue,
        overriddenValue: input.value,
      };
    }

    return resolved;
  }

  /**
   * Save an override to the database
   */
  async saveOverride(
    dealId: string,
    parameter: string,
    value: unknown,
    userId?: string,
    reason?: string
  ): Promise<void> {
    // Parse parameter into category and key
    const parts = parameter.split('.');
    const category = parts[0] as 'valuation' | 'financial' | 'risk' | 'market' | 'proforma';
    const key = parts.slice(1).join('.');

    // Check if override already exists
    const existingConditions = and(
      eq(dealAlgorithmOverrides.dealId, dealId),
      eq(dealAlgorithmOverrides.category, category),
      eq(dealAlgorithmOverrides.key, key)
    );
    const [existing] = await db
      .select()
      .from(dealAlgorithmOverrides)
      .where(existingConditions)
      .limit(1);

    if (existing) {
      await db
        .update(dealAlgorithmOverrides)
        .set({
          overrideValue: value as object,
          originalValue: existing.overrideValue,
          appliedBy: userId,
          reason,
          isActive: true,
        })
        .where(eq(dealAlgorithmOverrides.id, existing.id));
    } else {
      const path = parameter.split('.');
      const originalValue = this.getNestedValue(this.globalSettings as unknown as Record<string, unknown>, path);

      await db.insert(dealAlgorithmOverrides).values({
        dealId,
        category,
        key,
        overrideValue: value as object,
        originalValue: originalValue as object,
        appliedBy: userId,
        reason,
        isActive: true,
      });
    }
  }

  /**
   * Remove an override
   */
  async removeOverride(dealId: string, parameter: string): Promise<void> {
    const parts = parameter.split('.');
    const category = parts[0] as 'valuation' | 'financial' | 'risk' | 'market' | 'proforma';
    const key = parts.slice(1).join('.');

    const conditions = and(
      eq(dealAlgorithmOverrides.dealId, dealId),
      eq(dealAlgorithmOverrides.category, category),
      eq(dealAlgorithmOverrides.key, key)
    );

    await db
      .update(dealAlgorithmOverrides)
      .set({ isActive: false })
      .where(conditions);
  }

  /**
   * Apply a preset to a deal
   */
  async applyPreset(dealId: string, presetId: string, userId?: string): Promise<void> {
    await this.saveOverride(dealId, '__preset__', presetId, userId, 'Applied preset');
  }

  /**
   * Get all available presets
   */
  async getPresets(): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      presetType: string;
      applicableAssetTypes: string[] | null;
      isPublic: boolean;
    }>
  > {
    const presets = await db
      .select({
        id: algorithmPresets.id,
        name: algorithmPresets.name,
        description: algorithmPresets.description,
        presetType: algorithmPresets.presetType,
        applicableAssetTypes: algorithmPresets.applicableAssetTypes,
        isPublic: algorithmPresets.isPublic,
      })
      .from(algorithmPresets)
      .where(eq(algorithmPresets.isActive, true));

    return presets.map((p) => ({
      ...p,
      isPublic: p.isPublic ?? false,
    }));
  }

  /**
   * Create a new preset from current settings
   */
  async createPreset(
    name: string,
    settings: Partial<ValuationEngineSettings>,
    options?: {
      description?: string;
      presetType?: string;
      applicableAssetTypes?: ('SNF' | 'ALF' | 'ILF')[];
      isPublic?: boolean;
      createdBy?: string;
    }
  ): Promise<string> {
    const [preset] = await db
      .insert(algorithmPresets)
      .values({
        name,
        description: options?.description,
        presetType: options?.presetType || 'custom',
        applicableAssetTypes: options?.applicableAssetTypes,
        settings: settings as object,
        isPublic: options?.isPublic || false,
        isActive: true,
        createdBy: options?.createdBy,
      })
      .returning({ id: algorithmPresets.id });

    return preset.id;
  }

  /**
   * Get nested value from object using path array
   */
  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    return path.reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * Set nested value in object using path array
   */
  private setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
    const lastKey = path[path.length - 1];
    const parent = path.slice(0, -1).reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        if (!(key in (current as Record<string, unknown>))) {
          (current as Record<string, unknown>)[key] = {};
        }
        return (current as Record<string, unknown>)[key];
      }
      return current;
    }, obj as unknown);

    if (parent && typeof parent === 'object') {
      (parent as Record<string, unknown>)[lastKey] = value;
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const targetValue = result[key as keyof T];
      const sourceValue = source[key as keyof T];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createParameterResolver(
  globalSettings?: Partial<ValuationEngineSettings>
): ParameterResolver {
  return new ParameterResolver(globalSettings);
}

export default ParameterResolver;
