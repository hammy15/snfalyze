/**
 * Real-time Analysis Module
 *
 * Provides real-time recalculation capabilities for interactive analysis.
 */

// Parameter Resolver
export {
  ParameterResolver,
  createParameterResolver,
  GLOBAL_VALUATION_SETTINGS,
  type ParameterSource,
  type ResolvedParameters,
  type OverrideInput,
} from './parameter-resolver';

// Recalculation Engine
export {
  RecalculationEngine,
  createRecalculationEngine,
  type RecalculationResult,
  type SensitivityPoint,
  type SensitivityAnalysis,
  type ScenarioComparison,
  type MonteCarloResult,
} from './recalculation-engine';

// Debounced Calculator
export {
  DebouncedCalculator,
  SliderCalculator,
  createDebouncedCalculator,
  createSliderCalculator,
  type CalculatorState,
  type CalculatorCallbacks,
  type DebouncedCalculatorOptions,
  type SliderConfig,
  type SliderState,
} from './debounced-calculator';
