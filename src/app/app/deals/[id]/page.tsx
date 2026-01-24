'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  type Deal,
  type AnalysisStage,
  type AnalysisStageProgress,
  type DealAssumption,
  type DealSynthesis,
  type DealDocument,
  type DealRisk,
  ANALYSIS_STAGES,
  DEAL_HYPOTHESES,
  generateDealId,
} from '@/lib/deals/types';
import {
  StageTracker,
  AssumptionsPanel,
  SynthesisBuilder,
  StageWalkthrough,
  type StageTool,
} from '@/components/deals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  Edit,
  ExternalLink,
  Upload,
  Plus,
  ArrowLeftRight,
  RefreshCw,
  BookOpen,
  ListChecks,
} from 'lucide-react';
import { SaleLeasebackDashboard } from '@/components/sale-leaseback/SaleLeasebackDashboard';
import {
  BuildingTabs,
  FacilityFinancialWrapper,
  PortfolioFinancialView,
  type FacilityTab,
} from '@/components/financials';
import { DealScoreCard } from '@/components/scoring';

// Default deal data (used as fallback)
const defaultDeal: Deal & { dealStructure?: string } = {
  id: '',
  deal_id: '',
  name: 'Loading...',
  asset_types: [],
  is_portfolio: false,
  facility_count: 0,
  total_beds: 0,
  states: [],
  source: 'other',
  source_name: '',
  received_date: new Date(),
  response_deadline: new Date(),
  initial_hypothesis: 'stabilized',
  current_hypothesis: 'stabilized',
  hypothesis_notes: '',
  status: 'active',
  current_stage: 'document_understanding',
  asking_price: 0,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: '',
  assigned_to: [],
  dealStructure: undefined,
};

// Type for API document response
interface ApiDocument {
  id: string;
  dealId: string;
  filename: string;
  type: string | null;
  status: string;
  rawText: string | null;
  extractedData: {
    aiAnalysis?: {
      summary: string;
      keyFindings: string[];
      confidence: number;
      documentType: string;
    };
    fields?: Record<string, { value: any; confidence: number; source?: string }>;
    sheets?: Record<string, any[][]>;
    values?: Array<{ field: string; value: any; confidence: number }>;
  } | null;
  processedAt: string | null;
  createdAt: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal & { dealStructure?: string }>(defaultDeal);
  const [stageProgress, setStageProgress] = useState<AnalysisStageProgress[]>([]);
  const [assumptions, setAssumptions] = useState<DealAssumption[]>([]);
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [apiDocuments, setApiDocuments] = useState<ApiDocument[]>([]);
  const [risks, setRisks] = useState<DealRisk[]>([]);
  const [synthesis, setSynthesis] = useState<DealSynthesis | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [facilityTabs, setFacilityTabs] = useState<FacilityTab[]>([]);
  const [cmsSyncing, setCmsSyncing] = useState(false);
  const [cmsSyncMessage, setCmsSyncMessage] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughMetrics, setWalkthroughMetrics] = useState<{
    agencyPercentage: number;
    occupancyTrend: 'up' | 'down' | 'stable';
    coverageRatio: number;
    unmappedItemCount: number;
  }>({
    agencyPercentage: 0,
    occupancyTrend: 'stable',
    coverageRatio: 0,
    unmappedItemCount: 0,
  });

  // Fetch deal data from API
  useEffect(() => {
    async function fetchDealData() {
      try {
        // Fetch deal details
        const dealResponse = await fetch(`/api/deals/${dealId}`);
        if (dealResponse.ok) {
          const dealData = await dealResponse.json();
          if (dealData.success && dealData.data) {
            const apiDeal = dealData.data;
            setDeal({
              id: apiDeal.id,
              deal_id: apiDeal.dealId || `CAS-${new Date().getFullYear()}-${apiDeal.id.slice(0, 4).toUpperCase()}`,
              name: apiDeal.name,
              asset_types: apiDeal.assetTypes || [],
              is_portfolio: (apiDeal.facilityCount || 0) > 1,
              facility_count: apiDeal.facilityCount || 1,
              total_beds: apiDeal.beds || 0,
              states: apiDeal.primaryState ? [apiDeal.primaryState] : [],
              source: 'broker',
              source_name: apiDeal.brokerFirm || apiDeal.brokerName || '',
              received_date: new Date(apiDeal.createdAt),
              response_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              initial_hypothesis: 'stabilized',
              current_hypothesis: 'stabilized',
              hypothesis_notes: '',
              status: apiDeal.status || 'active',
              current_stage: apiDeal.status === 'analyzing' ? 'document_understanding' : 'financial_reconstruction',
              asking_price: apiDeal.askingPrice || 0,
              created_at: new Date(apiDeal.createdAt),
              updated_at: new Date(apiDeal.updatedAt || apiDeal.createdAt),
              created_by: 'System',
              assigned_to: [],
              dealStructure: apiDeal.dealStructure || undefined,
            });

            // Fetch documents for this deal
            if (dealData.data.documents && dealData.data.documents.length > 0) {
              const docs: ApiDocument[] = dealData.data.documents;
              setApiDocuments(docs);

              // Convert API documents to DealDocument format
              const validCategories = ['financials', 'rent_roll', 'survey', 'license', 'lease', 'other'] as const;
              const dealDocs: DealDocument[] = docs.map((doc) => ({
                id: doc.id,
                deal_id: doc.dealId,
                name: doc.filename,
                type: doc.filename.endsWith('.pdf') ? 'pdf' : doc.filename.endsWith('.xlsx') || doc.filename.endsWith('.xls') ? 'excel' : 'other',
                category: (validCategories.includes(doc.type as typeof validCategories[number]) ? doc.type : 'other') as 'financials' | 'rent_roll' | 'survey' | 'license' | 'lease' | 'other',
                size: 0,
                extracted: doc.status === 'complete',
                extraction_confidence: doc.extractedData?.aiAnalysis?.confidence || 0,
                uploaded_at: new Date(doc.createdAt),
                uploaded_by: 'System',
              }));
              setDocuments(dealDocs);
            }
          }
        }

        // Fetch facilities for this deal
        const facilitiesResponse = await fetch(`/api/deals/${dealId}/facilities`);
        if (facilitiesResponse.ok) {
          const facilitiesData = await facilitiesResponse.json();
          if (facilitiesData.success && facilitiesData.data) {
            const tabs: FacilityTab[] = facilitiesData.data.map((f: any) => ({
              id: f.id,
              name: f.name,
              beds: f.licensedBeds || f.certifiedBeds || 0,
              occupancy: f.currentOccupancy ?? 0,
              ebitda: f.trailingTwelveMonthEbitda || 0,
              // Include CMS data for display
              cmsRating: f.cmsRating,
              healthRating: f.healthRating,
              staffingRating: f.staffingRating,
              qualityRating: f.qualityRating,
              isSff: f.isSff,
            }));
            setFacilityTabs(tabs);
            // Default to Portfolio view (null) instead of first facility
            // This ensures Portfolio is always the default entity shown
            setSelectedFacilityId(null);
          }
        }

        // Fetch stage progress for this deal
        const stagesResponse = await fetch(`/api/deals/${dealId}/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          if (stagesData.success && stagesData.data?.stages) {
            const apiStages: AnalysisStageProgress[] = stagesData.data.stages.map((s: any) => ({
              id: s.id,
              deal_id: dealId,
              stage: s.stage,
              status: s.status || 'not_started',
              started_at: s.startedAt ? new Date(s.startedAt) : undefined,
              completed_at: s.completedAt ? new Date(s.completedAt) : undefined,
              notes: s.stageData?.notes,
              blockers: s.stageData?.blockers || [],
            }));
            setStageProgress(apiStages);

            // Load completed tasks from all stages' stageData
            const allCompletedTasks: Record<string, boolean> = {};
            stagesData.data.stages.forEach((s: any) => {
              if (s.stageData?.completedTasks) {
                Object.assign(allCompletedTasks, s.stageData.completedTasks);
              }
            });
            setCompletedTasks(allCompletedTasks);

            // Set current stage from API
            if (stagesData.data.currentStage) {
              setDeal((prev) => ({
                ...prev,
                current_stage: stagesData.data.currentStage.stage as AnalysisStage,
              }));
            }
          } else {
            // Initialize first stage if no stages exist
            const firstStage: AnalysisStageProgress = {
              id: Date.now().toString(),
              deal_id: dealId,
              stage: 'document_understanding',
              status: 'in_progress',
              started_at: new Date(),
            };
            setStageProgress([firstStage]);
          }
        }

        // Fetch walkthrough metrics
        const metricsResponse = await fetch(`/api/deals/${dealId}/walkthrough-metrics`);
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          if (metricsData.success && metricsData.data) {
            setWalkthroughMetrics(metricsData.data);
          }
        }

      } catch (error) {
        console.error('Failed to fetch deal data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDealData();
  }, [dealId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStageStart = async (stage: AnalysisStage) => {
    // Update local state immediately for UI responsiveness
    const existingProgress = stageProgress.find((p) => p.stage === stage);
    if (existingProgress) {
      setStageProgress((prev) =>
        prev.map((p) =>
          p.stage === stage ? { ...p, status: 'in_progress', started_at: new Date() } : p
        )
      );
    } else {
      setStageProgress((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          deal_id: deal.id,
          stage,
          status: 'in_progress',
          started_at: new Date(),
        },
      ]);
    }
    setDeal((prev) => ({ ...prev, current_stage: stage }));

    // Persist to database
    try {
      const existingStage = stageProgress.find((p) => p.stage === stage);
      if (existingStage?.id) {
        await fetch(`/api/deals/${dealId}/stages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: existingStage.id,
            status: 'in_progress',
          }),
        });
      }
    } catch (error) {
      console.error('Failed to persist stage start:', error);
    }
  };

  const handleStageComplete = async (stage: AnalysisStage, notes?: string) => {
    // Update local state immediately
    setStageProgress((prev) =>
      prev.map((p) =>
        p.stage === stage
          ? { ...p, status: 'completed', completed_at: new Date(), notes: notes || p.notes }
          : p
      )
    );

    // Advance to next stage if not at synthesis
    const stageOrder = Object.keys(ANALYSIS_STAGES) as AnalysisStage[];
    const currentIndex = stageOrder.indexOf(stage);
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      setDeal((prev) => ({ ...prev, current_stage: nextStage }));

      // Auto-start next stage in local state
      const existingNextProgress = stageProgress.find((p) => p.stage === nextStage);
      if (!existingNextProgress || existingNextProgress.status === 'not_started') {
        setStageProgress((prev) => {
          const updated = prev.filter((p) => p.stage !== nextStage);
          return [
            ...updated,
            {
              id: Date.now().toString(),
              deal_id: deal.id,
              stage: nextStage,
              status: 'in_progress',
              started_at: new Date(),
            },
          ];
        });
      }
    }

    // Persist to database
    try {
      const existingStage = stageProgress.find((p) => p.stage === stage);
      if (existingStage?.id) {
        await fetch(`/api/deals/${dealId}/stages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: existingStage.id,
            status: 'completed',
            stageData: notes ? { notes } : undefined,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to persist stage completion:', error);
    }
  };

  const handleStageBlock = async (stage: AnalysisStage, blocker: string) => {
    // Update local state
    setStageProgress((prev) =>
      prev.map((p) =>
        p.stage === stage
          ? { ...p, status: 'blocked', blockers: [...(p.blockers || []), blocker] }
          : p
      )
    );

    // Persist to database
    try {
      const existingStage = stageProgress.find((p) => p.stage === stage);
      if (existingStage?.id) {
        await fetch(`/api/deals/${dealId}/stages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: existingStage.id,
            status: 'blocked',
            stageData: {
              blockers: [...(existingStage.blockers || []), blocker],
            },
          }),
        });
      }
    } catch (error) {
      console.error('Failed to persist stage block:', error);
    }
  };

  const handleNavigateToStage = (stage: AnalysisStage) => {
    // Navigate to the appropriate tab/section for that stage
    if (stage === 'synthesis') {
      setActiveTab('synthesis');
    } else if (stage === 'document_understanding') {
      setActiveTab('documents');
    } else if (stage === 'risk_constraints') {
      setActiveTab('risks');
    } else {
      setActiveTab('overview');
    }
  };

  const handleAddAssumption = (assumption: Omit<DealAssumption, 'id' | 'deal_id' | 'created_at'>) => {
    const newAssumption: DealAssumption = {
      ...assumption,
      id: Date.now().toString(),
      deal_id: deal.id,
      created_at: new Date(),
    };
    setAssumptions((prev) => [...prev, newAssumption]);
  };

  const handleUpdateAssumption = (id: string, updates: Partial<DealAssumption>) => {
    setAssumptions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleDeleteAssumption = (id: string) => {
    setAssumptions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveSynthesis = (newSynthesis: Omit<DealSynthesis, 'id' | 'deal_id' | 'created_at'>) => {
    setSynthesis({
      ...newSynthesis,
      id: synthesis?.id || Date.now().toString(),
      deal_id: deal.id,
      created_at: synthesis?.created_at || new Date(),
    });
  };

  // Handle task completion in walkthrough
  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    // Update local state immediately for responsiveness
    const newCompletedTasks = {
      ...completedTasks,
      [taskId]: completed,
    };
    setCompletedTasks(newCompletedTasks);

    // Find the current stage to persist to
    const currentStageProgress = stageProgress.find(
      (s) => s.stage === deal.current_stage
    );

    if (currentStageProgress?.id) {
      try {
        // Get existing stageData and merge with new completed tasks
        const existingStageData = stageProgress.find(
          (s) => s.id === currentStageProgress.id
        );
        const currentStageData = {
          notes: existingStageData?.notes || '',
          blockers: existingStageData?.blockers || [],
          completedTasks: newCompletedTasks,
        };

        await fetch(`/api/deals/${dealId}/stages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: currentStageProgress.id,
            stageData: currentStageData,
          }),
        });
      } catch (error) {
        console.error('Failed to persist task completion:', error);
      }
    }
  };

  // Handle tool actions from walkthrough
  const handleToolAction = (tool: StageTool) => {
    switch (tool) {
      case 'view_documents':
        setActiveTab('documents');
        break;
      case 'extract_financials':
        setActiveTab('documents');
        // Could trigger extraction
        break;
      case 'verify_facilities':
        // Could open facility verification modal
        handleSyncCMS();
        break;
      case 'map_coa':
        setActiveTab('financials');
        break;
      case 'review_census':
      case 'review_ppd':
      case 'review_pl':
        setActiveTab('financials');
        break;
      case 'sync_cms':
        handleSyncCMS();
        break;
      case 'review_survey':
        // Could open survey review modal or external link
        break;
      case 'add_risk':
        setActiveTab('risks');
        break;
      case 'run_valuation':
        if (deal.dealStructure === 'sale_leaseback') {
          setActiveTab('sale-leaseback');
        } else {
          setActiveTab('financials');
        }
        break;
      case 'review_proforma':
        setActiveTab('financials');
        break;
      case 'generate_synthesis':
      case 'export_report':
        setActiveTab('synthesis');
        break;
      default:
        console.log('Tool action:', tool);
    }
  };

  // Sync all facilities in deal with CMS data
  const handleSyncCMS = async () => {
    setCmsSyncing(true);
    setCmsSyncMessage(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/sync-cms`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setCmsSyncMessage(`Synced ${result.data.synced} facilities. ${result.data.notFound > 0 ? `${result.data.notFound} not found in CMS.` : ''}`);

        // Refresh facilities data
        const facilitiesResponse = await fetch(`/api/deals/${dealId}/facilities`);
        if (facilitiesResponse.ok) {
          const facilitiesData = await facilitiesResponse.json();
          if (facilitiesData.success && facilitiesData.data) {
            const tabs: FacilityTab[] = facilitiesData.data.map((f: any) => ({
              id: f.id,
              name: f.name,
              beds: f.licensedBeds || 0,
              occupancy: f.currentOccupancy || 0,
              ebitda: f.trailingTwelveMonthEbitda || 0,
            }));
            setFacilityTabs(tabs);
          }
        }
      } else {
        setCmsSyncMessage(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      setCmsSyncMessage('Sync failed: Network error');
    } finally {
      setCmsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setCmsSyncMessage(null), 5000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-2"></div>
            <div className="h-4 w-96 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                  <div className="h-8 w-32 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Deal not found
  if (!deal.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deal Not Found</h1>
            <p className="text-muted-foreground">The deal you're looking for doesn't exist.</p>
          </div>
        </div>
        <Link href="/app/deals">
          <Button>Back to Deals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{deal.name}</h1>
              <Badge variant="outline">{deal.deal_id}</Badge>
              <Badge
                className={
                  deal.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : deal.status === 'under_loi'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {deal.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {deal.asset_types.map((t) => t.toUpperCase()).join(', ')} ·{' '}
                {deal.facility_count} {deal.facility_count === 1 ? 'facility' : 'facilities'} ·{' '}
                {deal.total_beds} beds
              </span>
              <span>|</span>
              <span>{deal.states?.join(', ')}</span>
              <span>|</span>
              <span>
                Source: {deal.source_name || deal.source}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-1" />
            Edit Deal
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncCMS}
            disabled={cmsSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${cmsSyncing ? 'animate-spin' : ''}`} />
            {cmsSyncing ? 'Syncing...' : 'Sync CMS'}
          </Button>
          {cmsSyncMessage && (
            <span className="text-sm text-muted-foreground ml-2">{cmsSyncMessage}</span>
          )}
          {deal.dealStructure === 'sale_leaseback' && (
            <Link href={`/app/deals/${deal.id}/sale-leaseback`}>
              <Button variant="outline">
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                Full SLB Analysis
              </Button>
            </Link>
          )}
          <Link href="/app/sandbox">
            <Button>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Proforma
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Asking Price</div>
            <div className="text-2xl font-bold">
              {deal.asking_price ? formatCurrency(deal.asking_price) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Hypothesis</div>
            <div className="text-lg font-medium mt-1">
              {DEAL_HYPOTHESES[deal.current_hypothesis || deal.initial_hypothesis].label}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Current Stage</div>
            <div className="text-lg font-medium mt-1">
              {ANALYSIS_STAGES[deal.current_stage || 'document_understanding']?.label || 'Document Understanding'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Response Deadline</div>
            <div className="text-lg font-medium mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {deal.response_deadline
                ? deal.response_deadline.toLocaleDateString()
                : 'Not set'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className={showWalkthrough ? 'space-y-6' : 'grid grid-cols-3 gap-6'}>
        {/* Left Column - Stage Tracker or Full Walkthrough */}
        {showWalkthrough ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Analysis Walkthrough
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWalkthrough(false)}
              >
                <ListChecks className="h-4 w-4 mr-1" />
                Compact View
              </Button>
            </div>
            <StageWalkthrough
              dealId={deal.id}
              currentStage={deal.current_stage || 'document_understanding'}
              completedTasks={completedTasks}
              onTaskComplete={handleTaskComplete}
              onStageComplete={(stage) => handleStageComplete(stage)}
              onNavigateToStage={handleNavigateToStage}
              onToolAction={handleToolAction}
              documentCount={documents.length}
              hasFinancials={documents.some((d) => d.category === 'financials')}
              hasCensusData={facilityTabs.some((f) => f.occupancy && f.occupancy > 0)}
              agencyPercentage={walkthroughMetrics.agencyPercentage}
              isSff={facilityTabs.some((f: any) => f.isSff)}
              occupancyTrend={walkthroughMetrics.occupancyTrend}
              coverageRatio={walkthroughMetrics.coverageRatio}
              unmappedItemCount={walkthroughMetrics.unmappedItemCount}
            />
          </div>
        ) : (
          <div className="col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stage Progress</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWalkthrough(true)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Full Guide
              </Button>
            </div>
            <StageTracker
              dealId={deal.id}
              currentStage={deal.current_stage || 'document_understanding'}
              stageProgress={stageProgress}
              onStageStart={handleStageStart}
              onStageComplete={handleStageComplete}
              onStageBlock={handleStageBlock}
              onNavigateToStage={handleNavigateToStage}
            />
          </div>
        )}

        {/* Right Column - Tabbed Content */}
        <div className={showWalkthrough ? '' : 'col-span-2'}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="assumptions">
                Assumptions ({assumptions.length})
              </TabsTrigger>
              <TabsTrigger value="risks">
                Risks ({risks.length})
              </TabsTrigger>
              <TabsTrigger value="synthesis">Synthesis</TabsTrigger>
              <TabsTrigger value="financials" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Financials
              </TabsTrigger>
              {deal.dealStructure === 'sale_leaseback' && (
                <TabsTrigger value="sale-leaseback" className="flex items-center gap-1">
                  <ArrowLeftRight className="h-4 w-4" />
                  Sale-Leaseback
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Deal Score Card */}
              <DealScoreCard dealId={deal.id} />

              <Card>
                <CardHeader>
                  <CardTitle>Hypothesis Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{deal.hypothesis_notes || 'No notes added yet.'}</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">High-Risk Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      {assumptions.filter((a) => a.confidence === 'low' && a.impact === 'high').length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Low confidence, high impact
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Critical Risks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {risks.filter((r) => r.severity === 'critical' || r.severity === 'high').length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      High or critical severity
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {deal.assigned_to?.map((person) => (
                      <Badge key={person} variant="secondary">
                        {person}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Documents</CardTitle>
                      <CardDescription>
                        Uploaded deal materials and AI-extracted data
                      </CardDescription>
                    </div>
                    <Link href="/upload">
                      <Button>
                        <Upload className="h-4 w-4 mr-1" />
                        Upload Document
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No documents uploaded yet</p>
                      <Link href="/upload">
                        <Button variant="outline" className="mt-4">
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Documents
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {apiDocuments.map((doc) => {
                        const aiAnalysis = doc.extractedData?.aiAnalysis;
                        const fields = doc.extractedData?.fields;

                        return (
                          <div
                            key={doc.id}
                            className="border rounded-lg overflow-hidden"
                          >
                            {/* Document Header */}
                            <div className="flex items-center justify-between p-3 bg-muted/30">
                              <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{doc.filename}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.type || 'Unknown type'} · Status: {doc.status} ·{' '}
                                    Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.status === 'complete' && aiAnalysis ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    AI Analyzed ({Math.round((aiAnalysis.confidence || 0) * 100)}%)
                                  </Badge>
                                ) : doc.status === 'analyzing' ? (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    Analyzing...
                                  </Badge>
                                ) : doc.status === 'error' ? (
                                  <Badge variant="destructive">
                                    Error
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">{doc.status}</Badge>
                                )}
                              </div>
                            </div>

                            {/* AI Analysis Results */}
                            {doc.status === 'complete' && aiAnalysis && (
                              <div className="p-4 border-t space-y-4">
                                {/* Summary */}
                                <div>
                                  <h4 className="text-sm font-medium mb-1">AI Summary</h4>
                                  <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                                </div>

                                {/* Key Findings */}
                                {aiAnalysis.keyFindings && aiAnalysis.keyFindings.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Key Findings</h4>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                      {aiAnalysis.keyFindings.map((finding, i) => (
                                        <li key={i}>{finding}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Extracted Fields */}
                                {fields && Object.keys(fields).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Extracted Data</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {Object.entries(fields).slice(0, 12).map(([key, data]) => (
                                        <div key={key} className="bg-muted/30 rounded p-2">
                                          <p className="text-xs text-muted-foreground truncate">{key.replace(/_/g, ' ')}</p>
                                          <p className="text-sm font-medium truncate">
                                            {typeof data.value === 'number'
                                              ? data.value.toLocaleString()
                                              : String(data.value || '—')}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {Math.round((data.confidence || 0) * 100)}% confidence
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                    {Object.keys(fields).length > 12 && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        +{Object.keys(fields).length - 12} more fields extracted
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assumptions Tab */}
            <TabsContent value="assumptions" className="mt-4">
              <AssumptionsPanel
                dealId={deal.id}
                currentStage={deal.current_stage || 'document_understanding'}
                assumptions={assumptions}
                onAddAssumption={handleAddAssumption}
                onUpdateAssumption={handleUpdateAssumption}
                onDeleteAssumption={handleDeleteAssumption}
              />
            </TabsContent>

            {/* Risks Tab */}
            <TabsContent value="risks" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Identified Risks</CardTitle>
                      <CardDescription>
                        Risks and concerns discovered during analysis
                      </CardDescription>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Risk
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {risks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`p-4 border rounded-lg ${
                          risk.is_deal_breaker ? 'border-red-300 bg-red-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle
                              className={`h-5 w-5 mt-0.5 ${
                                risk.severity === 'critical'
                                  ? 'text-red-600'
                                  : risk.severity === 'high'
                                  ? 'text-orange-600'
                                  : risk.severity === 'medium'
                                  ? 'text-amber-600'
                                  : 'text-blue-600'
                              }`}
                            />
                            <div>
                              <h4 className="font-medium">{risk.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {risk.description}
                              </p>
                              {risk.mitigation && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Mitigation: </span>
                                  {risk.mitigation}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{risk.category}</Badge>
                            <Badge
                              className={
                                risk.severity === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : risk.severity === 'high'
                                  ? 'bg-orange-100 text-orange-800'
                                  : risk.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {risk.severity}
                            </Badge>
                            {risk.is_deal_breaker && (
                              <Badge variant="destructive">Deal Breaker</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Synthesis Tab */}
            <TabsContent value="synthesis" className="mt-4">
              <SynthesisBuilder
                dealId={deal.id}
                dealName={deal.name}
                initialHypothesis={deal.initial_hypothesis}
                currentHypothesis={deal.current_hypothesis}
                askingPrice={deal.asking_price}
                synthesis={synthesis}
                onSaveSynthesis={handleSaveSynthesis}
              />
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="mt-4 space-y-4">
              <BuildingTabs
                facilities={facilityTabs}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={setSelectedFacilityId}
              />

              {selectedFacilityId === null ? (
                <PortfolioFinancialView
                  facilities={facilityTabs.map((f) => ({
                    facilityId: f.id,
                    facilityName: f.name,
                    beds: f.beds,
                    // Use actual occupancy - don't default to fake 85%
                    totalDays: Math.round(f.beds * 365 * (f.occupancy ?? 0)),
                    occupancy: f.occupancy ?? 0,
                    totalRevenue: 0,
                    totalExpenses: 0,
                    ebitdar: 0,
                    ebitda: f.ebitda ?? 0,
                    blendedPPD: 0,
                    censusByPayer: {
                      medicarePartADays: 0,
                      medicareAdvantageDays: 0,
                      managedCareDays: 0,
                      medicaidDays: 0,
                      managedMedicaidDays: 0,
                      privateDays: 0,
                      vaContractDays: 0,
                      hospiceDays: 0,
                      otherDays: 0,
                    },
                    revenueByPayer: {
                      medicarePartA: 0,
                      medicareAdvantage: 0,
                      managedCare: 0,
                      medicaid: 0,
                      managedMedicaid: 0,
                      private: 0,
                      vaContract: 0,
                      hospice: 0,
                      other: 0,
                      ancillary: 0,
                      therapy: 0,
                      total: 0,
                    },
                  }))}
                />
              ) : (
                <FacilityFinancialWrapper
                  facilityId={selectedFacilityId}
                  facilityName={facilityTabs.find((f) => f.id === selectedFacilityId)?.name || 'Facility'}
                  dealId={deal.id}
                />
              )}
            </TabsContent>

            {/* Sale-Leaseback Tab */}
            {deal.dealStructure === 'sale_leaseback' && (
              <TabsContent value="sale-leaseback" className="mt-4">
                <SaleLeasebackDashboard dealId={deal.id} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
