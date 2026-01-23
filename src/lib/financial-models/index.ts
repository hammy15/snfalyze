/**
 * Financial Models Index
 * Exports all deal structure and financial analysis tools
 */

// Common types
export type AssetType = 'SNF' | 'ALF' | 'ILF';

// Conventional Financing
export {
  conventionalFinancingCalculator,
  ConventionalFinancingCalculator,
  DEFAULT_LTV_RANGES,
  DEFAULT_INTEREST_RATES,
  MINIMUM_DSCR,
  type ConventionalFinancingInput,
  type ConventionalFinancingResult,
  type LoanScheduleRow,
  type LoanType,
} from './conventional-financing';

// Lease Buyout
export {
  leaseBuyoutCalculator,
  LeaseBuyoutCalculator,
  DEFAULT_BUYOUT_INTEREST_RATE,
  DEFAULT_EBITDAR_GROWTH,
  MINIMUM_COVERAGE_RATIOS,
  type LeaseBuyoutInput,
  type LeaseBuyoutResult,
  type LeaseAcquisition,
  type ExistingLeaseTerms,
  type FacilityBuyoutAnalysis,
  type BuyoutAmortizationRow,
} from './lease-buyout';

// IRR/NPV Calculator
export {
  irrNpvCalculator,
  IRRNPVCalculator,
  type IRRNPVInput,
  type IRRNPVResult,
  type CashFlowItem,
  type SensitivityPoint,
} from './irr-npv';

// Pro Forma Generator
export {
  proFormaGenerator,
  ProFormaGenerator,
  DEFAULT_GROWTH_ASSUMPTIONS,
  type FacilityBaseData,
  type GrowthAssumptions,
  type FinancingAssumptions,
  type ProFormaYear,
  type ProFormaResult,
  type PortfolioProFormaResult,
} from './pro-forma';

// Exit Strategy
export {
  exitStrategyAnalyzer,
  ExitStrategyAnalyzer,
  DEFAULT_EXIT_CAP_RATES,
  DEFAULT_SELLING_COSTS,
  type ExitType,
  type PropertyMetrics,
  type CurrentFinancing,
  type EquityPosition,
  type SaleAssumptions,
  type RefinanceAssumptions,
  type HoldAssumptions,
  type ExitAnalysisInput,
  type SaleExitResult,
  type RefinanceExitResult,
  type HoldExitResult,
  type ExitComparisonResult,
} from './exit-strategy';

// Waterfall Distribution
export {
  waterfallCalculator,
  WaterfallCalculator,
  STANDARD_WATERFALL_STRUCTURES,
  type WaterfallStructure,
  type Partner,
  type WaterfallTier,
  type WaterfallInput,
  type DistributionDetail,
  type PartnerSummary,
  type WaterfallResult,
} from './waterfall';

// Deal Comparison
export {
  dealComparisonAnalyzer,
  DealComparisonAnalyzer,
  type DealStructure,
  type FacilityData,
  type DealComparisonInput,
  type StructureAnalysis,
  type DealComparisonResult,
} from './deal-comparison';

// Re-export sale-leaseback from its location
export {
  saleLeasebackCalculator,
  portfolioAnalyzer,
  sensitivityAnalyzer,
  DEFAULT_CAP_RATES,
  DEFAULT_MIN_COVERAGE_RATIOS,
} from '../sale-leaseback';
