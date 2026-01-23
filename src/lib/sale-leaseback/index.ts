/**
 * Sale-Leaseback Module
 *
 * Comprehensive module for sale-leaseback transaction analysis including:
 * - Core calculations (purchase price, rent, coverage)
 * - Sensitivity analysis
 * - Portfolio aggregation
 */

export {
  SaleLeasebackCalculator,
  saleLeasebackCalculator,
  DEFAULT_CAP_RATES,
  DEFAULT_MIN_COVERAGE_RATIOS,
  type AssetType,
  type SaleLeasebackInput,
  type SaleLeasebackResult,
  type FacilitySaleLeasebackInput,
  type FacilitySaleLeasebackResult,
  type PortfolioSaleLeasebackResult,
} from './calculator';

export {
  SaleLeasebackSensitivityAnalyzer,
  sensitivityAnalyzer,
  type SensitivityRange,
  type CapRateSensitivityResult,
  type YieldSensitivityResult,
  type OccupancySensitivityResult,
  type TwoWaySensitivityCell,
  type TwoWaySensitivityResult,
  type RentEscalationScenario,
  type RentEscalationResult,
} from './sensitivity';

export {
  PortfolioAnalyzer,
  portfolioAnalyzer,
  type PortfolioFacility,
  type PortfolioAnalysisInput,
  type FacilityContribution,
  type AssetTypeBreakdown,
  type GeographicBreakdown,
  type PortfolioDetailedResult,
  type AllOrNothingAnalysis,
} from './portfolio';
