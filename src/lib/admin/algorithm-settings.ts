/**
 * Comprehensive Algorithm Settings for SNFalyze
 *
 * This file defines all configurable parameters used throughout the platform's
 * algorithms for valuation, risk assessment, financial analysis, and more.
 *
 * Settings can be configured globally or per asset type (SNF, ALF, ILF).
 */

// =============================================================================
// ASSET TYPE DEFINITIONS
// =============================================================================

export type AssetType = 'SNF' | 'ALF' | 'ILF';
export const ASSET_TYPES: AssetType[] = ['SNF', 'ALF', 'ILF'];

export type AssetTypeSettings<T> = {
  SNF: T;
  ALF: T;
  ILF: T;
};

// Helper to create asset-type-specific settings
export function createAssetTypeSettings<T>(snf: T, alf: T, ilf: T): AssetTypeSettings<T> {
  return { SNF: snf, ALF: alf, ILF: ilf };
}

// =============================================================================
// GEOGRAPHIC DEFINITIONS
// =============================================================================

export type Region = 'west' | 'midwest' | 'northeast' | 'southeast' | 'southwest';
export const REGIONS: Region[] = ['west', 'midwest', 'northeast', 'southeast', 'southwest'];

export type StateCode = string; // 2-letter state abbreviation

export interface GeographicSettings<T> {
  byRegion: Record<Region, T>;
  byState: Record<StateCode, T>;
}

// =============================================================================
// VALUATION SETTINGS
// =============================================================================

export interface CapRateBaseSettings {
  baseRate: number;

  // Quality adjustments (CMS stars)
  qualityAdjustments: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
    unrated: number;
  };

  // Size adjustments (based on bed count)
  sizeAdjustments: {
    under30Beds: number;
    beds30to50: number;
    beds50to75: number;
    beds75to100: number;
    beds100to125: number;
    beds125to150: number;
    beds150to200: number;
    beds200to300: number;
    over300Beds: number;
  };

  // Age adjustments (based on year built)
  ageAdjustments: {
    under3Years: number;
    years3to5: number;
    years5to10: number;
    years10to15: number;
    years15to20: number;
    years20to25: number;
    years25to30: number;
    years30to40: number;
    over40Years: number;
  };

  // Occupancy adjustments
  occupancyAdjustments: {
    above98: number;
    percent95to98: number;
    percent92to95: number;
    percent90to92: number;
    percent87to90: number;
    percent85to87: number;
    percent82to85: number;
    percent80to82: number;
    percent75to80: number;
    percent70to75: number;
    below70: number;
  };

  // Payer mix adjustments
  payerMixAdjustments: {
    highMedicare: number;      // >30% Medicare
    moderateMedicare: number;  // 20-30% Medicare
    lowMedicare: number;       // <20% Medicare
    highMedicaid: number;      // >70% Medicaid
    moderateMedicaid: number;  // 50-70% Medicaid
    lowMedicaid: number;       // <50% Medicaid
    highPrivatePay: number;    // >30% Private Pay
    moderatePrivatePay: number; // 15-30% Private Pay
    lowPrivatePay: number;     // <15% Private Pay
  };

  // Acuity adjustments
  acuityAdjustments: {
    highAcuity: number;        // CMI > 1.2
    moderateAcuity: number;    // CMI 1.0-1.2
    lowAcuity: number;         // CMI < 1.0
  };

  // Location type adjustments
  locationAdjustments: {
    urban: number;
    suburban: number;
    rural: number;
    frontier: number;
  };

  // Ownership adjustments
  ownershipAdjustments: {
    forProfit: number;
    nonprofit: number;
    government: number;
  };

  // Chain affiliation adjustments
  chainAdjustments: {
    majorChain: number;        // >50 facilities
    regionalChain: number;     // 10-50 facilities
    smallChain: number;        // 2-10 facilities
    independent: number;       // Single facility
  };

  // Market condition multipliers
  marketConditions: {
    veryHot: number;
    hot: number;
    balanced: number;
    cool: number;
    veryCool: number;
  };

  // Competition adjustments
  competitionAdjustments: {
    lowCompetition: number;    // <85% market occupancy
    moderateCompetition: number; // 85-92%
    highCompetition: number;   // 92-97%
    veryHighCompetition: number; // >97%
  };

  // Renovation status adjustments
  renovationAdjustments: {
    recentlyRenovated: number;  // <3 years
    modernized: number;         // 3-10 years
    needsUpdates: number;       // 10-20 years
    significantDeferred: number; // >20 years
  };

  // Regulatory status adjustments
  regulatoryAdjustments: {
    excellentCompliance: number;  // No deficiencies
    goodCompliance: number;       // <5 deficiencies
    moderateCompliance: number;   // 5-10 deficiencies
    poorCompliance: number;       // 10-20 deficiencies
    severeIssues: number;         // >20 deficiencies or SFF
  };
}

export interface CapRateSettings {
  // Asset-type-specific base settings
  byAssetType: AssetTypeSettings<CapRateBaseSettings>;

  // Regional adjustments (applies to all asset types)
  regionalAdjustments: Record<Region, number>;

  // State-specific overrides
  stateOverrides: Record<StateCode, Partial<CapRateBaseSettings>>;

  // Global limits
  globalMinCapRate: number;
  globalMaxCapRate: number;

  // Asset-type-specific limits
  limits: AssetTypeSettings<{ min: number; max: number }>;
}

export interface PricePerBedBaseSettings {
  basePrice: number;

  // Quality multipliers
  qualityMultipliers: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
    unrated: number;
  };

  // Size adjustments (per-bed premium/discount)
  sizeAdjustments: {
    under30Beds: number;
    beds30to50: number;
    beds50to75: number;
    beds75to100: number;
    beds100to125: number;
    beds125to150: number;
    beds150to200: number;
    beds200to300: number;
    over300Beds: number;
  };

  // Age adjustments
  ageAdjustments: {
    under3Years: number;
    years3to5: number;
    years5to10: number;
    years10to15: number;
    years15to20: number;
    years20to25: number;
    years25to30: number;
    years30to40: number;
    over40Years: number;
  };

  // Condition multipliers
  conditionMultipliers: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };

  // Construction type adjustments
  constructionAdjustments: {
    newConstruction: number;
    majorRenovation: number;
    minorRenovation: number;
    originalCondition: number;
  };

  // Building configuration adjustments
  configurationAdjustments: {
    singleStory: number;
    multiStory: number;
    campus: number;
    mixed: number;
  };

  // Room type adjustments
  roomTypeAdjustments: {
    allPrivate: number;
    mostlyPrivate: number;
    mixed: number;
    mostlySemiPrivate: number;
    allSemiPrivate: number;
  };

  // Amenity adjustments
  amenityAdjustments: {
    premium: number;
    standard: number;
    basic: number;
    minimal: number;
  };

  // Location adjustments
  locationAdjustments: {
    primeLocation: number;
    goodLocation: number;
    averageLocation: number;
    challengingLocation: number;
  };

  // Licensure adjustments
  licensureAdjustments: {
    fullyLicensed: number;
    provisionalLicense: number;
    limitedLicense: number;
  };
}

export interface PricePerBedSettings {
  byAssetType: AssetTypeSettings<PricePerBedBaseSettings>;
  regionalMultipliers: Record<Region, number>;
  stateOverrides: Record<StateCode, Partial<PricePerBedBaseSettings>>;
  globalMinPricePerBed: number;
  globalMaxPricePerBed: number;
  limits: AssetTypeSettings<{ min: number; max: number }>;
}

export interface DCFBaseSettings {
  // Discount rates
  discountRates: {
    baseWACC: number;
    riskFreeRate: number;
    equityRiskPremium: number;
    sizeRiskPremium: number;
    industryRiskPremium: number;
    companySpecificRisk: number;
  };

  // Risk premium tiers
  riskPremiumTiers: {
    veryLowRisk: number;
    lowRisk: number;
    moderateRisk: number;
    highRisk: number;
    veryHighRisk: number;
  };

  // Terminal value assumptions
  terminalValue: {
    exitCapRate: number;
    perpetualGrowthRate: number;
    useExitCapRate: boolean;
  };

  // Revenue growth assumptions by payer
  revenueGrowth: {
    medicarePartA: number;
    medicarePartB: number;
    medicareAdvantage: number;
    medicaid: number;
    privatePay: number;
    managedCare: number;
    vaContract: number;
    hospice: number;
    other: number;
  };

  // Expense growth assumptions
  expenseGrowth: {
    nursingLabor: number;
    otherLabor: number;
    agencyLabor: number;
    benefits: number;
    foodAndDietary: number;
    medicalSupplies: number;
    generalSupplies: number;
    utilities: number;
    insurance: number;
    propertyTax: number;
    managementFee: number;
    marketing: number;
    maintenance: number;
    professionalFees: number;
    technology: number;
    other: number;
  };

  // Occupancy ramp assumptions
  occupancyRamp: {
    stabilizedOccupancy: number;
    rampUpMonthsNewAcquisition: number;
    rampUpMonthsTurnaround: number;
    rampUpMonthsStabilized: number;
    seasonalityFactor: number;
  };

  // CapEx assumptions
  capexAssumptions: {
    routinePerBedAnnual: number;
    majorCapexCycleYears: number;
    majorCapexPerBed: number;
    lifeExtensionPerBed: number;
    technologyPerBedAnnual: number;
    furnitureReplacementYears: number;
    furniturePerBed: number;
  };

  // Working capital assumptions
  workingCapital: {
    daysReceivablesMedicare: number;
    daysReceivablesMedicaid: number;
    daysReceivablesPrivate: number;
    daysReceivablesManagedCare: number;
    daysPayables: number;
    minimumCashDays: number;
    workingCapitalPercent: number;
  };
}

export interface DCFSettings {
  projectionYears: number;
  maxProjectionYears: number;
  monthlyGranularity: boolean;
  byAssetType: AssetTypeSettings<DCFBaseSettings>;
}

export interface NOIMultipleBaseSettings {
  baseMultiple: number;

  // Quality adjustments
  qualityAdjustments: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
    unrated: number;
  };

  // Growth profile adjustments
  growthAdjustments: {
    rapidGrowth: number;      // >7% NOI growth
    strongGrowth: number;     // 5-7% NOI growth
    moderateGrowth: number;   // 3-5% NOI growth
    slowGrowth: number;       // 1-3% NOI growth
    stable: number;           // 0-1% NOI growth
    declining: number;        // <0% NOI growth
  };

  // Stability adjustments
  stabilityAdjustments: {
    veryStable: number;       // <5% NOI variance
    stable: number;           // 5-10% variance
    moderate: number;         // 10-15% variance
    volatile: number;         // 15-25% variance
    veryVolatile: number;     // >25% variance
  };

  // Market position adjustments
  marketPositionAdjustments: {
    marketLeader: number;
    strongPosition: number;
    averagePosition: number;
    weakPosition: number;
    struggling: number;
  };
}

export interface NOIMultipleSettings {
  byAssetType: AssetTypeSettings<NOIMultipleBaseSettings>;
  minMultiple: number;
  maxMultiple: number;
  limits: AssetTypeSettings<{ min: number; max: number }>;
}

export interface ComparableSalesSettings {
  // Weighting factors for comparable selection
  weightingFactors: {
    geographicProximity: number;
    bedCountMatch: number;
    assetTypeMatch: number;
    qualityRatingMatch: number;
    saleRecency: number;
    payerMixMatch: number;
    occupancyMatch: number;
    ageMatch: number;
    conditionMatch: number;
    ownershipTypeMatch: number;
  };

  // Maximum adjustments allowed
  maxAdjustments: {
    location: number;
    size: number;
    age: number;
    condition: number;
    quality: number;
    occupancy: number;
    payerMix: number;
    marketTiming: number;
    amenities: number;
    total: number;
  };

  // Selection criteria
  selectionCriteria: {
    maxMilesRadius: number;
    maxMonthsOld: number;
    minComparables: number;
    maxComparables: number;
    idealComparables: number;
    bedCountVariancePercent: number;
    requireSameState: boolean;
    requireSameAssetType: boolean;
    allowAdjacentStates: boolean;
  };

  // Confidence thresholds
  confidenceThresholds: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };

  // Adjustment per factor
  adjustmentRates: {
    perMileDistance: number;
    perYearAge: number;
    perPercentOccupancy: number;
    perStarRating: number;
    perPercentPayerMix: number;
    perBedDifference: number;
  };
}

export interface ReplacementCostSettings {
  byAssetType: AssetTypeSettings<{
    costPerSquareFoot: number;
    costPerBed: number;
    landCostPerAcre: number;
    siteworkCostPerBed: number;
    softCostsPercent: number;
    developerFeePercent: number;
    contingencyPercent: number;
    depreciationRateAnnual: number;
    functionalObsolescence: number;
    economicObsolescence: number;
  }>;
  regionalMultipliers: Record<Region, number>;
}

export interface ValuationMethodWeights {
  capRate: number;
  pricePerBed: number;
  dcf: number;
  noiMultiple: number;
  comparableSales: number;
  replacementCost: number;
}

export interface ValuationSettings {
  capRate: CapRateSettings;
  pricePerBed: PricePerBedSettings;
  dcf: DCFSettings;
  noiMultiple: NOIMultipleSettings;
  comparableSales: ComparableSalesSettings;
  replacementCost: ReplacementCostSettings;

  // Method weighting (by asset type)
  methodWeights: AssetTypeSettings<ValuationMethodWeights>;

  // Confidence adjustments
  confidenceWeights: {
    highConfidenceMultiplier: number;
    mediumConfidenceMultiplier: number;
    lowConfidenceMultiplier: number;
  };

  // Reconciliation settings
  reconciliation: {
    useWeightedAverage: boolean;
    excludeOutliers: boolean;
    outlierThresholdPercent: number;
    preferredMethodByScenario: {
      acquisition: string;
      refinance: string;
      disposition: string;
    };
  };
}

// =============================================================================
// FINANCIAL ANALYSIS SETTINGS
// =============================================================================

export interface RevenueSettingsBase {
  // Daily rates by payer
  dailyRates: {
    medicarePartA: { low: number; mid: number; high: number };
    medicarePartB: { low: number; mid: number; high: number };
    medicareAdvantage: { low: number; mid: number; high: number };
    medicaid: { low: number; mid: number; high: number };
    medicaidQualityAddOn: { low: number; mid: number; high: number };
    privatePay: { low: number; mid: number; high: number };
    managedCare: { low: number; mid: number; high: number };
    vaContract: { low: number; mid: number; high: number };
    hospice: { low: number; mid: number; high: number };
    respite: { low: number; mid: number; high: number };
  };

  // Payer mix benchmarks
  payerMixBenchmarks: {
    medicare: { poor: number; fair: number; good: number; excellent: number };
    medicaid: { poor: number; fair: number; good: number; excellent: number };
    privatePay: { poor: number; fair: number; good: number; excellent: number };
    managedCare: { poor: number; fair: number; good: number; excellent: number };
    other: { poor: number; fair: number; good: number; excellent: number };
  };

  // Revenue per patient day benchmarks
  revenuePerPatientDay: {
    poor: number;
    belowAverage: number;
    average: number;
    aboveAverage: number;
    excellent: number;
  };

  // Ancillary revenue
  ancillaryRevenue: {
    therapyPerPatientDay: number;
    pharmacyPerPatientDay: number;
    otherAncillaryPerPatientDay: number;
    ancillaryAsPercentOfRevenue: number;
  };

  // Rate increase assumptions
  annualRateIncreases: {
    medicare: number;
    medicaid: number;
    privatePay: number;
    managedCare: number;
    other: number;
  };

  // Bad debt and adjustments
  badDebtAndAdjustments: {
    badDebtPercent: number;
    contractualAdjustmentPercent: number;
    charityCarePrecent: number;
  };
}

export interface ExpenseSettingsBase {
  // Expense ratios as percent of revenue
  expenseRatios: {
    nursingLabor: { min: number; target: number; max: number };
    otherLabor: { min: number; target: number; max: number };
    agencyLabor: { min: number; target: number; max: number };
    employeeBenefits: { min: number; target: number; max: number };
    dietary: { min: number; target: number; max: number };
    housekeeping: { min: number; target: number; max: number };
    laundry: { min: number; target: number; max: number };
    activities: { min: number; target: number; max: number };
    socialServices: { min: number; target: number; max: number };
    medicalSupplies: { min: number; target: number; max: number };
    generalSupplies: { min: number; target: number; max: number };
    utilities: { min: number; target: number; max: number };
    telephone: { min: number; target: number; max: number };
    insurance: { min: number; target: number; max: number };
    propertyTax: { min: number; target: number; max: number };
    managementFee: { min: number; target: number; max: number };
    marketing: { min: number; target: number; max: number };
    maintenance: { min: number; target: number; max: number };
    administration: { min: number; target: number; max: number };
    professionalFees: { min: number; target: number; max: number };
    technology: { min: number; target: number; max: number };
    other: { min: number; target: number; max: number };
  };

  // Per-bed expense benchmarks
  perBedExpenses: {
    poor: number;
    belowAverage: number;
    average: number;
    aboveAverage: number;
    excellent: number;
  };

  // Cost per patient day benchmarks
  costPerPatientDay: {
    poor: number;
    belowAverage: number;
    average: number;
    aboveAverage: number;
    excellent: number;
  };
}

export interface StaffingSettingsBase {
  // HPPD requirements
  hppdRequirements: {
    rnMinimum: number;
    rnTarget: number;
    rnExcellent: number;
    lpnMinimum: number;
    lpnTarget: number;
    lpnExcellent: number;
    cnaMinimum: number;
    cnaTarget: number;
    cnaExcellent: number;
    totalMinimum: number;
    totalTarget: number;
    totalExcellent: number;
  };

  // Staff mix ratios
  staffMix: {
    rnPercent: number;
    lpnPercent: number;
    cnaPercent: number;
  };

  // Hourly rates
  hourlyRates: {
    rn: { min: number; average: number; max: number };
    lpn: { min: number; average: number; max: number };
    cna: { min: number; average: number; max: number };
    therapy: { min: number; average: number; max: number };
    dietary: { min: number; average: number; max: number };
    housekeeping: { min: number; average: number; max: number };
    maintenance: { min: number; average: number; max: number };
    activities: { min: number; average: number; max: number };
    administration: { min: number; average: number; max: number };
  };

  // Cost multipliers
  costMultipliers: {
    benefitsLoadFactor: number;
    payrollTaxRate: number;
    workersCompRate: number;
    agencyPremium: number;
    overtimePremium: number;
    weekendDifferential: number;
    nightDifferential: number;
    holidayPremium: number;
  };

  // Staffing patterns
  staffingPatterns: {
    weekendStaffingRatio: number;
    nightStaffingRatio: number;
    holidayStaffingRatio: number;
    callOffRate: number;
    overtimeTarget: number;
    overtimeMax: number;
  };

  // Turnover and recruitment
  turnoverAndRecruitment: {
    annualTurnoverRate: number;
    recruitmentCostPerHire: number;
    trainingCostPerHire: number;
    vacancyFactor: number;
    orientationWeeks: number;
  };

  // Agency thresholds
  agencyThresholds: {
    excellent: number;
    acceptable: number;
    elevated: number;
    concerning: number;
    critical: number;
  };
}

export interface MarginBenchmarksBase {
  operatingMargin: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  ebitdarMargin: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  ebitdaMargin: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  netMargin: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  cashFlowMargin: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
}

export interface FinancialSettings {
  revenue: AssetTypeSettings<RevenueSettingsBase>;
  expenses: AssetTypeSettings<ExpenseSettingsBase>;
  staffing: AssetTypeSettings<StaffingSettingsBase>;
  margins: AssetTypeSettings<MarginBenchmarksBase>;

  // Normalization rules
  normalizationRules: {
    managementFeeTarget: number;
    rentAsPercentOfRevenue: number;
    propertyTaxRate: number;
    insurancePerBed: number;
    capexReservePerBed: number;
    normalizedOccupancy: number;
    removeOneTimeItems: boolean;
    removeOwnerPerks: boolean;
    removeRelatedPartyAdjustments: boolean;
  };

  // Inflation assumptions
  inflationRates: {
    laborGeneral: number;
    laborNursing: number;
    supplies: number;
    utilities: number;
    insurance: number;
    propertyTax: number;
    food: number;
    technology: number;
    general: number;
  };
}

// =============================================================================
// RISK ASSESSMENT SETTINGS
// =============================================================================

export interface CMSScoringSettings {
  // Overall rating component weights
  overallRatingWeights: {
    healthInspection: number;
    staffing: number;
    qualityMeasures: number;
  };

  // Health inspection scoring
  healthInspectionScoring: {
    totalDeficienciesWeight: number;
    severityScoreWeight: number;
    scopeScoreWeight: number;
    complaintDeficienciesWeight: number;
    infectionControlWeight: number;
    immediateJeopardyWeight: number;
    actualHarmWeight: number;
    potentialHarmWeight: number;

    // Thresholds for each metric
    deficiencyThresholds: number[];
    severityThresholds: number[];
  };

  // Staffing scoring
  staffingScoring: {
    totalHppdWeight: number;
    rnHppdWeight: number;
    turnoverWeight: number;
    weekendStaffingWeight: number;
    staffingConsistencyWeight: number;

    // Thresholds
    hppdThresholds: number[];
    rnHppdThresholds: number[];
    turnoverThresholds: number[];
  };

  // Quality measures scoring
  qualityMeasuresScoring: {
    shortStayWeight: number;
    longStayWeight: number;
    fallsWithInjuryWeight: number;
    pressureUlcersWeight: number;
    hospitalReadmissionsWeight: number;
    emergencyVisitsWeight: number;
    antipsychoticUseWeight: number;
    catheterUseWeight: number;
    physicalRestraintsWeight: number;
    utisWeight: number;
    depressionWeight: number;
    painManagementWeight: number;

    // Thresholds
    qualityThresholds: Record<string, number[]>;
  };

  // Special focus facility handling
  sffHandling: {
    sffPenalty: number;
    sffCandidatePenalty: number;
    recentSffHistoryPenalty: number;
    abuseIconPenalty: number;
  };
}

export interface RiskScoringSettings {
  // Risk category weights
  categoryWeights: {
    regulatory: number;
    operational: number;
    financial: number;
    market: number;
    reputational: number;
    legal: number;
    environmental: number;
    technology: number;
  };

  // Regulatory risk factors
  regulatoryRisk: {
    deficiencyCountWeight: number;
    deficiencyCountThresholds: number[];
    sffStatusWeight: number;
    cmpHistoryWeight: number;
    cmpThresholds: number[];
    denialOfPaymentWeight: number;
    licensureIssuesWeight: number;
    surveyFrequencyWeight: number;
    complaintSurveyWeight: number;
    focusedSurveyWeight: number;
    planOfCorrectionWeight: number;
  };

  // Operational risk factors
  operationalRisk: {
    occupancyWeight: number;
    occupancyThresholds: number[];
    staffingLevelsWeight: number;
    staffingThresholds: number[];
    agencyUsageWeight: number;
    agencyThresholds: number[];
    turnoverRateWeight: number;
    turnoverThresholds: number[];
    acuityMismatchWeight: number;
    managementStabilityWeight: number;
    systemsIntegrationWeight: number;
  };

  // Financial risk factors
  financialRisk: {
    debtServiceCoverageWeight: number;
    dscThresholds: number[];
    workingCapitalWeight: number;
    workingCapitalThresholds: number[];
    revenueConcentrationWeight: number;
    concentrationThresholds: number[];
    marginTrendWeight: number;
    marginThresholds: number[];
    arAgingWeight: number;
    arAgingThresholds: number[];
    cashFlowVolatilityWeight: number;
    leverageWeight: number;
  };

  // Market risk factors
  marketRisk: {
    competitionDensityWeight: number;
    densityThresholds: number[];
    populationGrowthWeight: number;
    populationThresholds: number[];
    reimbursementTrendWeight: number;
    reimbursementThresholds: number[];
    supplyPipelineWeight: number;
    supplyThresholds: number[];
    economicConditionsWeight: number;
    referralSourceConcentrationWeight: number;
  };

  // Risk score thresholds
  riskScoreThresholds: {
    veryLow: number;
    low: number;
    moderate: number;
    elevated: number;
    high: number;
    veryHigh: number;
    critical: number;
  };
}

export interface DealBreakerSettings {
  byAssetType: AssetTypeSettings<{
    minCMSRating: number;
    maxDeficiencies: number;
    maxSeverityScore: number;
    sffExclusion: boolean;
    sffCandidateExclusion: boolean;
    minOccupancy: number;
    maxAgencyUsage: number;
    minMargin: number;
    minDSCR: number;
    maxLeverage: number;
    maxBuildingAge: number;
    minBeds: number;
    maxBeds: number;
    excludeStates: string[];
    requiredLicenses: string[];
    excludeOwnershipTypes: string[];
    maxDebtPerBed: number;
    minRevenuePerBed: number;
  }>;

  // Global deal breakers
  global: {
    maxTotalInvestment: number;
    minTotalInvestment: number;
    maxSingleFacilityExposure: number;
    maxStateConcentration: number;
    maxOperatorConcentration: number;
  };
}

export interface RiskSettings {
  cmsScoring: CMSScoringSettings;
  riskScoring: RiskScoringSettings;
  dealBreakers: DealBreakerSettings;
}

// =============================================================================
// MARKET DATA SETTINGS
// =============================================================================

export interface MarketDataSettings {
  // Cap rate ranges by region and asset type
  marketCapRates: Record<Region, AssetTypeSettings<{ min: number; mid: number; max: number }>>;

  // Price per bed by region
  marketPricePerBed: Record<Region, AssetTypeSettings<{ min: number; mid: number; max: number }>>;

  // State-level Medicaid rates
  medicaidRates: Record<StateCode, {
    baseRate: number;
    qualityAddOn: number;
    acuityAddOn: number;
    effectiveDate: string;
    projectedIncrease: number;
    paymentTiming: number;
  }>;

  // Market growth rates
  marketGrowth: Record<Region, {
    populationGrowth65Plus: number;
    populationGrowth85Plus: number;
    supplyGrowthRate: number;
    demandGrowthRate: number;
    absorptionRate: number;
    marketOccupancy: number;
  }>;

  // Competition analysis settings
  competitionSettings: {
    primaryMarketRadius: number;
    secondaryMarketRadius: number;
    tertiaryMarketRadius: number;
    densityThresholds: {
      veryLow: number;
      low: number;
      moderate: number;
      high: number;
      veryHigh: number;
    };
    qualityCompetitionWeight: number;
  };

  // Data refresh settings
  dataRefreshSettings: {
    cmsDataMaxAgeDays: number;
    marketDataMaxAgeDays: number;
    comparablesMaxAgeMonths: number;
    medicaidRatesRefreshDays: number;
    competitorDataMaxAgeDays: number;
    economicDataMaxAgeDays: number;
  };

  // Economic indicators
  economicIndicators: {
    unemploymentRateWeight: number;
    medianIncomeWeight: number;
    povertyRateWeight: number;
    medicaidExpansionBonus: number;
    unionPenetrationImpact: number;
  };
}

// =============================================================================
// PROFORMA SETTINGS
// =============================================================================

export interface ProformaSettings {
  // Scenario defaults by type
  scenarioDefaults: {
    baseline: {
      occupancyGrowth: number;
      revenueGrowth: number;
      expenseGrowth: number;
      capexPercent: number;
    };
    upside: {
      occupancyGrowth: number;
      revenueGrowth: number;
      expenseGrowth: number;
      capexPercent: number;
    };
    downside: {
      occupancyGrowth: number;
      revenueGrowth: number;
      expenseGrowth: number;
      capexPercent: number;
    };
    turnaround: {
      occupancyGrowth: number;
      revenueGrowth: number;
      expenseGrowth: number;
      capexPercent: number;
      stabilizationMonths: number;
    };
  };

  // Projection settings
  projectionSettings: {
    defaultYears: number;
    maxYears: number;
    monthlyGranularityYears: number;
    includeConstructionPeriod: boolean;
    constructionMonths: number;
  };

  // Ramp-up assumptions by scenario
  rampUpAssumptions: {
    newAcquisition: {
      months: number;
      startOccupancy: number;
      targetOccupancy: number;
      revenueRampMonths: number;
      expenseRampMonths: number;
    };
    turnaround: {
      months: number;
      startOccupancy: number;
      targetOccupancy: number;
      staffingRampMonths: number;
      qualityImprovementMonths: number;
    };
    development: {
      leaseUpMonths: number;
      startOccupancy: number;
      stabilizedOccupancy: number;
      marketingMonths: number;
    };
  };

  // Capital improvements by type
  capitalImprovements: {
    deferred: { perBed: number; timelineYears: number };
    renovation: { perBed: number; timelineYears: number };
    majorRenovation: { perBed: number; timelineYears: number };
    expansion: { perBed: number; timelineYears: number };
    repositioning: { perBed: number; timelineYears: number };
    technology: { perBed: number; timelineYears: number };
  };

  // Financing assumptions
  financingAssumptions: {
    seniorDebtLTV: number;
    seniorDebtRate: number;
    seniorDebtTerm: number;
    seniorDebtAmortization: number;
    mezzDebtLTV: number;
    mezzDebtRate: number;
    mezzDebtTerm: number;
    preferredEquityReturn: number;
    closingCostsPercent: number;
    loanOriginationFee: number;
  };

  // Exit assumptions
  exitAssumptions: {
    defaultHoldPeriod: number;
    exitCapRateSpread: number;
    sellingCostsPercent: number;
    prepaymentPenaltyYears: number;
    prepaymentPenaltyPercent: number;
  };
}

// =============================================================================
// DISPLAY SETTINGS
// =============================================================================

export interface DisplaySettings {
  // Number formatting
  numberFormat: {
    currency: string;
    locale: string;
    decimals: {
      currency: number;
      percentage: number;
      ratio: number;
      capRate: number;
      multiple: number;
    };
    abbreviateMillions: boolean;
    abbreviateThousands: boolean;
  };

  // Chart colors
  chartColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    positive: string;
    negative: string;
    neutral: string;
    warning: string;
    assetTypes: AssetTypeSettings<string>;
    ratings: {
      fiveStar: string;
      fourStar: string;
      threeStar: string;
      twoStar: string;
      oneStar: string;
    };
  };

  // Dashboard settings
  dashboardSettings: {
    defaultView: string;
    itemsPerPage: number;
    defaultSort: string;
    showConfidenceScores: boolean;
    showRiskIndicators: boolean;
    compactMode: boolean;
  };

  // Export settings
  exportSettings: {
    defaultFormat: string;
    includeLogo: boolean;
    includeDisclaimer: boolean;
    disclaimerText: string;
  };
}

// =============================================================================
// MASTER SETTINGS TYPE
// =============================================================================

export interface AlgorithmSettings {
  version: string;
  lastUpdated: string;
  updatedBy: string;

  valuation: ValuationSettings;
  financial: FinancialSettings;
  risk: RiskSettings;
  market: MarketDataSettings;
  proforma: ProformaSettings;
  display: DisplaySettings;

  // Active asset type toggle
  activeAssetTypes: {
    SNF: boolean;
    ALF: boolean;
    ILF: boolean;
  };

  // Custom overrides by deal
  customOverrides: Record<string, Partial<AlgorithmSettings>>;
}

// =============================================================================
// DEFAULT CAP RATE SETTINGS BY ASSET TYPE
// =============================================================================

const DEFAULT_CAP_RATE_BASE_SNF: CapRateBaseSettings = {
  baseRate: 0.10,
  qualityAdjustments: {
    fiveStar: -0.015,
    fourStar: -0.0075,
    threeStar: 0,
    twoStar: 0.01,
    oneStar: 0.025,
    unrated: 0.015,
  },
  sizeAdjustments: {
    under30Beds: 0.025,
    beds30to50: 0.015,
    beds50to75: 0.01,
    beds75to100: 0.005,
    beds100to125: 0,
    beds125to150: -0.005,
    beds150to200: -0.0075,
    beds200to300: -0.01,
    over300Beds: -0.0125,
  },
  ageAdjustments: {
    under3Years: -0.015,
    years3to5: -0.01,
    years5to10: -0.005,
    years10to15: 0,
    years15to20: 0.005,
    years20to25: 0.01,
    years25to30: 0.015,
    years30to40: 0.02,
    over40Years: 0.025,
  },
  occupancyAdjustments: {
    above98: -0.015,
    percent95to98: -0.01,
    percent92to95: -0.005,
    percent90to92: 0,
    percent87to90: 0.005,
    percent85to87: 0.01,
    percent82to85: 0.015,
    percent80to82: 0.02,
    percent75to80: 0.025,
    percent70to75: 0.035,
    below70: 0.05,
  },
  payerMixAdjustments: {
    highMedicare: -0.01,
    moderateMedicare: 0,
    lowMedicare: 0.005,
    highMedicaid: 0.015,
    moderateMedicaid: 0.005,
    lowMedicaid: 0,
    highPrivatePay: -0.015,
    moderatePrivatePay: -0.005,
    lowPrivatePay: 0,
  },
  acuityAdjustments: {
    highAcuity: -0.005,
    moderateAcuity: 0,
    lowAcuity: 0.005,
  },
  locationAdjustments: {
    urban: -0.005,
    suburban: 0,
    rural: 0.01,
    frontier: 0.02,
  },
  ownershipAdjustments: {
    forProfit: 0,
    nonprofit: 0.005,
    government: 0.01,
  },
  chainAdjustments: {
    majorChain: -0.005,
    regionalChain: 0,
    smallChain: 0.005,
    independent: 0.01,
  },
  marketConditions: {
    veryHot: -0.015,
    hot: -0.0075,
    balanced: 0,
    cool: 0.0075,
    veryCool: 0.015,
  },
  competitionAdjustments: {
    lowCompetition: -0.01,
    moderateCompetition: 0,
    highCompetition: 0.005,
    veryHighCompetition: 0.01,
  },
  renovationAdjustments: {
    recentlyRenovated: -0.01,
    modernized: -0.005,
    needsUpdates: 0.005,
    significantDeferred: 0.015,
  },
  regulatoryAdjustments: {
    excellentCompliance: -0.01,
    goodCompliance: -0.005,
    moderateCompliance: 0,
    poorCompliance: 0.01,
    severeIssues: 0.025,
  },
};

const DEFAULT_CAP_RATE_BASE_ALF: CapRateBaseSettings = {
  ...DEFAULT_CAP_RATE_BASE_SNF,
  baseRate: 0.075,
  qualityAdjustments: {
    fiveStar: -0.01,
    fourStar: -0.005,
    threeStar: 0,
    twoStar: 0.0075,
    oneStar: 0.015,
    unrated: 0.01,
  },
  sizeAdjustments: {
    under30Beds: 0.02,
    beds30to50: 0.015,
    beds50to75: 0.01,
    beds75to100: 0.005,
    beds100to125: 0,
    beds125to150: -0.005,
    beds150to200: -0.0075,
    beds200to300: -0.01,
    over300Beds: -0.0125,
  },
};

const DEFAULT_CAP_RATE_BASE_ILF: CapRateBaseSettings = {
  ...DEFAULT_CAP_RATE_BASE_SNF,
  baseRate: 0.065,
  qualityAdjustments: {
    fiveStar: -0.0075,
    fourStar: -0.00375,
    threeStar: 0,
    twoStar: 0.005,
    oneStar: 0.01,
    unrated: 0.0075,
  },
  sizeAdjustments: {
    under30Beds: 0.015,
    beds30to50: 0.01,
    beds50to75: 0.0075,
    beds75to100: 0.005,
    beds100to125: 0,
    beds125to150: -0.0025,
    beds150to200: -0.005,
    beds200to300: -0.0075,
    over300Beds: -0.01,
  },
};

// =============================================================================
// DEFAULT VALUES (Abbreviated - key sections shown)
// =============================================================================

export const DEFAULT_ALGORITHM_SETTINGS: AlgorithmSettings = {
  version: '2.0.0',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',

  activeAssetTypes: {
    SNF: true,
    ALF: true,
    ILF: true,
  },

  valuation: {
    capRate: {
      byAssetType: {
        SNF: DEFAULT_CAP_RATE_BASE_SNF,
        ALF: DEFAULT_CAP_RATE_BASE_ALF,
        ILF: DEFAULT_CAP_RATE_BASE_ILF,
      },
      regionalAdjustments: {
        west: -0.005,
        midwest: 0.01,
        northeast: -0.01,
        southeast: 0.005,
        southwest: 0,
      },
      stateOverrides: {},
      globalMinCapRate: 0.04,
      globalMaxCapRate: 0.20,
      limits: {
        SNF: { min: 0.06, max: 0.16 },
        ALF: { min: 0.05, max: 0.12 },
        ILF: { min: 0.04, max: 0.10 },
      },
    },
    pricePerBed: {
      byAssetType: {
        SNF: {
          basePrice: 85000,
          qualityMultipliers: { fiveStar: 1.25, fourStar: 1.12, threeStar: 1.0, twoStar: 0.85, oneStar: 0.70, unrated: 0.90 },
          sizeAdjustments: { under30Beds: -8000, beds30to50: -5000, beds50to75: -2500, beds75to100: 0, beds100to125: 2500, beds125to150: 5000, beds150to200: 7500, beds200to300: 10000, over300Beds: 12500 },
          ageAdjustments: { under3Years: 15000, years3to5: 10000, years5to10: 5000, years10to15: 0, years15to20: -5000, years20to25: -10000, years25to30: -15000, years30to40: -20000, over40Years: -25000 },
          conditionMultipliers: { excellent: 1.20, good: 1.05, fair: 0.90, poor: 0.70, critical: 0.50 },
          constructionAdjustments: { newConstruction: 1.25, majorRenovation: 1.10, minorRenovation: 1.0, originalCondition: 0.85 },
          configurationAdjustments: { singleStory: 1.05, multiStory: 1.0, campus: 1.10, mixed: 1.0 },
          roomTypeAdjustments: { allPrivate: 1.20, mostlyPrivate: 1.10, mixed: 1.0, mostlySemiPrivate: 0.90, allSemiPrivate: 0.80 },
          amenityAdjustments: { premium: 1.15, standard: 1.0, basic: 0.90, minimal: 0.80 },
          locationAdjustments: { primeLocation: 1.15, goodLocation: 1.05, averageLocation: 1.0, challengingLocation: 0.85 },
          licensureAdjustments: { fullyLicensed: 1.0, provisionalLicense: 0.90, limitedLicense: 0.80 },
        },
        ALF: {
          basePrice: 120000,
          qualityMultipliers: { fiveStar: 1.20, fourStar: 1.10, threeStar: 1.0, twoStar: 0.88, oneStar: 0.75, unrated: 0.92 },
          sizeAdjustments: { under30Beds: -10000, beds30to50: -6000, beds50to75: -3000, beds75to100: 0, beds100to125: 3000, beds125to150: 6000, beds150to200: 9000, beds200to300: 12000, over300Beds: 15000 },
          ageAdjustments: { under3Years: 20000, years3to5: 14000, years5to10: 8000, years10to15: 0, years15to20: -6000, years20to25: -12000, years25to30: -18000, years30to40: -24000, over40Years: -30000 },
          conditionMultipliers: { excellent: 1.25, good: 1.08, fair: 0.88, poor: 0.68, critical: 0.48 },
          constructionAdjustments: { newConstruction: 1.30, majorRenovation: 1.12, minorRenovation: 1.0, originalCondition: 0.82 },
          configurationAdjustments: { singleStory: 1.08, multiStory: 1.0, campus: 1.15, mixed: 1.02 },
          roomTypeAdjustments: { allPrivate: 1.25, mostlyPrivate: 1.12, mixed: 1.0, mostlySemiPrivate: 0.88, allSemiPrivate: 0.75 },
          amenityAdjustments: { premium: 1.20, standard: 1.0, basic: 0.88, minimal: 0.75 },
          locationAdjustments: { primeLocation: 1.20, goodLocation: 1.08, averageLocation: 1.0, challengingLocation: 0.82 },
          licensureAdjustments: { fullyLicensed: 1.0, provisionalLicense: 0.88, limitedLicense: 0.78 },
        },
        ILF: {
          basePrice: 150000,
          qualityMultipliers: { fiveStar: 1.18, fourStar: 1.08, threeStar: 1.0, twoStar: 0.90, oneStar: 0.78, unrated: 0.94 },
          sizeAdjustments: { under30Beds: -12000, beds30to50: -8000, beds50to75: -4000, beds75to100: 0, beds100to125: 4000, beds125to150: 8000, beds150to200: 12000, beds200to300: 16000, over300Beds: 20000 },
          ageAdjustments: { under3Years: 25000, years3to5: 18000, years5to10: 10000, years10to15: 0, years15to20: -8000, years20to25: -16000, years25to30: -24000, years30to40: -32000, over40Years: -40000 },
          conditionMultipliers: { excellent: 1.28, good: 1.10, fair: 0.85, poor: 0.65, critical: 0.45 },
          constructionAdjustments: { newConstruction: 1.35, majorRenovation: 1.15, minorRenovation: 1.0, originalCondition: 0.80 },
          configurationAdjustments: { singleStory: 1.10, multiStory: 1.0, campus: 1.18, mixed: 1.05 },
          roomTypeAdjustments: { allPrivate: 1.30, mostlyPrivate: 1.15, mixed: 1.0, mostlySemiPrivate: 0.85, allSemiPrivate: 0.70 },
          amenityAdjustments: { premium: 1.25, standard: 1.0, basic: 0.85, minimal: 0.70 },
          locationAdjustments: { primeLocation: 1.25, goodLocation: 1.10, averageLocation: 1.0, challengingLocation: 0.80 },
          licensureAdjustments: { fullyLicensed: 1.0, provisionalLicense: 0.85, limitedLicense: 0.75 },
        },
      },
      regionalMultipliers: {
        west: 1.25,
        midwest: 0.85,
        northeast: 1.15,
        southeast: 0.95,
        southwest: 1.05,
      },
      stateOverrides: {},
      globalMinPricePerBed: 20000,
      globalMaxPricePerBed: 400000,
      limits: {
        SNF: { min: 30000, max: 200000 },
        ALF: { min: 50000, max: 300000 },
        ILF: { min: 75000, max: 400000 },
      },
    },
    dcf: {
      projectionYears: 10,
      maxProjectionYears: 15,
      monthlyGranularity: true,
      byAssetType: {
        SNF: {
          discountRates: { baseWACC: 0.09, riskFreeRate: 0.04, equityRiskPremium: 0.05, sizeRiskPremium: 0.02, industryRiskPremium: 0.015, companySpecificRisk: 0.01 },
          riskPremiumTiers: { veryLowRisk: 0.005, lowRisk: 0.01, moderateRisk: 0.02, highRisk: 0.035, veryHighRisk: 0.05 },
          terminalValue: { exitCapRate: 0.105, perpetualGrowthRate: 0.02, useExitCapRate: true },
          revenueGrowth: { medicarePartA: 0.025, medicarePartB: 0.02, medicareAdvantage: 0.03, medicaid: 0.02, privatePay: 0.035, managedCare: 0.025, vaContract: 0.025, hospice: 0.02, other: 0.02 },
          expenseGrowth: { nursingLabor: 0.04, otherLabor: 0.035, agencyLabor: 0.03, benefits: 0.045, foodAndDietary: 0.025, medicalSupplies: 0.03, generalSupplies: 0.025, utilities: 0.03, insurance: 0.05, propertyTax: 0.02, managementFee: 0.025, marketing: 0.02, maintenance: 0.025, professionalFees: 0.03, technology: 0.02, other: 0.025 },
          occupancyRamp: { stabilizedOccupancy: 0.90, rampUpMonthsNewAcquisition: 12, rampUpMonthsTurnaround: 24, rampUpMonthsStabilized: 0, seasonalityFactor: 0.02 },
          capexAssumptions: { routinePerBedAnnual: 1500, majorCapexCycleYears: 15, majorCapexPerBed: 25000, lifeExtensionPerBed: 5000, technologyPerBedAnnual: 300, furnitureReplacementYears: 7, furniturePerBed: 3000 },
          workingCapital: { daysReceivablesMedicare: 30, daysReceivablesMedicaid: 60, daysReceivablesPrivate: 45, daysReceivablesManagedCare: 35, daysPayables: 30, minimumCashDays: 30, workingCapitalPercent: 0.05 },
        },
        ALF: {
          discountRates: { baseWACC: 0.085, riskFreeRate: 0.04, equityRiskPremium: 0.045, sizeRiskPremium: 0.015, industryRiskPremium: 0.01, companySpecificRisk: 0.01 },
          riskPremiumTiers: { veryLowRisk: 0.005, lowRisk: 0.01, moderateRisk: 0.018, highRisk: 0.03, veryHighRisk: 0.045 },
          terminalValue: { exitCapRate: 0.08, perpetualGrowthRate: 0.022, useExitCapRate: true },
          revenueGrowth: { medicarePartA: 0, medicarePartB: 0, medicareAdvantage: 0, medicaid: 0.02, privatePay: 0.04, managedCare: 0.03, vaContract: 0.025, hospice: 0.02, other: 0.025 },
          expenseGrowth: { nursingLabor: 0.038, otherLabor: 0.032, agencyLabor: 0.025, benefits: 0.04, foodAndDietary: 0.025, medicalSupplies: 0.025, generalSupplies: 0.022, utilities: 0.028, insurance: 0.045, propertyTax: 0.02, managementFee: 0.025, marketing: 0.025, maintenance: 0.025, professionalFees: 0.028, technology: 0.02, other: 0.022 },
          occupancyRamp: { stabilizedOccupancy: 0.92, rampUpMonthsNewAcquisition: 15, rampUpMonthsTurnaround: 18, rampUpMonthsStabilized: 0, seasonalityFactor: 0.015 },
          capexAssumptions: { routinePerBedAnnual: 1200, majorCapexCycleYears: 12, majorCapexPerBed: 20000, lifeExtensionPerBed: 4000, technologyPerBedAnnual: 250, furnitureReplacementYears: 6, furniturePerBed: 3500 },
          workingCapital: { daysReceivablesMedicare: 0, daysReceivablesMedicaid: 45, daysReceivablesPrivate: 30, daysReceivablesManagedCare: 30, daysPayables: 25, minimumCashDays: 25, workingCapitalPercent: 0.04 },
        },
        ILF: {
          discountRates: { baseWACC: 0.08, riskFreeRate: 0.04, equityRiskPremium: 0.04, sizeRiskPremium: 0.01, industryRiskPremium: 0.008, companySpecificRisk: 0.008 },
          riskPremiumTiers: { veryLowRisk: 0.004, lowRisk: 0.008, moderateRisk: 0.015, highRisk: 0.025, veryHighRisk: 0.04 },
          terminalValue: { exitCapRate: 0.07, perpetualGrowthRate: 0.025, useExitCapRate: true },
          revenueGrowth: { medicarePartA: 0, medicarePartB: 0, medicareAdvantage: 0, medicaid: 0, privatePay: 0.045, managedCare: 0, vaContract: 0, hospice: 0, other: 0.03 },
          expenseGrowth: { nursingLabor: 0.035, otherLabor: 0.03, agencyLabor: 0.02, benefits: 0.038, foodAndDietary: 0.025, medicalSupplies: 0.02, generalSupplies: 0.02, utilities: 0.025, insurance: 0.04, propertyTax: 0.02, managementFee: 0.025, marketing: 0.03, maintenance: 0.025, professionalFees: 0.025, technology: 0.02, other: 0.02 },
          occupancyRamp: { stabilizedOccupancy: 0.95, rampUpMonthsNewAcquisition: 18, rampUpMonthsTurnaround: 12, rampUpMonthsStabilized: 0, seasonalityFactor: 0.01 },
          capexAssumptions: { routinePerBedAnnual: 1000, majorCapexCycleYears: 10, majorCapexPerBed: 18000, lifeExtensionPerBed: 3500, technologyPerBedAnnual: 200, furnitureReplacementYears: 5, furniturePerBed: 4000 },
          workingCapital: { daysReceivablesMedicare: 0, daysReceivablesMedicaid: 0, daysReceivablesPrivate: 20, daysReceivablesManagedCare: 0, daysPayables: 20, minimumCashDays: 20, workingCapitalPercent: 0.03 },
        },
      },
    },
    noiMultiple: {
      byAssetType: {
        SNF: {
          baseMultiple: 8,
          qualityAdjustments: { fiveStar: 1.5, fourStar: 0.75, threeStar: 0, twoStar: -0.75, oneStar: -1.5, unrated: -0.5 },
          growthAdjustments: { rapidGrowth: 2.0, strongGrowth: 1.25, moderateGrowth: 0.5, slowGrowth: 0, stable: -0.25, declining: -1.5 },
          stabilityAdjustments: { veryStable: 1.0, stable: 0.5, moderate: 0, volatile: -0.75, veryVolatile: -1.5 },
          marketPositionAdjustments: { marketLeader: 1.0, strongPosition: 0.5, averagePosition: 0, weakPosition: -0.75, struggling: -1.5 },
        },
        ALF: {
          baseMultiple: 10,
          qualityAdjustments: { fiveStar: 1.25, fourStar: 0.6, threeStar: 0, twoStar: -0.6, oneStar: -1.25, unrated: -0.4 },
          growthAdjustments: { rapidGrowth: 2.5, strongGrowth: 1.5, moderateGrowth: 0.75, slowGrowth: 0.25, stable: 0, declining: -1.25 },
          stabilityAdjustments: { veryStable: 1.25, stable: 0.6, moderate: 0, volatile: -0.6, veryVolatile: -1.25 },
          marketPositionAdjustments: { marketLeader: 1.25, strongPosition: 0.6, averagePosition: 0, weakPosition: -0.6, struggling: -1.25 },
        },
        ILF: {
          baseMultiple: 12,
          qualityAdjustments: { fiveStar: 1.0, fourStar: 0.5, threeStar: 0, twoStar: -0.5, oneStar: -1.0, unrated: -0.3 },
          growthAdjustments: { rapidGrowth: 3.0, strongGrowth: 2.0, moderateGrowth: 1.0, slowGrowth: 0.5, stable: 0, declining: -1.0 },
          stabilityAdjustments: { veryStable: 1.5, stable: 0.75, moderate: 0, volatile: -0.5, veryVolatile: -1.0 },
          marketPositionAdjustments: { marketLeader: 1.5, strongPosition: 0.75, averagePosition: 0, weakPosition: -0.5, struggling: -1.0 },
        },
      },
      minMultiple: 4,
      maxMultiple: 18,
      limits: {
        SNF: { min: 5, max: 12 },
        ALF: { min: 6, max: 15 },
        ILF: { min: 8, max: 18 },
      },
    },
    comparableSales: {
      weightingFactors: {
        geographicProximity: 0.15,
        bedCountMatch: 0.12,
        assetTypeMatch: 0.15,
        qualityRatingMatch: 0.12,
        saleRecency: 0.12,
        payerMixMatch: 0.08,
        occupancyMatch: 0.08,
        ageMatch: 0.08,
        conditionMatch: 0.05,
        ownershipTypeMatch: 0.05,
      },
      maxAdjustments: {
        location: 0.15,
        size: 0.12,
        age: 0.12,
        condition: 0.10,
        quality: 0.15,
        occupancy: 0.10,
        payerMix: 0.08,
        marketTiming: 0.10,
        amenities: 0.05,
        total: 0.40,
      },
      selectionCriteria: {
        maxMilesRadius: 100,
        maxMonthsOld: 24,
        minComparables: 3,
        maxComparables: 10,
        idealComparables: 6,
        bedCountVariancePercent: 0.30,
        requireSameState: false,
        requireSameAssetType: true,
        allowAdjacentStates: true,
      },
      confidenceThresholds: {
        highConfidence: 0.80,
        mediumConfidence: 0.60,
        lowConfidence: 0.40,
      },
      adjustmentRates: {
        perMileDistance: 0.001,
        perYearAge: 0.005,
        perPercentOccupancy: 0.01,
        perStarRating: 0.03,
        perPercentPayerMix: 0.005,
        perBedDifference: 0.0005,
      },
    },
    replacementCost: {
      byAssetType: {
        SNF: { costPerSquareFoot: 350, costPerBed: 175000, landCostPerAcre: 150000, siteworkCostPerBed: 8000, softCostsPercent: 0.15, developerFeePercent: 0.05, contingencyPercent: 0.08, depreciationRateAnnual: 0.025, functionalObsolescence: 0.05, economicObsolescence: 0.03 },
        ALF: { costPerSquareFoot: 300, costPerBed: 200000, landCostPerAcre: 175000, siteworkCostPerBed: 10000, softCostsPercent: 0.15, developerFeePercent: 0.05, contingencyPercent: 0.07, depreciationRateAnnual: 0.022, functionalObsolescence: 0.04, economicObsolescence: 0.025 },
        ILF: { costPerSquareFoot: 275, costPerBed: 225000, landCostPerAcre: 200000, siteworkCostPerBed: 12000, softCostsPercent: 0.14, developerFeePercent: 0.05, contingencyPercent: 0.06, depreciationRateAnnual: 0.02, functionalObsolescence: 0.03, economicObsolescence: 0.02 },
      },
      regionalMultipliers: {
        west: 1.30,
        midwest: 0.85,
        northeast: 1.25,
        southeast: 0.90,
        southwest: 1.05,
      },
    },
    methodWeights: {
      SNF: { capRate: 0.30, pricePerBed: 0.20, dcf: 0.25, noiMultiple: 0.15, comparableSales: 0.08, replacementCost: 0.02 },
      ALF: { capRate: 0.25, pricePerBed: 0.22, dcf: 0.25, noiMultiple: 0.12, comparableSales: 0.12, replacementCost: 0.04 },
      ILF: { capRate: 0.22, pricePerBed: 0.25, dcf: 0.23, noiMultiple: 0.10, comparableSales: 0.15, replacementCost: 0.05 },
    },
    confidenceWeights: {
      highConfidenceMultiplier: 1.2,
      mediumConfidenceMultiplier: 1.0,
      lowConfidenceMultiplier: 0.8,
    },
    reconciliation: {
      useWeightedAverage: true,
      excludeOutliers: true,
      outlierThresholdPercent: 0.25,
      preferredMethodByScenario: {
        acquisition: 'dcf',
        refinance: 'capRate',
        disposition: 'comparableSales',
      },
    },
  },

  // Financial settings (abbreviated for space - follows same pattern)
  financial: {
    revenue: {
      SNF: {
        dailyRates: {
          medicarePartA: { low: 475, mid: 550, high: 650 },
          medicarePartB: { low: 125, mid: 175, high: 225 },
          medicareAdvantage: { low: 400, mid: 475, high: 550 },
          medicaid: { low: 185, mid: 225, high: 275 },
          medicaidQualityAddOn: { low: 10, mid: 25, high: 45 },
          privatePay: { low: 275, mid: 325, high: 400 },
          managedCare: { low: 350, mid: 400, high: 475 },
          vaContract: { low: 400, mid: 450, high: 525 },
          hospice: { low: 175, mid: 200, high: 250 },
          respite: { low: 250, mid: 300, high: 375 },
        },
        payerMixBenchmarks: {
          medicare: { poor: 0.10, fair: 0.15, good: 0.22, excellent: 0.30 },
          medicaid: { poor: 0.75, fair: 0.65, good: 0.55, excellent: 0.45 },
          privatePay: { poor: 0.05, fair: 0.10, good: 0.15, excellent: 0.20 },
          managedCare: { poor: 0.02, fair: 0.05, good: 0.08, excellent: 0.12 },
          other: { poor: 0.02, fair: 0.03, good: 0.04, excellent: 0.05 },
        },
        revenuePerPatientDay: { poor: 250, belowAverage: 285, average: 325, aboveAverage: 375, excellent: 450 },
        ancillaryRevenue: { therapyPerPatientDay: 50, pharmacyPerPatientDay: 25, otherAncillaryPerPatientDay: 15, ancillaryAsPercentOfRevenue: 0.12 },
        annualRateIncreases: { medicare: 0.025, medicaid: 0.02, privatePay: 0.035, managedCare: 0.025, other: 0.025 },
        badDebtAndAdjustments: { badDebtPercent: 0.015, contractualAdjustmentPercent: 0.05, charityCarePrecent: 0.005 },
      },
      ALF: {
        dailyRates: {
          medicarePartA: { low: 0, mid: 0, high: 0 },
          medicarePartB: { low: 0, mid: 0, high: 0 },
          medicareAdvantage: { low: 0, mid: 0, high: 0 },
          medicaid: { low: 125, mid: 165, high: 210 },
          medicaidQualityAddOn: { low: 0, mid: 15, high: 30 },
          privatePay: { low: 175, mid: 225, high: 325 },
          managedCare: { low: 150, mid: 195, high: 250 },
          vaContract: { low: 175, mid: 210, high: 260 },
          hospice: { low: 150, mid: 175, high: 210 },
          respite: { low: 200, mid: 250, high: 325 },
        },
        payerMixBenchmarks: {
          medicare: { poor: 0, fair: 0, good: 0, excellent: 0 },
          medicaid: { poor: 0.35, fair: 0.25, good: 0.15, excellent: 0.08 },
          privatePay: { poor: 0.55, fair: 0.70, good: 0.80, excellent: 0.88 },
          managedCare: { poor: 0.02, fair: 0.03, good: 0.04, excellent: 0.05 },
          other: { poor: 0.02, fair: 0.02, good: 0.02, excellent: 0.02 },
        },
        revenuePerPatientDay: { poor: 160, belowAverage: 190, average: 225, aboveAverage: 275, excellent: 350 },
        ancillaryRevenue: { therapyPerPatientDay: 20, pharmacyPerPatientDay: 10, otherAncillaryPerPatientDay: 10, ancillaryAsPercentOfRevenue: 0.08 },
        annualRateIncreases: { medicare: 0, medicaid: 0.02, privatePay: 0.04, managedCare: 0.025, other: 0.025 },
        badDebtAndAdjustments: { badDebtPercent: 0.01, contractualAdjustmentPercent: 0.02, charityCarePrecent: 0.003 },
      },
      ILF: {
        dailyRates: {
          medicarePartA: { low: 0, mid: 0, high: 0 },
          medicarePartB: { low: 0, mid: 0, high: 0 },
          medicareAdvantage: { low: 0, mid: 0, high: 0 },
          medicaid: { low: 0, mid: 0, high: 0 },
          medicaidQualityAddOn: { low: 0, mid: 0, high: 0 },
          privatePay: { low: 125, mid: 175, high: 275 },
          managedCare: { low: 0, mid: 0, high: 0 },
          vaContract: { low: 0, mid: 0, high: 0 },
          hospice: { low: 0, mid: 0, high: 0 },
          respite: { low: 150, mid: 200, high: 275 },
        },
        payerMixBenchmarks: {
          medicare: { poor: 0, fair: 0, good: 0, excellent: 0 },
          medicaid: { poor: 0, fair: 0, good: 0, excellent: 0 },
          privatePay: { poor: 0.92, fair: 0.95, good: 0.97, excellent: 0.99 },
          managedCare: { poor: 0, fair: 0, good: 0, excellent: 0 },
          other: { poor: 0.05, fair: 0.04, good: 0.03, excellent: 0.01 },
        },
        revenuePerPatientDay: { poor: 100, belowAverage: 130, average: 175, aboveAverage: 225, excellent: 300 },
        ancillaryRevenue: { therapyPerPatientDay: 5, pharmacyPerPatientDay: 3, otherAncillaryPerPatientDay: 8, ancillaryAsPercentOfRevenue: 0.05 },
        annualRateIncreases: { medicare: 0, medicaid: 0, privatePay: 0.045, managedCare: 0, other: 0.03 },
        badDebtAndAdjustments: { badDebtPercent: 0.008, contractualAdjustmentPercent: 0.01, charityCarePrecent: 0.002 },
      },
    },
    expenses: {
      SNF: {
        expenseRatios: {
          nursingLabor: { min: 0.35, target: 0.40, max: 0.48 },
          otherLabor: { min: 0.08, target: 0.10, max: 0.13 },
          agencyLabor: { min: 0, target: 0.02, max: 0.08 },
          employeeBenefits: { min: 0.08, target: 0.10, max: 0.13 },
          dietary: { min: 0.05, target: 0.07, max: 0.09 },
          housekeeping: { min: 0.02, target: 0.03, max: 0.04 },
          laundry: { min: 0.01, target: 0.015, max: 0.02 },
          activities: { min: 0.01, target: 0.02, max: 0.025 },
          socialServices: { min: 0.01, target: 0.015, max: 0.02 },
          medicalSupplies: { min: 0.03, target: 0.04, max: 0.06 },
          generalSupplies: { min: 0.02, target: 0.03, max: 0.04 },
          utilities: { min: 0.02, target: 0.035, max: 0.05 },
          telephone: { min: 0.003, target: 0.005, max: 0.008 },
          insurance: { min: 0.015, target: 0.025, max: 0.04 },
          propertyTax: { min: 0.008, target: 0.015, max: 0.025 },
          managementFee: { min: 0.04, target: 0.05, max: 0.06 },
          marketing: { min: 0.005, target: 0.01, max: 0.02 },
          maintenance: { min: 0.02, target: 0.03, max: 0.04 },
          administration: { min: 0.04, target: 0.06, max: 0.08 },
          professionalFees: { min: 0.01, target: 0.015, max: 0.025 },
          technology: { min: 0.005, target: 0.01, max: 0.015 },
          other: { min: 0.02, target: 0.04, max: 0.06 },
        },
        perBedExpenses: { poor: 105000, belowAverage: 98000, average: 92000, aboveAverage: 85000, excellent: 78000 },
        costPerPatientDay: { poor: 310, belowAverage: 285, average: 260, aboveAverage: 235, excellent: 210 },
      },
      ALF: {
        expenseRatios: {
          nursingLabor: { min: 0.20, target: 0.25, max: 0.32 },
          otherLabor: { min: 0.10, target: 0.13, max: 0.16 },
          agencyLabor: { min: 0, target: 0.01, max: 0.04 },
          employeeBenefits: { min: 0.06, target: 0.08, max: 0.10 },
          dietary: { min: 0.06, target: 0.08, max: 0.10 },
          housekeeping: { min: 0.03, target: 0.04, max: 0.05 },
          laundry: { min: 0.01, target: 0.02, max: 0.025 },
          activities: { min: 0.02, target: 0.03, max: 0.04 },
          socialServices: { min: 0.005, target: 0.01, max: 0.015 },
          medicalSupplies: { min: 0.01, target: 0.015, max: 0.025 },
          generalSupplies: { min: 0.015, target: 0.025, max: 0.035 },
          utilities: { min: 0.025, target: 0.04, max: 0.055 },
          telephone: { min: 0.003, target: 0.005, max: 0.008 },
          insurance: { min: 0.012, target: 0.02, max: 0.03 },
          propertyTax: { min: 0.01, target: 0.018, max: 0.028 },
          managementFee: { min: 0.04, target: 0.05, max: 0.06 },
          marketing: { min: 0.015, target: 0.025, max: 0.04 },
          maintenance: { min: 0.025, target: 0.035, max: 0.05 },
          administration: { min: 0.05, target: 0.07, max: 0.09 },
          professionalFees: { min: 0.008, target: 0.012, max: 0.018 },
          technology: { min: 0.005, target: 0.01, max: 0.015 },
          other: { min: 0.02, target: 0.035, max: 0.05 },
        },
        perBedExpenses: { poor: 75000, belowAverage: 68000, average: 62000, aboveAverage: 55000, excellent: 48000 },
        costPerPatientDay: { poor: 210, belowAverage: 185, average: 165, aboveAverage: 145, excellent: 125 },
      },
      ILF: {
        expenseRatios: {
          nursingLabor: { min: 0.08, target: 0.12, max: 0.18 },
          otherLabor: { min: 0.12, target: 0.16, max: 0.20 },
          agencyLabor: { min: 0, target: 0.005, max: 0.02 },
          employeeBenefits: { min: 0.05, target: 0.07, max: 0.09 },
          dietary: { min: 0.08, target: 0.10, max: 0.13 },
          housekeeping: { min: 0.04, target: 0.05, max: 0.065 },
          laundry: { min: 0.008, target: 0.012, max: 0.018 },
          activities: { min: 0.03, target: 0.04, max: 0.055 },
          socialServices: { min: 0.003, target: 0.005, max: 0.008 },
          medicalSupplies: { min: 0.003, target: 0.006, max: 0.01 },
          generalSupplies: { min: 0.015, target: 0.025, max: 0.035 },
          utilities: { min: 0.03, target: 0.045, max: 0.06 },
          telephone: { min: 0.003, target: 0.005, max: 0.008 },
          insurance: { min: 0.01, target: 0.015, max: 0.022 },
          propertyTax: { min: 0.012, target: 0.02, max: 0.03 },
          managementFee: { min: 0.04, target: 0.05, max: 0.06 },
          marketing: { min: 0.025, target: 0.04, max: 0.06 },
          maintenance: { min: 0.03, target: 0.045, max: 0.06 },
          administration: { min: 0.06, target: 0.08, max: 0.10 },
          professionalFees: { min: 0.006, target: 0.01, max: 0.015 },
          technology: { min: 0.005, target: 0.01, max: 0.015 },
          other: { min: 0.02, target: 0.03, max: 0.045 },
        },
        perBedExpenses: { poor: 55000, belowAverage: 48000, average: 42000, aboveAverage: 36000, excellent: 30000 },
        costPerPatientDay: { poor: 150, belowAverage: 130, average: 115, aboveAverage: 100, excellent: 85 },
      },
    },
    staffing: {
      SNF: {
        hppdRequirements: { rnMinimum: 0.55, rnTarget: 0.75, rnExcellent: 1.0, lpnMinimum: 0.75, lpnTarget: 1.0, lpnExcellent: 1.25, cnaMinimum: 2.0, cnaTarget: 2.5, cnaExcellent: 3.0, totalMinimum: 3.48, totalTarget: 4.10, totalExcellent: 4.5 },
        staffMix: { rnPercent: 0.15, lpnPercent: 0.25, cnaPercent: 0.60 },
        hourlyRates: { rn: { min: 35, average: 42, max: 55 }, lpn: { min: 25, average: 30, max: 38 }, cna: { min: 16, average: 19, max: 24 }, therapy: { min: 45, average: 55, max: 70 }, dietary: { min: 14, average: 17, max: 22 }, housekeeping: { min: 13, average: 16, max: 20 }, maintenance: { min: 18, average: 23, max: 30 }, activities: { min: 16, average: 20, max: 26 }, administration: { min: 25, average: 35, max: 50 } },
        costMultipliers: { benefitsLoadFactor: 1.30, payrollTaxRate: 0.0765, workersCompRate: 0.04, agencyPremium: 1.50, overtimePremium: 1.50, weekendDifferential: 1.10, nightDifferential: 1.08, holidayPremium: 1.50 },
        staffingPatterns: { weekendStaffingRatio: 0.85, nightStaffingRatio: 0.75, holidayStaffingRatio: 0.80, callOffRate: 0.05, overtimeTarget: 0.03, overtimeMax: 0.08 },
        turnoverAndRecruitment: { annualTurnoverRate: 0.55, recruitmentCostPerHire: 3500, trainingCostPerHire: 2000, vacancyFactor: 0.05, orientationWeeks: 2 },
        agencyThresholds: { excellent: 0.02, acceptable: 0.05, elevated: 0.10, concerning: 0.18, critical: 0.25 },
      },
      ALF: {
        hppdRequirements: { rnMinimum: 0.10, rnTarget: 0.20, rnExcellent: 0.35, lpnMinimum: 0.25, lpnTarget: 0.40, lpnExcellent: 0.55, cnaMinimum: 1.0, cnaTarget: 1.4, cnaExcellent: 1.8, totalMinimum: 1.50, totalTarget: 2.0, totalExcellent: 2.5 },
        staffMix: { rnPercent: 0.10, lpnPercent: 0.20, cnaPercent: 0.70 },
        hourlyRates: { rn: { min: 33, average: 40, max: 52 }, lpn: { min: 24, average: 29, max: 36 }, cna: { min: 15, average: 18, max: 23 }, therapy: { min: 42, average: 52, max: 65 }, dietary: { min: 14, average: 17, max: 22 }, housekeeping: { min: 13, average: 16, max: 20 }, maintenance: { min: 17, average: 22, max: 28 }, activities: { min: 15, average: 19, max: 25 }, administration: { min: 24, average: 33, max: 48 } },
        costMultipliers: { benefitsLoadFactor: 1.28, payrollTaxRate: 0.0765, workersCompRate: 0.03, agencyPremium: 1.45, overtimePremium: 1.50, weekendDifferential: 1.08, nightDifferential: 1.06, holidayPremium: 1.50 },
        staffingPatterns: { weekendStaffingRatio: 0.88, nightStaffingRatio: 0.70, holidayStaffingRatio: 0.82, callOffRate: 0.04, overtimeTarget: 0.025, overtimeMax: 0.06 },
        turnoverAndRecruitment: { annualTurnoverRate: 0.45, recruitmentCostPerHire: 3000, trainingCostPerHire: 1500, vacancyFactor: 0.04, orientationWeeks: 2 },
        agencyThresholds: { excellent: 0.01, acceptable: 0.03, elevated: 0.07, concerning: 0.12, critical: 0.18 },
      },
      ILF: {
        hppdRequirements: { rnMinimum: 0, rnTarget: 0.05, rnExcellent: 0.10, lpnMinimum: 0.05, lpnTarget: 0.12, lpnExcellent: 0.20, cnaMinimum: 0.35, cnaTarget: 0.55, cnaExcellent: 0.75, totalMinimum: 0.50, totalTarget: 0.75, totalExcellent: 1.0 },
        staffMix: { rnPercent: 0.05, lpnPercent: 0.15, cnaPercent: 0.80 },
        hourlyRates: { rn: { min: 32, average: 38, max: 50 }, lpn: { min: 23, average: 28, max: 35 }, cna: { min: 14, average: 17, max: 22 }, therapy: { min: 40, average: 50, max: 62 }, dietary: { min: 14, average: 17, max: 22 }, housekeeping: { min: 13, average: 16, max: 20 }, maintenance: { min: 17, average: 22, max: 28 }, activities: { min: 15, average: 19, max: 25 }, administration: { min: 23, average: 32, max: 46 } },
        costMultipliers: { benefitsLoadFactor: 1.25, payrollTaxRate: 0.0765, workersCompRate: 0.02, agencyPremium: 1.40, overtimePremium: 1.50, weekendDifferential: 1.05, nightDifferential: 1.05, holidayPremium: 1.50 },
        staffingPatterns: { weekendStaffingRatio: 0.90, nightStaffingRatio: 0.60, holidayStaffingRatio: 0.85, callOffRate: 0.03, overtimeTarget: 0.02, overtimeMax: 0.05 },
        turnoverAndRecruitment: { annualTurnoverRate: 0.35, recruitmentCostPerHire: 2500, trainingCostPerHire: 1200, vacancyFactor: 0.03, orientationWeeks: 1.5 },
        agencyThresholds: { excellent: 0.005, acceptable: 0.02, elevated: 0.05, concerning: 0.08, critical: 0.12 },
      },
    },
    margins: {
      SNF: {
        operatingMargin: { excellent: 0.12, good: 0.08, fair: 0.05, poor: 0.02, critical: -0.02 },
        ebitdarMargin: { excellent: 0.22, good: 0.16, fair: 0.12, poor: 0.08, critical: 0.04 },
        ebitdaMargin: { excellent: 0.18, good: 0.12, fair: 0.08, poor: 0.05, critical: 0.01 },
        netMargin: { excellent: 0.08, good: 0.05, fair: 0.03, poor: 0.01, critical: -0.02 },
        cashFlowMargin: { excellent: 0.15, good: 0.10, fair: 0.06, poor: 0.03, critical: -0.01 },
      },
      ALF: {
        operatingMargin: { excellent: 0.22, good: 0.15, fair: 0.10, poor: 0.05, critical: 0 },
        ebitdarMargin: { excellent: 0.35, good: 0.28, fair: 0.22, poor: 0.15, critical: 0.08 },
        ebitdaMargin: { excellent: 0.30, good: 0.22, fair: 0.16, poor: 0.10, critical: 0.04 },
        netMargin: { excellent: 0.15, good: 0.10, fair: 0.06, poor: 0.03, critical: 0 },
        cashFlowMargin: { excellent: 0.25, good: 0.18, fair: 0.12, poor: 0.06, critical: 0.01 },
      },
      ILF: {
        operatingMargin: { excellent: 0.35, good: 0.25, fair: 0.18, poor: 0.10, critical: 0.03 },
        ebitdarMargin: { excellent: 0.45, good: 0.35, fair: 0.28, poor: 0.20, critical: 0.12 },
        ebitdaMargin: { excellent: 0.40, good: 0.30, fair: 0.22, poor: 0.15, critical: 0.08 },
        netMargin: { excellent: 0.22, good: 0.15, fair: 0.10, poor: 0.05, critical: 0.01 },
        cashFlowMargin: { excellent: 0.35, good: 0.25, fair: 0.18, poor: 0.10, critical: 0.04 },
      },
    },
    normalizationRules: {
      managementFeeTarget: 0.05,
      rentAsPercentOfRevenue: 0.10,
      propertyTaxRate: 0.012,
      insurancePerBed: 2500,
      capexReservePerBed: 1500,
      normalizedOccupancy: 0.90,
      removeOneTimeItems: true,
      removeOwnerPerks: true,
      removeRelatedPartyAdjustments: true,
    },
    inflationRates: {
      laborGeneral: 0.035,
      laborNursing: 0.04,
      supplies: 0.025,
      utilities: 0.03,
      insurance: 0.05,
      propertyTax: 0.02,
      food: 0.025,
      technology: 0.015,
      general: 0.025,
    },
  },

  // Risk settings
  risk: {
    cmsScoring: {
      overallRatingWeights: { healthInspection: 0.50, staffing: 0.30, qualityMeasures: 0.20 },
      healthInspectionScoring: {
        totalDeficienciesWeight: 0.25,
        severityScoreWeight: 0.20,
        scopeScoreWeight: 0.15,
        complaintDeficienciesWeight: 0.12,
        infectionControlWeight: 0.10,
        immediateJeopardyWeight: 0.08,
        actualHarmWeight: 0.06,
        potentialHarmWeight: 0.04,
        deficiencyThresholds: [3, 6, 10, 15, 22],
        severityThresholds: [2, 5, 8, 12, 18],
      },
      staffingScoring: {
        totalHppdWeight: 0.35,
        rnHppdWeight: 0.30,
        turnoverWeight: 0.20,
        weekendStaffingWeight: 0.15,
        staffingConsistencyWeight: 0,
        hppdThresholds: [3.2, 3.5, 3.8, 4.1, 4.5],
        rnHppdThresholds: [0.45, 0.55, 0.65, 0.80, 1.0],
        turnoverThresholds: [0.65, 0.50, 0.38, 0.28, 0.20],
      },
      qualityMeasuresScoring: {
        shortStayWeight: 0.35,
        longStayWeight: 0.35,
        fallsWithInjuryWeight: 0.05,
        pressureUlcersWeight: 0.05,
        hospitalReadmissionsWeight: 0.05,
        emergencyVisitsWeight: 0.04,
        antipsychoticUseWeight: 0.04,
        catheterUseWeight: 0.025,
        physicalRestraintsWeight: 0.025,
        utisWeight: 0.02,
        depressionWeight: 0.015,
        painManagementWeight: 0.015,
        qualityThresholds: {},
      },
      sffHandling: {
        sffPenalty: 50,
        sffCandidatePenalty: 25,
        recentSffHistoryPenalty: 15,
        abuseIconPenalty: 35,
      },
    },
    riskScoring: {
      categoryWeights: { regulatory: 0.25, operational: 0.25, financial: 0.20, market: 0.15, reputational: 0.08, legal: 0.04, environmental: 0.02, technology: 0.01 },
      regulatoryRisk: {
        deficiencyCountWeight: 0.30,
        deficiencyCountThresholds: [5, 10, 15, 22, 30],
        sffStatusWeight: 0.25,
        cmpHistoryWeight: 0.18,
        cmpThresholds: [0, 25000, 75000, 150000, 300000],
        denialOfPaymentWeight: 0.12,
        licensureIssuesWeight: 0.08,
        surveyFrequencyWeight: 0.04,
        complaintSurveyWeight: 0.03,
        focusedSurveyWeight: 0,
        planOfCorrectionWeight: 0,
      },
      operationalRisk: {
        occupancyWeight: 0.25,
        occupancyThresholds: [0.92, 0.88, 0.82, 0.75, 0.68],
        staffingLevelsWeight: 0.25,
        staffingThresholds: [4.2, 3.8, 3.5, 3.2, 2.8],
        agencyUsageWeight: 0.20,
        agencyThresholds: [0.03, 0.08, 0.15, 0.22, 0.30],
        turnoverRateWeight: 0.15,
        turnoverThresholds: [0.30, 0.45, 0.55, 0.70, 0.85],
        acuityMismatchWeight: 0.08,
        managementStabilityWeight: 0.05,
        systemsIntegrationWeight: 0.02,
      },
      financialRisk: {
        debtServiceCoverageWeight: 0.25,
        dscThresholds: [1.6, 1.4, 1.25, 1.1, 1.0],
        workingCapitalWeight: 0.20,
        workingCapitalThresholds: [75, 55, 40, 25, 15],
        revenueConcentrationWeight: 0.18,
        concentrationThresholds: [0.35, 0.45, 0.55, 0.65, 0.75],
        marginTrendWeight: 0.15,
        marginThresholds: [0.03, 0.01, 0, -0.02, -0.05],
        arAgingWeight: 0.12,
        arAgingThresholds: [40, 55, 70, 85, 100],
        cashFlowVolatilityWeight: 0.05,
        leverageWeight: 0.05,
      },
      marketRisk: {
        competitionDensityWeight: 0.28,
        densityThresholds: [0.82, 0.88, 0.93, 0.97, 1.0],
        populationGrowthWeight: 0.25,
        populationThresholds: [0.025, 0.015, 0.005, 0, -0.01],
        reimbursementTrendWeight: 0.22,
        reimbursementThresholds: [0.035, 0.025, 0.015, 0.005, 0],
        supplyPipelineWeight: 0.15,
        supplyThresholds: [0.02, 0.05, 0.08, 0.12, 0.18],
        economicConditionsWeight: 0.05,
        referralSourceConcentrationWeight: 0.05,
      },
      riskScoreThresholds: { veryLow: 15, low: 28, moderate: 45, elevated: 62, high: 78, veryHigh: 88, critical: 95 },
    },
    dealBreakers: {
      byAssetType: {
        SNF: { minCMSRating: 2, maxDeficiencies: 25, maxSeverityScore: 30, sffExclusion: true, sffCandidateExclusion: false, minOccupancy: 0.70, maxAgencyUsage: 0.30, minMargin: 0.02, minDSCR: 1.05, maxLeverage: 0.80, maxBuildingAge: 50, minBeds: 30, maxBeds: 400, excludeStates: [], requiredLicenses: [], excludeOwnershipTypes: [], maxDebtPerBed: 100000, minRevenuePerBed: 75000 },
        ALF: { minCMSRating: 0, maxDeficiencies: 15, maxSeverityScore: 20, sffExclusion: false, sffCandidateExclusion: false, minOccupancy: 0.75, maxAgencyUsage: 0.20, minMargin: 0.05, minDSCR: 1.15, maxLeverage: 0.75, maxBuildingAge: 45, minBeds: 25, maxBeds: 350, excludeStates: [], requiredLicenses: [], excludeOwnershipTypes: [], maxDebtPerBed: 125000, minRevenuePerBed: 60000 },
        ILF: { minCMSRating: 0, maxDeficiencies: 10, maxSeverityScore: 15, sffExclusion: false, sffCandidateExclusion: false, minOccupancy: 0.80, maxAgencyUsage: 0.12, minMargin: 0.08, minDSCR: 1.25, maxLeverage: 0.70, maxBuildingAge: 40, minBeds: 40, maxBeds: 500, excludeStates: [], requiredLicenses: [], excludeOwnershipTypes: [], maxDebtPerBed: 150000, minRevenuePerBed: 50000 },
      },
      global: { maxTotalInvestment: 100000000, minTotalInvestment: 5000000, maxSingleFacilityExposure: 0.40, maxStateConcentration: 0.50, maxOperatorConcentration: 0.35 },
    },
  },

  // Market settings
  market: {
    marketCapRates: {
      west: { SNF: { min: 0.075, mid: 0.095, max: 0.125 }, ALF: { min: 0.06, mid: 0.075, max: 0.095 }, ILF: { min: 0.05, mid: 0.065, max: 0.085 } },
      midwest: { SNF: { min: 0.095, mid: 0.115, max: 0.145 }, ALF: { min: 0.072, mid: 0.088, max: 0.108 }, ILF: { min: 0.062, mid: 0.078, max: 0.098 } },
      northeast: { SNF: { min: 0.08, mid: 0.10, max: 0.13 }, ALF: { min: 0.058, mid: 0.072, max: 0.092 }, ILF: { min: 0.048, mid: 0.062, max: 0.082 } },
      southeast: { SNF: { min: 0.09, mid: 0.11, max: 0.14 }, ALF: { min: 0.068, mid: 0.082, max: 0.102 }, ILF: { min: 0.058, mid: 0.072, max: 0.092 } },
      southwest: { SNF: { min: 0.085, mid: 0.105, max: 0.135 }, ALF: { min: 0.063, mid: 0.078, max: 0.098 }, ILF: { min: 0.053, mid: 0.068, max: 0.088 } },
    },
    marketPricePerBed: {
      west: { SNF: { min: 72000, mid: 98000, max: 140000 }, ALF: { min: 95000, mid: 138000, max: 195000 }, ILF: { min: 120000, mid: 170000, max: 240000 } },
      midwest: { SNF: { min: 52000, mid: 72000, max: 98000 }, ALF: { min: 78000, mid: 105000, max: 145000 }, ILF: { min: 95000, mid: 130000, max: 180000 } },
      northeast: { SNF: { min: 68000, mid: 92000, max: 130000 }, ALF: { min: 90000, mid: 128000, max: 180000 }, ILF: { min: 115000, mid: 160000, max: 225000 } },
      southeast: { SNF: { min: 58000, mid: 80000, max: 108000 }, ALF: { min: 85000, mid: 118000, max: 162000 }, ILF: { min: 105000, mid: 145000, max: 200000 } },
      southwest: { SNF: { min: 62000, mid: 86000, max: 118000 }, ALF: { min: 88000, mid: 122000, max: 170000 }, ILF: { min: 110000, mid: 152000, max: 212000 } },
    },
    medicaidRates: {},
    marketGrowth: {
      west: { populationGrowth65Plus: 0.030, populationGrowth85Plus: 0.035, supplyGrowthRate: 0.018, demandGrowthRate: 0.028, absorptionRate: 0.92, marketOccupancy: 0.88 },
      midwest: { populationGrowth65Plus: 0.020, populationGrowth85Plus: 0.025, supplyGrowthRate: 0.010, demandGrowthRate: 0.018, absorptionRate: 0.88, marketOccupancy: 0.85 },
      northeast: { populationGrowth65Plus: 0.018, populationGrowth85Plus: 0.022, supplyGrowthRate: 0.008, demandGrowthRate: 0.015, absorptionRate: 0.85, marketOccupancy: 0.87 },
      southeast: { populationGrowth65Plus: 0.035, populationGrowth85Plus: 0.042, supplyGrowthRate: 0.025, demandGrowthRate: 0.035, absorptionRate: 0.94, marketOccupancy: 0.86 },
      southwest: { populationGrowth65Plus: 0.032, populationGrowth85Plus: 0.038, supplyGrowthRate: 0.022, demandGrowthRate: 0.032, absorptionRate: 0.93, marketOccupancy: 0.87 },
    },
    competitionSettings: {
      primaryMarketRadius: 10,
      secondaryMarketRadius: 20,
      tertiaryMarketRadius: 35,
      densityThresholds: { veryLow: 0.78, low: 0.85, moderate: 0.90, high: 0.95, veryHigh: 0.98 },
      qualityCompetitionWeight: 0.30,
    },
    dataRefreshSettings: {
      cmsDataMaxAgeDays: 30,
      marketDataMaxAgeDays: 90,
      comparablesMaxAgeMonths: 24,
      medicaidRatesRefreshDays: 180,
      competitorDataMaxAgeDays: 60,
      economicDataMaxAgeDays: 90,
    },
    economicIndicators: {
      unemploymentRateWeight: 0.25,
      medianIncomeWeight: 0.30,
      povertyRateWeight: 0.20,
      medicaidExpansionBonus: 0.05,
      unionPenetrationImpact: -0.02,
    },
  },

  // Proforma settings
  proforma: {
    scenarioDefaults: {
      baseline: { occupancyGrowth: 0.02, revenueGrowth: 0.025, expenseGrowth: 0.03, capexPercent: 0.02 },
      upside: { occupancyGrowth: 0.04, revenueGrowth: 0.04, expenseGrowth: 0.025, capexPercent: 0.015 },
      downside: { occupancyGrowth: 0, revenueGrowth: 0.015, expenseGrowth: 0.035, capexPercent: 0.025 },
      turnaround: { occupancyGrowth: 0.06, revenueGrowth: 0.05, expenseGrowth: 0.02, capexPercent: 0.04, stabilizationMonths: 24 },
    },
    projectionSettings: { defaultYears: 5, maxYears: 15, monthlyGranularityYears: 3, includeConstructionPeriod: false, constructionMonths: 18 },
    rampUpAssumptions: {
      newAcquisition: { months: 12, startOccupancy: 0.80, targetOccupancy: 0.90, revenueRampMonths: 15, expenseRampMonths: 9 },
      turnaround: { months: 24, startOccupancy: 0.70, targetOccupancy: 0.88, staffingRampMonths: 12, qualityImprovementMonths: 18 },
      development: { leaseUpMonths: 24, startOccupancy: 0.25, stabilizedOccupancy: 0.92, marketingMonths: 6 },
    },
    capitalImprovements: {
      deferred: { perBed: 5000, timelineYears: 1 },
      renovation: { perBed: 15000, timelineYears: 2 },
      majorRenovation: { perBed: 30000, timelineYears: 3 },
      expansion: { perBed: 150000, timelineYears: 3 },
      repositioning: { perBed: 45000, timelineYears: 2.5 },
      technology: { perBed: 3000, timelineYears: 1 },
    },
    financingAssumptions: { seniorDebtLTV: 0.70, seniorDebtRate: 0.065, seniorDebtTerm: 10, seniorDebtAmortization: 25, mezzDebtLTV: 0.10, mezzDebtRate: 0.12, mezzDebtTerm: 5, preferredEquityReturn: 0.10, closingCostsPercent: 0.02, loanOriginationFee: 0.01 },
    exitAssumptions: { defaultHoldPeriod: 5, exitCapRateSpread: 0.005, sellingCostsPercent: 0.025, prepaymentPenaltyYears: 3, prepaymentPenaltyPercent: 0.01 },
  },

  // Display settings
  display: {
    numberFormat: {
      currency: 'USD',
      locale: 'en-US',
      decimals: { currency: 0, percentage: 1, ratio: 2, capRate: 2, multiple: 1 },
      abbreviateMillions: true,
      abbreviateThousands: false,
    },
    chartColors: {
      primary: '#1B4332',
      secondary: '#2D6A4F',
      tertiary: '#40916C',
      positive: '#059669',
      negative: '#DC2626',
      neutral: '#6B7280',
      warning: '#D97706',
      assetTypes: { SNF: '#1B4332', ALF: '#2563EB', ILF: '#7C3AED' },
      ratings: { fiveStar: '#059669', fourStar: '#10B981', threeStar: '#F59E0B', twoStar: '#F97316', oneStar: '#DC2626' },
    },
    dashboardSettings: { defaultView: 'pipeline', itemsPerPage: 25, defaultSort: 'updatedAt', showConfidenceScores: true, showRiskIndicators: true, compactMode: false },
    exportSettings: { defaultFormat: 'pdf', includeLogo: true, includeDisclaimer: true, disclaimerText: 'This analysis is for informational purposes only and should not be considered investment advice.' },
  },

  customOverrides: {},
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function mergeSettings(
  base: AlgorithmSettings,
  overrides: Partial<AlgorithmSettings>
): AlgorithmSettings {
  return deepMerge(base, overrides) as AlgorithmSettings;
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && !(source[key] instanceof Array)) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function validateSettings(settings: AlgorithmSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate cap rate limits
  if (settings.valuation.capRate.globalMinCapRate >= settings.valuation.capRate.globalMaxCapRate) {
    errors.push('Global cap rate min must be less than max');
  }

  // Validate method weights sum to 1 for each asset type
  for (const assetType of ASSET_TYPES) {
    if (!settings.activeAssetTypes[assetType]) continue;

    const weights = settings.valuation.methodWeights[assetType];
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) {
      errors.push(`${assetType} valuation method weights must sum to 1 (currently ${sum.toFixed(2)})`);
    }
  }

  // Validate CMS scoring weights
  const cmsSum = Object.values(settings.risk.cmsScoring.overallRatingWeights).reduce((a, b) => a + b, 0);
  if (Math.abs(cmsSum - 1) > 0.01) {
    errors.push(`CMS scoring weights must sum to 1 (currently ${cmsSum.toFixed(2)})`);
  }

  // Validate risk category weights
  const riskSum = Object.values(settings.risk.riskScoring.categoryWeights).reduce((a, b) => a + b, 0);
  if (Math.abs(riskSum - 1) > 0.01) {
    errors.push(`Risk category weights must sum to 1 (currently ${riskSum.toFixed(2)})`);
  }

  // Validate comparable sales weighting factors
  const compSum = Object.values(settings.valuation.comparableSales.weightingFactors).reduce((a, b) => a + b, 0);
  if (Math.abs(compSum - 1) > 0.01) {
    errors.push(`Comparable sales weighting factors must sum to 1 (currently ${compSum.toFixed(2)})`);
  }

  return { valid: errors.length === 0, errors };
}

export function getSettingsForAssetType<T>(
  settings: AssetTypeSettings<T>,
  assetType: AssetType
): T {
  return settings[assetType];
}
