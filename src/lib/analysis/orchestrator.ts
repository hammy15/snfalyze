// =============================================================================
// ANALYSIS ORCHESTRATOR - Tie all analysis components together
// =============================================================================

import type {
  DealAnalysis,
  FacilityProfile,
  CMSData,
  OperatingMetrics,
  NormalizedFinancials,
  ValuationResult,
  RiskAssessment,
  ExtractedDocument,
  ComparableSale,
  MarketData,
  ProformaProjection,
} from './types';

import { ValuationEngine, type ValuationEngineSettings } from './valuation/valuation-engine';
import { RiskEngine, type RiskEngineSettings } from './risk/risk-engine';
import { FinancialNormalizer, type NormalizationOptions } from './financial/financial-normalizer';
import { documentClassifier } from './document-extraction/document-classifier';
import { tableExtractor } from './document-extraction/table-extractor';
import { fieldExtractor, type LLMClient } from './document-extraction/field-extractor';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalysisInput {
  dealId: string;
  facilityId: string;
  facilityProfile: FacilityProfile;
  documents?: ExtractedDocument[];
  cmsData?: CMSData;
  operatingMetrics?: OperatingMetrics;
  rawFinancials?: {
    revenueLines: { label: string; amount: number }[];
    expenseLines: { label: string; amount: number }[];
    beds: number;
    patientDays: number;
    period: {
      startDate?: string;
      endDate: string;
      months?: number;
      isAudited?: boolean;
      isProjected?: boolean;
    };
  };
  marketData?: MarketData;
  comparableSales?: ComparableSale[];
  askingPrice?: number;
}

export interface AnalysisSettings {
  valuation?: Partial<ValuationEngineSettings>;
  risk?: Partial<RiskEngineSettings>;
  normalization?: Partial<NormalizationOptions>;
  llmClient?: LLMClient;
}

export interface AnalysisProgress {
  stage: 'initializing' | 'extracting' | 'normalizing' | 'analyzing' | 'valuating' | 'synthesizing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  errors?: string[];
}

export type ProgressCallback = (progress: AnalysisProgress) => void;

// =============================================================================
// ANALYSIS ORCHESTRATOR CLASS
// =============================================================================

export class AnalysisOrchestrator {
  private valuationEngine: ValuationEngine;
  private riskEngine: RiskEngine;
  private financialNormalizer: FinancialNormalizer;
  private llmClient: LLMClient | null;

  constructor(settings?: AnalysisSettings) {
    this.valuationEngine = new ValuationEngine(settings?.valuation);
    this.riskEngine = new RiskEngine(settings?.risk);
    this.financialNormalizer = new FinancialNormalizer(settings?.normalization);
    this.llmClient = settings?.llmClient || null;

    if (this.llmClient) {
      fieldExtractor.setLLMClient(this.llmClient);
    }
  }

  /**
   * Run complete deal analysis
   */
  async analyze(
    input: AnalysisInput,
    onProgress?: ProgressCallback
  ): Promise<DealAnalysis> {
    const progress: AnalysisProgress = {
      stage: 'initializing',
      progress: 0,
      message: 'Starting analysis...',
    };

    try {
      // Report progress
      this.reportProgress(progress, onProgress);

      // Step 1: Extract data from documents if provided
      let extractedData: {
        facilityProfile?: Partial<FacilityProfile>;
        operatingMetrics?: Partial<OperatingMetrics>;
        financialData?: {
          revenueLines: { label: string; amount: number }[];
          expenseLines: { label: string; amount: number }[];
        };
      } = {};

      if (input.documents && input.documents.length > 0) {
        progress.stage = 'extracting';
        progress.progress = 10;
        progress.message = 'Extracting data from documents...';
        this.reportProgress(progress, onProgress);

        extractedData = await this.extractFromDocuments(input.documents);
      }

      // Step 2: Normalize financials
      progress.stage = 'normalizing';
      progress.progress = 30;
      progress.message = 'Normalizing financial data...';
      this.reportProgress(progress, onProgress);

      const rawFinancials = input.rawFinancials || this.buildRawFinancials(extractedData, input);
      const normalizedFinancials = this.financialNormalizer.normalize(rawFinancials);

      // Step 3: Run risk assessment
      progress.stage = 'analyzing';
      progress.progress = 50;
      progress.message = 'Assessing risks...';
      this.reportProgress(progress, onProgress);

      const riskOutput = this.riskEngine.assess({
        facility: input.facilityProfile,
        cmsData: input.cmsData,
        operations: input.operatingMetrics,
        financials: normalizedFinancials,
        market: input.marketData,
      });

      // Step 4: Run valuation
      progress.stage = 'valuating';
      progress.progress = 70;
      progress.message = 'Calculating valuations...';
      this.reportProgress(progress, onProgress);

      const valuationOutput = this.valuationEngine.valuate({
        facility: input.facilityProfile,
        cmsData: input.cmsData,
        operatingMetrics: input.operatingMetrics,
        financials: normalizedFinancials,
        marketData: input.marketData,
        comparableSales: input.comparableSales,
      });

      // Step 5: Synthesize results
      progress.stage = 'synthesizing';
      progress.progress = 90;
      progress.message = 'Synthesizing analysis...';
      this.reportProgress(progress, onProgress);

      const analysis = this.synthesize(
        input,
        normalizedFinancials,
        valuationOutput.result,
        riskOutput.assessment,
        riskOutput.summary.recommendation
      );

      // Complete
      progress.stage = 'complete';
      progress.progress = 100;
      progress.message = 'Analysis complete';
      this.reportProgress(progress, onProgress);

      return analysis;
    } catch (error) {
      progress.stage = 'error';
      progress.progress = 0;
      progress.message = 'Analysis failed';
      progress.errors = [error instanceof Error ? error.message : 'Unknown error'];
      this.reportProgress(progress, onProgress);
      throw error;
    }
  }

  /**
   * Extract data from uploaded documents
   */
  private async extractFromDocuments(documents: ExtractedDocument[]): Promise<{
    facilityProfile?: Partial<FacilityProfile>;
    operatingMetrics?: Partial<OperatingMetrics>;
    financialData?: {
      revenueLines: { label: string; amount: number }[];
      expenseLines: { label: string; amount: number }[];
    };
  }> {
    const result: {
      facilityProfile?: Partial<FacilityProfile>;
      operatingMetrics?: Partial<OperatingMetrics>;
      financialData?: {
        revenueLines: { label: string; amount: number }[];
        expenseLines: { label: string; amount: number }[];
      };
    } = {};

    for (const doc of documents) {
      if (doc.status !== 'completed' || !doc.rawText) continue;

      // Classify document type if not set
      const docType = doc.documentType || documentClassifier.classify({
        filename: doc.filename,
        rawText: doc.rawText,
      }).documentType;

      const context = {
        documentType: docType,
        rawText: doc.rawText,
      };

      // Extract based on document type
      switch (docType) {
        case 'offering_memorandum':
          result.facilityProfile = await fieldExtractor.extractFacilityProfile(context);
          result.operatingMetrics = await fieldExtractor.extractOperatingMetrics(context);
          break;

        case 'trailing_12':
        case 'historical_pnl':
          // Extract financial tables
          // This would use table extraction in production
          break;

        case 'census_report':
        case 'staffing_report':
          result.operatingMetrics = {
            ...result.operatingMetrics,
            ...(await fieldExtractor.extractOperatingMetrics(context)),
          };
          break;
      }
    }

    return result;
  }

  /**
   * Build raw financials from extracted data or defaults
   */
  private buildRawFinancials(
    extractedData: {
      financialData?: {
        revenueLines: { label: string; amount: number }[];
        expenseLines: { label: string; amount: number }[];
      };
    },
    input: AnalysisInput
  ): {
    revenueLines: { label: string; amount: number }[];
    expenseLines: { label: string; amount: number }[];
    beds: number;
    patientDays: number;
    period: {
      endDate: string;
      months?: number;
    };
  } {
    if (extractedData.financialData) {
      return {
        ...extractedData.financialData,
        beds: input.facilityProfile.beds.operational,
        patientDays: input.operatingMetrics?.currentCensus
          ? input.operatingMetrics.currentCensus * 365
          : input.facilityProfile.beds.operational * 0.85 * 365,
        period: {
          endDate: new Date().toISOString().split('T')[0],
          months: 12,
        },
      };
    }

    // Return empty financials if no data available
    return {
      revenueLines: [],
      expenseLines: [],
      beds: input.facilityProfile.beds.operational,
      patientDays: 0,
      period: {
        endDate: new Date().toISOString().split('T')[0],
        months: 12,
      },
    };
  }

  /**
   * Synthesize all analysis components into final result
   */
  private synthesize(
    input: AnalysisInput,
    financials: NormalizedFinancials,
    valuation: ValuationResult,
    risk: RiskAssessment,
    riskRecommendation: 'pursue' | 'conditional' | 'pass'
  ): DealAnalysis {
    // Determine overall recommendation
    const recommendation = this.determineRecommendation(
      valuation,
      risk,
      riskRecommendation,
      input.askingPrice
    );

    // Build rationale
    const recommendationRationale = this.buildRationale(
      recommendation,
      valuation,
      risk,
      input.askingPrice
    );

    // Calculate key metrics
    const occupancy = input.operatingMetrics?.occupancyRate || 85;
    const goingInYield = input.askingPrice && financials.normalized.metrics.noi > 0
      ? financials.normalized.metrics.noi / input.askingPrice
      : valuation.impliedCapRate;

    const keyMetrics = {
      askingPrice: input.askingPrice,
      valuedPrice: valuation.reconciledValue,
      pricePerBed: valuation.valuePerBed,
      impliedCapRate: valuation.impliedCapRate,
      goingInYield,
      occupancy,
      cmsRating: input.cmsData?.overallRating,
      riskScore: risk.overallScore,
      ebitdarMargin: financials.normalized.metrics.ebitdarMargin,
    };

    return {
      dealId: input.dealId,
      facilityId: input.facilityId,
      analysisDate: new Date().toISOString(),
      version: 1,
      status: 'complete',

      facilityProfile: input.facilityProfile,
      cmsData: input.cmsData,
      operatingMetrics: input.operatingMetrics || this.buildDefaultOperatingMetrics(input.facilityProfile),
      financials,
      valuation,
      riskAssessment: risk,

      recommendation,
      recommendationRationale,
      keyMetrics,

      createdBy: 'system',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Determine overall recommendation
   */
  private determineRecommendation(
    valuation: ValuationResult,
    risk: RiskAssessment,
    riskRecommendation: 'pursue' | 'conditional' | 'pass',
    askingPrice?: number
  ): 'pursue' | 'conditional' | 'pass' {
    // If risk says pass, follow that
    if (riskRecommendation === 'pass') {
      return 'pass';
    }

    // Check price vs valuation
    if (askingPrice) {
      const priceToValue = askingPrice / valuation.reconciledValue;

      if (priceToValue > 1.15) {
        // Asking price >15% above valuation
        return riskRecommendation === 'pursue' ? 'conditional' : 'pass';
      }

      if (priceToValue > 1.05) {
        // Asking price 5-15% above valuation
        return 'conditional';
      }
    }

    // Check valuation confidence
    if (valuation.overallConfidence === 'low') {
      return riskRecommendation === 'pursue' ? 'conditional' : riskRecommendation;
    }

    return riskRecommendation;
  }

  /**
   * Build recommendation rationale
   */
  private buildRationale(
    recommendation: 'pursue' | 'conditional' | 'pass',
    valuation: ValuationResult,
    risk: RiskAssessment,
    askingPrice?: number
  ): string[] {
    const rationale: string[] = [];

    // Valuation rationale
    if (askingPrice) {
      const priceToValue = askingPrice / valuation.reconciledValue;
      if (priceToValue < 0.95) {
        rationale.push(`Asking price is ${((1 - priceToValue) * 100).toFixed(0)}% below estimated value`);
      } else if (priceToValue > 1.05) {
        rationale.push(`Asking price is ${((priceToValue - 1) * 100).toFixed(0)}% above estimated value`);
      } else {
        rationale.push('Asking price is in line with estimated value');
      }
    }

    rationale.push(`Valuation confidence: ${valuation.overallConfidence}`);

    // Risk rationale
    rationale.push(`Overall risk score: ${risk.overallScore.toFixed(0)}/100 (${risk.overallRating})`);

    if (risk.dealBreakers.triggered) {
      rationale.push(`DEAL BREAKER: ${risk.dealBreakers.items.filter(i => i.triggered).map(i => i.rule).join(', ')}`);
    }

    if (risk.keyRisks.length > 0) {
      rationale.push(`Key risks: ${risk.keyRisks.slice(0, 3).map(r => r.name).join(', ')}`);
    }

    // Recommendation-specific rationale
    switch (recommendation) {
      case 'pursue':
        rationale.push('Deal meets investment criteria with acceptable risk profile');
        break;
      case 'conditional':
        rationale.push('Proceed with caution - address identified concerns in due diligence');
        break;
      case 'pass':
        rationale.push('Deal does not meet investment criteria - significant concerns identified');
        break;
    }

    return rationale;
  }

  /**
   * Build default operating metrics
   */
  private buildDefaultOperatingMetrics(facility: FacilityProfile): OperatingMetrics {
    return {
      currentCensus: Math.round(facility.beds.operational * 0.85),
      occupancyRate: 85,
      occupancyTrend: 'stable',
      payerMix: {
        medicareA: 15,
        medicareB: 5,
        medicareAdvantage: 10,
        medicaid: 55,
        privatePay: 10,
        managedCare: 3,
        vaContract: 1,
        hospice: 1,
        other: 0,
      },
      acuityLevel: 'moderate',
      staffing: {
        rnHPPD: 0.5,
        lpnHPPD: 0.8,
        cnaHPPD: 2.5,
        totalHPPD: 3.8,
        agencyUsagePercent: 8,
        turnoverRate: 45,
      },
      averageLOS: {
        medicare: 22,
        medicaid: 180,
        privatePay: 45,
        overall: 90,
      },
    };
  }

  /**
   * Report progress
   */
  private reportProgress(progress: AnalysisProgress, callback?: ProgressCallback): void {
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Update engines with new settings
   */
  updateSettings(settings: AnalysisSettings): void {
    if (settings.valuation) {
      this.valuationEngine.updateSettings(settings.valuation);
    }
    if (settings.risk) {
      this.riskEngine.updateSettings(settings.risk);
    }
    if (settings.llmClient) {
      this.llmClient = settings.llmClient;
      fieldExtractor.setLLMClient(settings.llmClient);
    }
  }
}

// =============================================================================
// QUICK ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Quick valuation only
 */
export async function quickValuation(
  facility: FacilityProfile,
  noi: number,
  cmsData?: CMSData,
  operations?: OperatingMetrics
): Promise<ValuationResult> {
  const engine = new ValuationEngine();

  // Build minimal financials
  const financials: NormalizedFinancials = {
    original: {} as NormalizedFinancials['original'],
    normalized: {
      metrics: {
        noi,
        noiMargin: 0.10,
        ebitdar: noi * 1.05,
        ebitdarMargin: 0.12,
        ebitda: noi,
        ebitdaMargin: 0.10,
        netIncome: noi * 0.8,
        netIncomeMargin: 0.08,
        revenuePerBed: 0,
        expensePerBed: 0,
        revenuePerPatientDay: 0,
        expensePerPatientDay: 0,
        laborCostPercent: 0.55,
      },
    } as NormalizedFinancials['normalized'],
    adjustments: [],
    benchmarkComparison: {} as NormalizedFinancials['benchmarkComparison'],
  };

  const output = engine.valuate({
    facility,
    cmsData,
    operatingMetrics: operations,
    financials,
  });

  return output.result;
}

/**
 * Quick risk assessment only
 */
export async function quickRiskAssessment(
  facility: FacilityProfile,
  cmsData?: CMSData,
  operations?: OperatingMetrics
): Promise<RiskAssessment> {
  const engine = new RiskEngine();

  const output = engine.assess({
    facility,
    cmsData,
    operations,
  });

  return output.assessment;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const analysisOrchestrator = new AnalysisOrchestrator();
