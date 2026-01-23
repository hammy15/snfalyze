'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProcessDrivenLayout, ProcessStepper } from '@/components/deals/process-driven-layout';
import { StageTracker } from '@/components/deals/stage-tracker';
import {
  type AnalysisStage,
  type StageStatus,
  type AnalysisStageProgress,
  ANALYSIS_STAGES,
} from '@/lib/deals/types';
import {
  ArrowLeft,
  Building2,
  FileText,
  Upload,
  ChevronRight,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Mock data
const mockDeal = {
  id: '1',
  name: 'Sunrise SNF Portfolio - Oregon',
  status: 'analyzing',
  totalBeds: 360,
  facilityCount: 3,
  askingPrice: 45000000,
};

const mockStageProgress: AnalysisStageProgress[] = [
  {
    id: '1',
    deal_id: '1',
    stage: 'document_understanding',
    status: 'completed',
    started_at: new Date('2024-01-16'),
    completed_at: new Date('2024-01-18'),
    notes: 'All key documents received. Missing Q4 rent roll.',
    blockers: [],
  },
  {
    id: '2',
    deal_id: '1',
    stage: 'financial_reconstruction',
    status: 'in_progress',
    started_at: new Date('2024-01-19'),
    notes: 'Working on normalizing T12.',
    blockers: [],
  },
];

// Stage-specific content components
function DocumentUnderstandingContent({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Document Understanding
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Review all provided materials and identify gaps
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-white rounded-lg hover:bg-[var(--accent-solid-hover)] transition-colors">
          <Upload className="w-4 h-4" />
          Upload Documents
        </button>
      </div>

      {/* Document checklist */}
      <div className="card p-6">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Required Documents</h3>
        <div className="space-y-3">
          {[
            { name: 'Rent Roll', status: 'received', notes: 'Q1-Q3 2024' },
            { name: 'T12 Financials', status: 'received', notes: 'Through Nov 2024' },
            { name: 'Medicare Cost Reports', status: 'received', notes: '2022, 2023' },
            { name: 'Survey History', status: 'pending', notes: 'Requested from seller' },
            { name: 'Staffing Matrix', status: 'received' },
            { name: 'Capital Expenditure History', status: 'missing' },
          ].map((doc) => (
            <div
              key={doc.name}
              className="flex items-center justify-between py-2 border-b border-[var(--color-border-default)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    doc.status === 'received'
                      ? 'bg-green-100'
                      : doc.status === 'pending'
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                  }`}
                >
                  {doc.status === 'received' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : doc.status === 'pending' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-[var(--color-text-primary)]">{doc.name}</span>
                  {doc.notes && (
                    <span className="text-sm text-[var(--color-text-tertiary)] ml-2">
                      ({doc.notes})
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  doc.status === 'received'
                    ? 'bg-green-100 text-green-700'
                    : doc.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CMS Import */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">CMS Provider Data</h3>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              Import facility data from Medicare.gov
            </p>
          </div>
          <Link
            href={`/app/deals/${dealId}/facilities`}
            className="text-sm text-[var(--accent-solid)] hover:underline flex items-center gap-1"
          >
            Manage Facilities
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Sunrise Care Center', ccn: '385001', rating: 4, imported: true },
            { name: 'Valley View Healthcare', ccn: '385002', rating: 3, imported: true },
            { name: 'Mountain Meadows', ccn: null, rating: null, imported: false },
          ].map((facility) => (
            <div
              key={facility.name}
              className={`p-4 rounded-lg border ${
                facility.imported
                  ? 'border-green-200 bg-green-50'
                  : 'border-[var(--color-border-default)]'
              }`}
            >
              <div className="font-medium text-[var(--color-text-primary)]">{facility.name}</div>
              {facility.ccn ? (
                <div className="text-xs text-[var(--color-text-tertiary)]">CCN: {facility.ccn}</div>
              ) : (
                <div className="text-xs text-red-600">No CCN - cannot import CMS data</div>
              )}
              {facility.rating && (
                <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {facility.rating} ★ CMS Rating
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinancialReconstructionContent({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Financial Reconstruction
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Build normalized T12 and identify distortions
          </p>
        </div>
        <Link
          href={`/app/deals/${dealId}/facilities/1`}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-white rounded-lg hover:bg-[var(--accent-solid-hover)] transition-colors"
        >
          Open Proforma Builder
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Normalization checklist */}
      <div className="card p-6">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Normalization Items</h3>
        <div className="space-y-4">
          {[
            {
              item: 'One-time expenses',
              status: 'identified',
              value: '-$125,000',
              notes: 'Legal fees for prior litigation',
            },
            {
              item: 'Owner-specific costs',
              status: 'identified',
              value: '-$85,000',
              notes: 'Owner vehicle, personal insurance',
            },
            {
              item: 'Management fee',
              status: 'review',
              value: 'At 4%',
              notes: 'Market is 5% - need adjustment',
            },
            {
              item: 'Staffing normalization',
              status: 'pending',
              value: null,
              notes: 'Need to analyze agency usage',
            },
          ].map((item) => (
            <div
              key={item.item}
              className="flex items-start gap-4 py-3 border-b border-[var(--color-border-default)] last:border-0"
            >
              <div
                className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                  item.status === 'identified'
                    ? 'bg-green-100 text-green-700'
                    : item.status === 'review'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.status}
              </div>
              <div className="flex-1">
                <div className="font-medium text-[var(--color-text-primary)]">{item.item}</div>
                <div className="text-sm text-[var(--color-text-tertiary)]">{item.notes}</div>
              </div>
              {item.value && (
                <div className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                  {item.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* T12 Summary */}
      <div className="card p-6">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-4">T12 Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--gray-50)] rounded-lg">
            <div className="text-sm text-[var(--color-text-tertiary)]">Reported Revenue</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">$18.7M</div>
          </div>
          <div className="p-4 bg-[var(--gray-50)] rounded-lg">
            <div className="text-sm text-[var(--color-text-tertiary)]">Reported EBITDAR</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">$3.2M</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-700">Normalized Revenue</div>
            <div className="text-2xl font-bold text-green-700">$18.7M</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-700">Normalized EBITDAR</div>
            <div className="text-2xl font-bold text-green-700">$3.41M</div>
            <div className="text-xs text-green-600">+$210K adjustment</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValuationContent({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Valuation</h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Determine appropriate pricing and structure
          </p>
        </div>
        <Link
          href={`/app/deals/${dealId}/valuation`}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-white rounded-lg hover:bg-[var(--accent-solid-hover)] transition-colors"
        >
          Open Valuation Engine
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="card p-6">
        <p className="text-[var(--color-text-tertiary)]">
          Complete prior stages to unlock valuation analysis with full context.
        </p>
      </div>
    </div>
  );
}

function DefaultStageContent({ stage }: { stage: AnalysisStage }) {
  const stageInfo = ANALYSIS_STAGES[stage];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {stageInfo.label}
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)]">{stageInfo.description}</p>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Key Questions</h3>
        <ul className="space-y-2">
          {stageInfo.key_questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-[var(--color-text-secondary)]">
              <span className="text-[var(--accent-solid)]">•</span>
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ProcessDrivenDealPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [currentStage, setCurrentStage] = useState<AnalysisStage>('financial_reconstruction');
  const [stageProgress, setStageProgress] = useState<AnalysisStageProgress[]>(mockStageProgress);

  const handleStageSelect = useCallback((stage: AnalysisStage) => {
    setCurrentStage(stage);
  }, []);

  const handleToolSelect = useCallback(
    (stage: AnalysisStage, toolHref: string) => {
      if (toolHref === 'documents') {
        // Stay on page, show documents section
      } else if (toolHref === 'facilities') {
        router.push(`/app/deals/${dealId}/facilities`);
      } else if (toolHref === 'valuation') {
        router.push(`/app/deals/${dealId}/valuation`);
      } else if (toolHref === 'proforma') {
        router.push(`/app/deals/${dealId}/facilities/1`);
      }
    },
    [dealId, router]
  );

  const handleStageStart = useCallback((stage: AnalysisStage) => {
    setStageProgress((prev) => [
      ...prev.filter((p) => p.stage !== stage),
      {
        id: `progress-${Date.now()}`,
        deal_id: dealId,
        stage,
        status: 'in_progress',
        started_at: new Date(),
        blockers: [],
      },
    ]);
    setCurrentStage(stage);
  }, [dealId]);

  const handleStageComplete = useCallback((stage: AnalysisStage, notes?: string) => {
    setStageProgress((prev) =>
      prev.map((p) =>
        p.stage === stage
          ? { ...p, status: 'completed' as StageStatus, completed_at: new Date(), notes }
          : p
      )
    );
  }, []);

  const handleStageBlock = useCallback((stage: AnalysisStage, blocker: string) => {
    setStageProgress((prev) =>
      prev.map((p) =>
        p.stage === stage
          ? { ...p, status: 'blocked' as StageStatus, blockers: [...(p.blockers || []), blocker] }
          : p
      )
    );
  }, []);

  // Render stage-specific content
  const renderStageContent = () => {
    switch (currentStage) {
      case 'document_understanding':
        return <DocumentUnderstandingContent dealId={dealId} />;
      case 'financial_reconstruction':
        return <FinancialReconstructionContent dealId={dealId} />;
      case 'valuation':
        return <ValuationContent dealId={dealId} />;
      default:
        return <DefaultStageContent stage={currentStage} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border-default)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/app/deals"
            className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {mockDeal.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {mockDeal.facilityCount} facilities · {mockDeal.totalBeds} beds
              </span>
              <span>Asking: ${(mockDeal.askingPrice / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <Link
            href={`/app/deals/${dealId}`}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Switch to Classic View
          </Link>
        </div>
      </div>

      {/* Process-driven layout */}
      <ProcessDrivenLayout
        dealId={dealId}
        currentStage={currentStage}
        stageProgress={stageProgress.map((p) => ({
          stage: p.stage,
          status: p.status,
          startedAt: p.started_at,
          completedAt: p.completed_at,
          notes: p.notes,
        }))}
        onStageSelect={handleStageSelect}
        onToolSelect={handleToolSelect}
        className="flex-1"
      >
        <div className="p-6">{renderStageContent()}</div>
      </ProcessDrivenLayout>
    </div>
  );
}
