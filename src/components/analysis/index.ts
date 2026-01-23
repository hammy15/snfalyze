/**
 * Analysis Components
 *
 * Interactive analysis and visualization components for the valuation system.
 */

// Valuation Methods Grid
export {
  ValuationMethodsGrid,
  type ValuationMethodsGridProps,
} from './ValuationMethodsGrid';

// Interactive Sensitivity
export {
  InteractiveSensitivity,
  type SensitivityParameter,
  type SensitivityResult,
  type InteractiveSensitivityProps,
} from './InteractiveSensitivity';

// Parameter Adjuster
export {
  ParameterAdjuster,
  type ParameterGroup,
  type Parameter,
  type Preset,
  type AISuggestion,
  type ParameterAdjusterProps,
} from './ParameterAdjuster';

// Monte Carlo Visualization
export {
  MonteCarloVisualization,
  type DistributionConfig,
  type MonteCarloVisualizationProps,
} from './MonteCarloVisualization';
