/**
 * Stage Walkthrough Types
 * Defines the structure for guided stage-by-stage analysis
 */

import { AnalysisStage } from '@/lib/deals/types';

export interface StageTask {
  id: string;
  label: string;
  description?: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  tool?: StageTool; // Associated tool/action
}

export type StageTool =
  | 'view_documents'
  | 'extract_financials'
  | 'verify_facilities'
  | 'map_coa'
  | 'review_census'
  | 'review_ppd'
  | 'review_pl'
  | 'sync_cms'
  | 'review_survey'
  | 'add_risk'
  | 'run_valuation'
  | 'review_proforma'
  | 'generate_synthesis'
  | 'export_report';

export interface StageGuide {
  stage: AnalysisStage;
  title: string;
  description: string;
  estimatedTime: string;
  tasks: StageTask[];
  tips: string[];
  warningConditions?: StageWarning[];
  nextStagePreview?: string;
}

export interface StageWarning {
  condition: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface StageProgress {
  stage: AnalysisStage;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  isStarted: boolean;
  isCompleted: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WalkthroughState {
  dealId: string;
  currentStage: AnalysisStage;
  stageProgress: Record<AnalysisStage, StageProgress>;
  taskCompletions: Record<string, boolean>;
}

// Stage guide definitions
export const STAGE_GUIDES: Record<AnalysisStage, StageGuide> = {
  document_understanding: {
    stage: 'document_understanding',
    title: 'Document Understanding',
    description: 'Review all provided deal materials, identify what we have and what\'s missing.',
    estimatedTime: '15-30 min',
    tasks: [
      {
        id: 'doc-review-all',
        label: 'Review all uploaded documents',
        description: 'Open and scan each document to understand what data is available',
        isRequired: true,
        isCompleted: false,
        tool: 'view_documents',
      },
      {
        id: 'doc-identify-types',
        label: 'Verify document types are correctly classified',
        description: 'Ensure P&L, census, rent roll, and other docs are properly categorized',
        isRequired: true,
        isCompleted: false,
        tool: 'view_documents',
      },
      {
        id: 'doc-check-periods',
        label: 'Identify time periods covered',
        description: 'Note which months/years are included in the financials',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'doc-identify-gaps',
        label: 'List missing documents',
        description: 'Create a list of documents needed but not provided',
        isRequired: false,
        isCompleted: false,
      },
      {
        id: 'doc-verify-facilities',
        label: 'Verify facilities against CMS data',
        description: 'Match facilities to their CMS records for validation',
        isRequired: true,
        isCompleted: false,
        tool: 'verify_facilities',
      },
    ],
    tips: [
      'Look for seller-prepared vs. audited financials - audited is more reliable',
      'Check if multiple months/years are available for trend analysis',
      'Note any documents that seem incomplete or have missing pages',
      'Watch for inconsistencies between documents (different bed counts, etc.)',
    ],
    warningConditions: [
      {
        condition: 'no_documents',
        message: 'No documents have been uploaded yet',
        severity: 'error',
      },
      {
        condition: 'no_financials',
        message: 'No financial documents detected',
        severity: 'warning',
      },
    ],
    nextStagePreview: 'Next: Build normalized T12 financials',
  },

  financial_reconstruction: {
    stage: 'financial_reconstruction',
    title: 'Financial Reconstruction',
    description: 'Extract and normalize financial data to build a clean T12 picture.',
    estimatedTime: '30-60 min',
    tasks: [
      {
        id: 'fin-extract-data',
        label: 'Extract financial data from documents',
        description: 'Run AI extraction on financial documents',
        isRequired: true,
        isCompleted: false,
        tool: 'extract_financials',
      },
      {
        id: 'fin-map-coa',
        label: 'Map line items to Chart of Accounts',
        description: 'Ensure all revenue and expense items are properly categorized',
        isRequired: true,
        isCompleted: false,
        tool: 'map_coa',
      },
      {
        id: 'fin-review-census',
        label: 'Review census data by payer type',
        description: 'Verify patient days by payer mix',
        isRequired: true,
        isCompleted: false,
        tool: 'review_census',
      },
      {
        id: 'fin-review-ppd',
        label: 'Review PPD rates by payer',
        description: 'Check per-patient-day rates for each payer type',
        isRequired: true,
        isCompleted: false,
        tool: 'review_ppd',
      },
      {
        id: 'fin-review-pl',
        label: 'Review P&L with variances',
        description: 'Analyze income statement and identify anomalies',
        isRequired: true,
        isCompleted: false,
        tool: 'review_pl',
      },
      {
        id: 'fin-identify-oneoff',
        label: 'Identify one-time items',
        description: 'Flag non-recurring revenue or expenses for normalization',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'fin-check-mgmt-fee',
        label: 'Verify management fee is market-rate',
        description: 'Standard is 5% of revenue - adjust if owner-operated',
        isRequired: false,
        isCompleted: false,
      },
    ],
    tips: [
      'Standard management fee is 5% of revenue',
      'Look for owner salaries that may need adjustment',
      'Check for related-party transactions (rent, services)',
      'Identify any COVID-related revenue or expenses',
    ],
    warningConditions: [
      {
        condition: 'unmapped_items',
        message: 'Some line items are not mapped to COA',
        severity: 'warning',
      },
      {
        condition: 'missing_census',
        message: 'Census data not available for all periods',
        severity: 'warning',
      },
    ],
    nextStagePreview: 'Next: Assess operational performance',
  },

  operating_reality: {
    stage: 'operating_reality',
    title: 'Operating Reality',
    description: 'Dig deeper into operations to understand true performance and trajectory.',
    estimatedTime: '20-40 min',
    tasks: [
      {
        id: 'ops-sync-cms',
        label: 'Sync CMS quality data',
        description: 'Pull latest ratings, staffing, and compliance data',
        isRequired: true,
        isCompleted: false,
        tool: 'sync_cms',
      },
      {
        id: 'ops-review-occupancy',
        label: 'Analyze occupancy trends',
        description: 'Review occupancy over time - is it stable, growing, or declining?',
        isRequired: true,
        isCompleted: false,
        tool: 'review_census',
      },
      {
        id: 'ops-review-payer-mix',
        label: 'Analyze payer mix trends',
        description: 'Is skilled mix improving or declining?',
        isRequired: true,
        isCompleted: false,
        tool: 'review_ppd',
      },
      {
        id: 'ops-review-staffing',
        label: 'Review staffing levels and costs',
        description: 'Check HPPD, agency usage, and labor cost trends',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'ops-review-survey',
        label: 'Review survey/compliance history',
        description: 'Check for deficiencies, complaints, and enforcement actions',
        isRequired: true,
        isCompleted: false,
        tool: 'review_survey',
      },
      {
        id: 'ops-check-sff',
        label: 'Check SFF/Special Focus status',
        description: 'Verify facility is not on Special Focus Facility list',
        isRequired: true,
        isCompleted: false,
      },
    ],
    tips: [
      'High agency usage (>20%) is a red flag for staffing instability',
      'Look for census trends - are admissions keeping pace with discharges?',
      'Check if payer mix shifts are intentional strategy or market pressure',
      'SFF status or frequent surveys indicate serious problems',
    ],
    warningConditions: [
      {
        condition: 'high_agency',
        message: 'Agency staffing exceeds 20% of labor costs',
        severity: 'warning',
      },
      {
        condition: 'sff_status',
        message: 'Facility is on Special Focus list',
        severity: 'error',
      },
      {
        condition: 'declining_occupancy',
        message: 'Occupancy has declined over past 6 months',
        severity: 'warning',
      },
    ],
    nextStagePreview: 'Next: Identify risks and constraints',
  },

  risk_constraints: {
    stage: 'risk_constraints',
    title: 'Risk & Constraints',
    description: 'Systematically identify all risks and potential deal-breakers.',
    estimatedTime: '20-30 min',
    tasks: [
      {
        id: 'risk-regulatory',
        label: 'Assess regulatory risks',
        description: 'Review licenses, certifications, pending actions',
        isRequired: true,
        isCompleted: false,
        tool: 'add_risk',
      },
      {
        id: 'risk-physical',
        label: 'Evaluate physical plant',
        description: 'Review building age, condition, deferred maintenance',
        isRequired: true,
        isCompleted: false,
        tool: 'add_risk',
      },
      {
        id: 'risk-market',
        label: 'Analyze market/competitive risks',
        description: 'Check competition, new supply, market trends',
        isRequired: true,
        isCompleted: false,
        tool: 'add_risk',
      },
      {
        id: 'risk-labor',
        label: 'Assess labor market constraints',
        description: 'Evaluate staffing availability and wage pressure',
        isRequired: true,
        isCompleted: false,
        tool: 'add_risk',
      },
      {
        id: 'risk-reimbursement',
        label: 'Review reimbursement risks',
        description: 'Check for Medicaid rate changes, Medicare adjustments',
        isRequired: false,
        isCompleted: false,
      },
      {
        id: 'risk-identify-breakers',
        label: 'Identify deal-breakers',
        description: 'List any issues that would prevent proceeding',
        isRequired: true,
        isCompleted: false,
      },
    ],
    tips: [
      'Physical plant issues are often underestimated - get inspection reports',
      'Labor constraints vary significantly by market',
      'Check for any pending litigation or claims',
      'Verify all licenses are current and transferable',
    ],
    warningConditions: [
      {
        condition: 'no_risks_identified',
        message: 'No risks have been documented yet',
        severity: 'warning',
      },
      {
        condition: 'critical_risk',
        message: 'Critical risks identified that may be deal-breakers',
        severity: 'error',
      },
    ],
    nextStagePreview: 'Next: Determine valuation and pricing',
  },

  valuation: {
    stage: 'valuation',
    title: 'Valuation',
    description: 'Determine appropriate pricing and deal structure.',
    estimatedTime: '20-40 min',
    tasks: [
      {
        id: 'val-run-calc',
        label: 'Run valuation calculations',
        description: 'Calculate purchase price based on cap rate and NOI',
        isRequired: true,
        isCompleted: false,
        tool: 'run_valuation',
      },
      {
        id: 'val-review-proforma',
        label: 'Review 5-year pro forma',
        description: 'Validate assumptions and projections',
        isRequired: true,
        isCompleted: false,
        tool: 'review_proforma',
      },
      {
        id: 'val-check-coverage',
        label: 'Verify rent coverage ratio',
        description: 'Ensure EBITDAR covers rent at 1.40x minimum',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'val-compare-comps',
        label: 'Compare to market comps',
        description: 'Check price per bed against comparable transactions',
        isRequired: false,
        isCompleted: false,
      },
      {
        id: 'val-set-range',
        label: 'Establish price range',
        description: 'Set low/mid/high pricing scenarios',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'val-define-contingencies',
        label: 'Define contingencies',
        description: 'List conditions required in offer',
        isRequired: false,
        isCompleted: false,
      },
    ],
    tips: [
      'SNF cap rates typically 10-13%, ALF/ILF 6-9%',
      'Price per bed varies significantly by state and market',
      'Always stress-test assumptions in pro forma',
      'Consider capital partner requirements in pricing',
    ],
    warningConditions: [
      {
        condition: 'low_coverage',
        message: 'Coverage ratio below 1.40x - may not meet partner requirements',
        severity: 'warning',
      },
      {
        condition: 'above_asking',
        message: 'Calculated price exceeds asking price',
        severity: 'info',
      },
    ],
    nextStagePreview: 'Next: Final synthesis and recommendation',
  },

  synthesis: {
    stage: 'synthesis',
    title: 'Synthesis & Judgment',
    description: 'Bring it all together with a final recommendation.',
    estimatedTime: '15-30 min',
    tasks: [
      {
        id: 'syn-review-hypothesis',
        label: 'Review working hypothesis',
        description: 'Does our original thesis still hold?',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'syn-list-success',
        label: 'List key success factors',
        description: 'What must go right for this deal to work?',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'syn-define-walkaway',
        label: 'Define walk-away conditions',
        description: 'At what point do we pass on this deal?',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'syn-capital-partner',
        label: 'Consider capital partner view',
        description: 'Will our partners support this at the proposed terms?',
        isRequired: true,
        isCompleted: false,
      },
      {
        id: 'syn-generate-summary',
        label: 'Generate deal summary',
        description: 'Create final recommendation document',
        isRequired: true,
        isCompleted: false,
        tool: 'generate_synthesis',
      },
      {
        id: 'syn-export-report',
        label: 'Export analysis report',
        description: 'Generate PDF/Excel package for review',
        isRequired: false,
        isCompleted: false,
        tool: 'export_report',
      },
    ],
    tips: [
      'Be honest about what could go wrong',
      'Consider the opportunity cost of capital',
      'Document your reasoning for future learning',
      'If in doubt, pass - there will be other deals',
    ],
    warningConditions: [
      {
        condition: 'incomplete_stages',
        message: 'Previous stages are not fully complete',
        severity: 'warning',
      },
    ],
    nextStagePreview: 'Complete! Ready for deal decision.',
  },
};
