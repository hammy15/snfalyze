/**
 * Facility Financial Profile Builder
 *
 * Builds and maintains a comprehensive financial profile for a facility
 * by accumulating data from multiple extraction passes and documents.
 */

import { nanoid } from 'nanoid';
import type {
  FacilityFinancialProfile,
  FacilityAddress,
  PayerMixBreakdown,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
} from '../types';

// ============================================================================
// FACILITY PROFILE BUILDER
// ============================================================================

export class FacilityProfileBuilder {
  private profile: FacilityFinancialProfile;

  constructor(id: string, name: string) {
    this.profile = this.createEmptyProfile(id, name);
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  getProfile(): FacilityFinancialProfile {
    return { ...this.profile };
  }

  getId(): string {
    return this.profile.id;
  }

  getName(): string {
    return this.profile.name;
  }

  // --------------------------------------------------------------------------
  // Basic Information
  // --------------------------------------------------------------------------

  setName(name: string): this {
    this.profile.name = name;
    return this;
  }

  addAlias(alias: string): this {
    if (!this.profile.aliases.includes(alias) && alias !== this.profile.name) {
      this.profile.aliases.push(alias);
    }
    return this;
  }

  setCcn(ccn: string): this {
    this.profile.ccn = ccn;
    return this;
  }

  setNpi(npi: string): this {
    this.profile.npi = npi;
    return this;
  }

  setAddress(address: FacilityAddress): this {
    this.profile.address = address;
    return this;
  }

  setLicensedBeds(beds: number): this {
    this.profile.licensedBeds = beds;
    return this;
  }

  setCertifiedBeds(beds: number): this {
    this.profile.certifiedBeds = beds;
    return this;
  }

  setFacilityType(type: 'SNF' | 'ALF' | 'ILF' | 'CCRC' | 'mixed'): this {
    this.profile.facilityType = type;
    return this;
  }

  // --------------------------------------------------------------------------
  // Financial Data
  // --------------------------------------------------------------------------

  addFinancialPeriod(period: NormalizedFinancialPeriod): this {
    // Check for duplicate period
    const existingIndex = this.profile.financialPeriods.findIndex(
      (p) =>
        p.periodStart.getTime() === period.periodStart.getTime() &&
        p.periodEnd.getTime() === period.periodEnd.getTime()
    );

    if (existingIndex >= 0) {
      // Replace if new period has higher confidence
      if (period.confidence > this.profile.financialPeriods[existingIndex].confidence) {
        this.profile.financialPeriods[existingIndex] = period;
      }
    } else {
      this.profile.financialPeriods.push(period);
    }

    // Sort by period start date
    this.profile.financialPeriods.sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
    );

    this.recalculateTTMMetrics();
    this.updateDataQuality();

    return this;
  }

  addCensusPeriod(census: NormalizedCensusPeriod): this {
    // Check for duplicate period
    const existingIndex = this.profile.censusPeriods.findIndex(
      (c) =>
        c.periodStart.getTime() === census.periodStart.getTime() &&
        c.periodEnd.getTime() === census.periodEnd.getTime()
    );

    if (existingIndex >= 0) {
      if (census.confidence > this.profile.censusPeriods[existingIndex].confidence) {
        this.profile.censusPeriods[existingIndex] = census;
      }
    } else {
      this.profile.censusPeriods.push(census);
    }

    // Sort by period start date
    this.profile.censusPeriods.sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
    );

    this.recalculateOccupancyMetrics();
    this.updateDataQuality();

    return this;
  }

  addPayerRate(rate: NormalizedPayerRate): this {
    // Check for duplicate date
    const existingIndex = this.profile.payerRates.findIndex(
      (r) => r.effectiveDate.getTime() === rate.effectiveDate.getTime()
    );

    if (existingIndex >= 0) {
      if (rate.confidence > this.profile.payerRates[existingIndex].confidence) {
        this.profile.payerRates[existingIndex] = rate;
      }
    } else {
      this.profile.payerRates.push(rate);
    }

    // Sort by effective date (most recent first)
    this.profile.payerRates.sort(
      (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
    );

    this.updateDataQuality();

    return this;
  }

  // --------------------------------------------------------------------------
  // Metric Calculations
  // --------------------------------------------------------------------------

  private recalculateTTMMetrics(): void {
    const periods = this.profile.financialPeriods;
    if (periods.length === 0) return;

    // Get last 12 months of data
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const ttmPeriods = periods.filter(
      (p) => p.periodEnd >= oneYearAgo && p.periodEnd <= now
    );

    if (ttmPeriods.length === 0) {
      // Fall back to most recent periods available
      const recentPeriods = periods.slice(-12);
      this.calculateTTMFromPeriods(recentPeriods);
    } else {
      this.calculateTTMFromPeriods(ttmPeriods);
    }
  }

  private calculateTTMFromPeriods(periods: NormalizedFinancialPeriod[]): void {
    if (periods.length === 0) return;

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalEbitdar = 0;
    let totalNoi = 0;
    let monthsCovered = 0;

    for (const period of periods) {
      totalRevenue += period.revenue.total;
      totalExpenses += period.expenses.total;
      totalEbitdar += period.metrics.ebitdar;
      totalNoi += period.metrics.noi;

      // Estimate months covered
      const daysCovered =
        (period.periodEnd.getTime() - period.periodStart.getTime()) / (1000 * 60 * 60 * 24);
      monthsCovered += daysCovered / 30;
    }

    // Annualize if less than 12 months
    const annualizationFactor = monthsCovered < 12 ? 12 / monthsCovered : 1;

    this.profile.ttmRevenue = Math.round(totalRevenue * annualizationFactor);
    this.profile.ttmExpenses = Math.round(totalExpenses * annualizationFactor);
    this.profile.ttmEbitdar = Math.round(totalEbitdar * annualizationFactor);
    this.profile.ttmNoi = Math.round(totalNoi * annualizationFactor);
  }

  private recalculateOccupancyMetrics(): void {
    const censusData = this.profile.censusPeriods;
    if (censusData.length === 0) return;

    // Calculate average occupancy
    const occupancyRates = censusData
      .filter((c) => c.occupancyRate > 0)
      .map((c) => c.occupancyRate);

    if (occupancyRates.length > 0) {
      this.profile.avgOccupancy =
        occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length;
    }

    // Calculate average payer mix
    this.profile.avgPayerMix = this.calculateAveragePayerMix(censusData);
  }

  private calculateAveragePayerMix(censusData: NormalizedCensusPeriod[]): PayerMixBreakdown {
    const totals: PayerMixBreakdown = {
      medicarePartA: 0,
      medicareAdvantage: 0,
      managedCare: 0,
      medicaid: 0,
      managedMedicaid: 0,
      private: 0,
      va: 0,
      hospice: 0,
      other: 0,
    };

    let count = 0;
    for (const census of censusData) {
      if (census.payerMixPercentages) {
        for (const key of Object.keys(totals) as (keyof PayerMixBreakdown)[]) {
          totals[key] += census.payerMixPercentages[key] || 0;
        }
        count++;
      }
    }

    if (count > 0) {
      for (const key of Object.keys(totals) as (keyof PayerMixBreakdown)[]) {
        totals[key] = Math.round((totals[key] / count) * 100) / 100;
      }
    }

    return totals;
  }

  // --------------------------------------------------------------------------
  // Data Quality Tracking
  // --------------------------------------------------------------------------

  private updateDataQuality(): void {
    this.profile.dataCompleteness = this.calculateCompleteness();
    this.profile.dataConfidence = this.calculateConfidence();
    this.profile.lastUpdated = new Date();
  }

  private calculateCompleteness(): number {
    let score = 0;
    const maxScore = 100;

    // Basic info (20 points)
    if (this.profile.name) score += 5;
    if (this.profile.ccn) score += 5;
    if (this.profile.licensedBeds) score += 5;
    if (this.profile.address?.state) score += 5;

    // Financial data (30 points)
    const financialMonths = this.profile.financialPeriods.length;
    score += Math.min(30, financialMonths * 2.5); // 2.5 points per month, max 30

    // Census data (25 points)
    const censusMonths = this.profile.censusPeriods.length;
    score += Math.min(25, censusMonths * 2); // 2 points per month, max 25

    // Rate data (15 points)
    if (this.profile.payerRates.length > 0) {
      const latestRate = this.profile.payerRates[0];
      const rateCount = Object.values(latestRate.rates).filter(
        (r) => r !== null && r > 0
      ).length;
      score += Math.min(15, rateCount * 2); // 2 points per rate, max 15
    }

    // TTM metrics (10 points)
    if (this.profile.ttmRevenue) score += 2.5;
    if (this.profile.ttmExpenses) score += 2.5;
    if (this.profile.ttmEbitdar) score += 2.5;
    if (this.profile.avgOccupancy) score += 2.5;

    return Math.round(Math.min(maxScore, score));
  }

  private calculateConfidence(): number {
    const confidences: number[] = [];

    for (const period of this.profile.financialPeriods) {
      confidences.push(period.confidence);
    }

    for (const census of this.profile.censusPeriods) {
      confidences.push(census.confidence);
    }

    for (const rate of this.profile.payerRates) {
      confidences.push(rate.confidence);
    }

    if (confidences.length === 0) return 0;

    return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
  }

  // --------------------------------------------------------------------------
  // Factory
  // --------------------------------------------------------------------------

  private createEmptyProfile(id: string, name: string): FacilityFinancialProfile {
    return {
      id,
      name,
      aliases: [],
      facilityType: 'SNF',
      financialPeriods: [],
      censusPeriods: [],
      payerRates: [],
      dataCompleteness: 0,
      dataConfidence: 0,
      lastUpdated: new Date(),
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Merge two facility profiles, preferring higher-confidence data
 */
export function mergeFacilityProfiles(
  primary: FacilityFinancialProfile,
  secondary: FacilityFinancialProfile
): FacilityFinancialProfile {
  const builder = new FacilityProfileBuilder(primary.id, primary.name);

  // Merge aliases
  for (const alias of [...primary.aliases, ...secondary.aliases, secondary.name]) {
    builder.addAlias(alias);
  }

  // Use primary CCN/NPI if available, else secondary
  if (primary.ccn || secondary.ccn) {
    builder.setCcn(primary.ccn || secondary.ccn!);
  }
  if (primary.npi || secondary.npi) {
    builder.setNpi(primary.npi || secondary.npi!);
  }

  // Use higher confidence for beds
  if (primary.licensedBeds || secondary.licensedBeds) {
    builder.setLicensedBeds(primary.licensedBeds || secondary.licensedBeds!);
  }
  if (primary.certifiedBeds || secondary.certifiedBeds) {
    builder.setCertifiedBeds(primary.certifiedBeds || secondary.certifiedBeds!);
  }

  // Merge financial periods
  const allFinancialPeriods = [...primary.financialPeriods, ...secondary.financialPeriods];
  for (const period of allFinancialPeriods) {
    builder.addFinancialPeriod(period);
  }

  // Merge census periods
  const allCensusPeriods = [...primary.censusPeriods, ...secondary.censusPeriods];
  for (const census of allCensusPeriods) {
    builder.addCensusPeriod(census);
  }

  // Merge payer rates
  const allPayerRates = [...primary.payerRates, ...secondary.payerRates];
  for (const rate of allPayerRates) {
    builder.addPayerRate(rate);
  }

  return builder.getProfile();
}

export default FacilityProfileBuilder;
