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
  Activity,
  Download,
} from 'lucide-react';
import { WorkbenchLayout } from '@/components/deal-workbench/WorkbenchLayout';
import { SaleLeasebackDashboard } from '@/components/sale-leaseback/SaleLeasebackDashboard';
import {
  BuildingTabs,
  FacilityFinancialWrapper,
  PortfolioFinancialView,
  type FacilityTab,
} from '@/components/financials';
import { DecisionDashboard } from '@/components/decision';
import { QualityDashboard } from '@/components/quality';
import { DealScoreCard } from '@/components/scoring';
import { PortfolioFacilitiesOverview } from '@/components/deals/portfolio-facilities-overview';
import { RentSuggestionCard } from '@/components/slb/rent-suggestion-card';
import { DealChatPanel } from '@/components/deal-command/DealChatPanel';
import { DealMetricsBar } from '@/components/deal-command/DealMetricsBar';
import { AnalysisProgressCard } from '@/components/deal-command/AnalysisProgressCard';
import { ValuationHero } from '@/components/deal-command/ValuationHero';
import { DealNotifications } from '@/components/deal-command/DealNotifications';
import { ValuationBreakdownWrapper } from '@/components/valuation/ValuationBreakdownWrapper';
import { DocOverviewCard } from '@/components/documents/DocOverviewCard';
import { DocUploadWithAnalysis } from '@/components/documents/DocUploadWithAnalysis';
import type { PortfolioRentSuggestion, SLBAssumptions } from '@/lib/sale-leaseback/types';

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
  aiSummary?: string | null;
  aiKeyFindings?: string[] | null;
  pendingClarifications?: number;
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
  // Store full facility data with census and rates for PortfolioFinancialView
  const [fullFacilityData, setFullFacilityData] = useState<any[]>([]);
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
  const [rentSuggestions, setRentSuggestions] = useState<PortfolioRentSuggestion | null>(null);
  const [rentSuggestionsLoading, setRentSuggestionsLoading] = useState(false);
  const [dealScore, setDealScore] = useState<{ score: number; confidence: number; risks: string[] } | null>(null);

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
              is_portfolio: (apiDeal.facilities?.length || 0) > 1,
              facility_count: apiDeal.facilities?.length || 1,
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
            // Store full facility data for financial views
            setFullFacilityData(facilitiesData.data);

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

        // Fetch rent suggestions
        setRentSuggestionsLoading(true);
        const rentResponse = await fetch(`/api/deals/${dealId}/rent-suggestions`);
        if (rentResponse.ok) {
          const rentData = await rentResponse.json();
          if (rentData.success && rentData.data) {
            // Transform API response to PortfolioRentSuggestion format
            const portfolio = rentData.data.portfolio;
            const facilities = rentData.data.facilities;
            setRentSuggestions({
              facilities: facilities || [],
              portfolioTotal: portfolio || {
                totalRevenue: 0,
                totalExpenses: 0,
                totalEbitdar: 0,
                totalNoi: 0,
                totalPurchasePrice: 0,
                totalAnnualRent: 0,
                totalMonthlyRent: 0,
                totalBeds: 0,
                weightedCoverage: 0,
                weightedCapRate: 0,
                blendedPricePerBed: 0,
                purchasePriceRange: { low: 0, mid: 0, high: 0 },
                annualRentRange: { low: 0, mid: 0, high: 0 },
                facilitiesWithFinancials: 0,
                facilitiesWithPricePerBed: 0,
              },
              assumptions: rentData.data.assumptions || { capRate: 0.075, yield: 0.085, minCoverage: 1.4 },
            });
          }
        }
        setRentSuggestionsLoading(false);

        // Fetch deal score for metrics bar
        try {
          const scoreResponse = await fetch(`/api/deals/${dealId}/score`);
          if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();
            if (scoreData.success && scoreData.data) {
              setDealScore({
                score: scoreData.data.portfolioScore || 0,
                confidence: scoreData.data.confidenceScore || 0,
                risks: scoreData.data.riskFactors || [],
              });
            }
          }
        } catch {
          // Score is optional, non-blocking
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
            // Store full facility data for financial views
            setFullFacilityData(facilitiesData.data);

            const tabs: FacilityTab[] = facilitiesData.data.map((f: any) => ({
              id: f.id,
              name: f.name,
              beds: f.licensedBeds || f.certifiedBeds || 0,
              occupancy: f.currentOccupancy || 0,
              ebitda: f.trailingTwelveMonthEbitda || 0,
              cmsRating: f.cmsRating,
              healthRating: f.healthRating,
              staffingRating: f.staffingRating,
              qualityRating: f.qualityRating,
              isSff: f.isSff,
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

  // Compute stage info for workbench
  const currentStageKey = deal.current_stage || 'document_understanding';
  const stageLabels: Record<string, { label: string; position: number }> = {
    document_understanding: { label: 'Doc Review', position: 1 },
    financial_reconstruction: { label: 'Financial', position: 2 },
    operating_reality: { label: 'Operations', position: 3 },
    risk_constraints: { label: 'Risk', position: 4 },
    valuation: { label: 'Valuation', position: 5 },
    synthesis: { label: 'Synthesis', position: 6 },
  };
  const currentStageInfo = stageLabels[currentStageKey] || { label: 'Review', position: 1 };

  return (
    <WorkbenchLayout
      dealId={deal.id}
      name={deal.name}
      assetType={deal.asset_types?.[0] || 'SNF'}
      askingPrice={deal.asking_price || 0}
      totalBeds={deal.total_beds || 0}
      stage={currentStageKey}
      stageLabel={currentStageInfo.label}
      stagePosition={currentStageInfo.position}
      status={deal.status || 'active'}
      score={dealScore?.score}
      currentStage={currentStageKey}
      stageProgress={stageProgress.map(s => ({ stage: s.stage, status: s.status }))}
      onStageClick={(stage) => handleNavigateToStage(stage as AnalysisStage)}
      documentCount={documents.length}
      riskCount={risks.length}
      hasFinancials={documents.some(d => d.category === 'financials')}
    >
      {/* Tabs Content (now inside workbench canvas) */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start mb-4 bg-surface-800/30 border border-surface-700/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Docs ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="financials">
            Financials
          </TabsTrigger>
          <TabsTrigger value="risks">
            Risks ({risks.length})
          </TabsTrigger>
          <TabsTrigger value="synthesis">Synthesis</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          {deal.dealStructure === 'sale_leaseback' && (
            <TabsTrigger value="sale-leaseback">SLB</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Valuation Hero */}
              <ValuationHero
                askingPrice={deal.asking_price || undefined}
                valuationLow={rentSuggestions?.portfolioTotal?.purchasePriceRange?.low}
                valuationMid={rentSuggestions?.portfolioTotal?.purchasePriceRange?.mid}
                valuationHigh={rentSuggestions?.portfolioTotal?.purchasePriceRange?.high}
                confidence={dealScore?.confidence}
                totalBeds={deal.total_beds}
                perBedLow={rentSuggestions?.portfolioTotal?.purchasePriceRange?.low && deal.total_beds ? rentSuggestions.portfolioTotal.purchasePriceRange.low / deal.total_beds : undefined}
                perBedMid={rentSuggestions?.portfolioTotal?.purchasePriceRange?.mid && deal.total_beds ? rentSuggestions.portfolioTotal.purchasePriceRange.mid / deal.total_beds : undefined}
                perBedHigh={rentSuggestions?.portfolioTotal?.purchasePriceRange?.high && deal.total_beds ? rentSuggestions.portfolioTotal.purchasePriceRange.high / deal.total_beds : undefined}
              />

              {/* Deal Score Card */}
              <DealScoreCard dealId={deal.id} />

              {/* Rent Suggestions - Show for deals with financial data */}
              <RentSuggestionCard
                portfolioData={rentSuggestions}
                isLoading={rentSuggestionsLoading}
                onAssumptionsChange={async (newAssumptions: SLBAssumptions) => {
                  // Refetch with new assumptions
                  setRentSuggestionsLoading(true);
                  try {
                    const response = await fetch(
                      `/api/deals/${deal.id}/rent-suggestions?capRate=${newAssumptions.capRate}&yield=${newAssumptions.yield}&minCoverage=${newAssumptions.minCoverage}`
                    );
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.data) {
                        setRentSuggestions({
                          facilities: data.data.facilities || [],
                          portfolioTotal: data.data.portfolio || rentSuggestions?.portfolioTotal,
                          assumptions: data.data.assumptions || newAssumptions,
                        });
                      }
                    }
                  } finally {
                    setRentSuggestionsLoading(false);
                  }
                }}
              />

              {/* Portfolio & Facilities Overview */}
              {facilityTabs.length > 0 && (
                <PortfolioFacilitiesOverview facilities={facilityTabs} />
              )}

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
            <TabsContent value="documents" className="mt-4 space-y-4">
              {/* Inline Upload with AI Analysis */}
              <DocUploadWithAnalysis
                dealId={deal.id}
                onDocumentUploaded={() => {
                  // Refresh documents list
                  fetch(`/api/deals/${deal.id}/documents`)
                    .then(r => r.json())
                    .then(data => {
                      if (data.documents) setApiDocuments(data.documents);
                    })
                    .catch(() => {});
                }}
              />

              {/* Document List with AI Summaries */}
              {apiDocuments.length > 0 ? (
                <div className="space-y-2">
                  {apiDocuments.map((doc) => {
                    const aiAnalysis = (doc.extractedData as any)?.aiAnalysis;
                    const fields = (doc.extractedData as any)?.fields;

                    return (
                      <DocOverviewCard
                        key={doc.id}
                        documentId={doc.id}
                        filename={doc.filename}
                        docType={doc.type || 'other'}
                        status={doc.status || 'uploaded'}
                        uploadedAt={doc.createdAt || new Date().toISOString()}
                        summary={doc.aiSummary || aiAnalysis?.summary}
                        keyFindings={(doc.aiKeyFindings as string[]) || aiAnalysis?.keyFindings}
                        confidence={aiAnalysis?.confidence}
                        extractedFields={fields}
                        pendingClarifications={doc.pendingClarifications}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="neu-card p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
                  <p className="text-sm text-surface-500">No documents uploaded yet</p>
                  <p className="text-xs text-surface-400 mt-1">
                    Drop files above to start AI-powered analysis
                  </p>
                </div>
              )}
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
                  dealId={deal.id}
                  dealName={deal.name}
                  facilities={fullFacilityData.map((f: any) => {
                    const census = f.latestCensus || {};
                    const rates = f.currentRates || {};
                    const beds = f.licensedBeds || f.certifiedBeds || 0;

                    // Calculate census by payer
                    const censusByPayer = {
                      medicarePartADays: census.medicarePartADays || 0,
                      medicareAdvantageDays: census.medicareAdvantageDays || 0,
                      managedCareDays: census.managedCareDays || 0,
                      medicaidDays: census.medicaidDays || 0,
                      managedMedicaidDays: census.managedMedicaidDays || 0,
                      privateDays: census.privateDays || 0,
                      vaContractDays: census.vaContractDays || 0,
                      hospiceDays: census.hospiceDays || 0,
                      otherDays: census.otherDays || 0,
                    };

                    const totalDays =
                      censusByPayer.medicarePartADays +
                      censusByPayer.medicareAdvantageDays +
                      censusByPayer.managedCareDays +
                      censusByPayer.medicaidDays +
                      censusByPayer.managedMedicaidDays +
                      censusByPayer.privateDays +
                      censusByPayer.vaContractDays +
                      censusByPayer.hospiceDays +
                      censusByPayer.otherDays;

                    // Calculate revenue by payer (census × PPD rates)
                    const revenueByPayer = {
                      medicarePartA: censusByPayer.medicarePartADays * (Number(rates.medicarePartAPpd) || 625),
                      medicareAdvantage: censusByPayer.medicareAdvantageDays * (Number(rates.medicareAdvantagePpd) || 480),
                      managedCare: censusByPayer.managedCareDays * (Number(rates.managedCarePpd) || 420),
                      medicaid: censusByPayer.medicaidDays * (Number(rates.medicaidPpd) || 185),
                      managedMedicaid: censusByPayer.managedMedicaidDays * (Number(rates.managedMedicaidPpd) || 195),
                      private: censusByPayer.privateDays * (Number(rates.privatePpd) || 285),
                      vaContract: censusByPayer.vaContractDays * (Number(rates.vaContractPpd) || 310),
                      hospice: censusByPayer.hospiceDays * (Number(rates.hospicePpd) || 175),
                      other: censusByPayer.otherDays * 200, // Default other PPD
                      ancillary: totalDays * (Number(rates.ancillaryRevenuePpd) || 20),
                      therapy: totalDays * (Number(rates.therapyRevenuePpd) || 5),
                      total: 0,
                    };
                    revenueByPayer.total = Object.values(revenueByPayer).reduce((a, b) => a + b, 0);

                    // Total revenue from extracted financials or calculated
                    const totalRevenue = f.trailingTwelveMonthRevenue || revenueByPayer.total;

                    // Calculate expenses (typically 80-85% of revenue for SNFs)
                    const ebitdar = f.trailingTwelveMonthEbitda || totalRevenue * 0.18;
                    const totalExpenses = totalRevenue - ebitdar;
                    const ebitda = f.trailingTwelveMonthEbitda || ebitdar * 0.6;

                    // Blended PPD
                    const blendedPPD = totalDays > 0 ? totalRevenue / totalDays : 0;

                    return {
                      facilityId: f.id,
                      facilityName: f.name,
                      beds,
                      totalDays: totalDays || Math.round(beds * 365 * (f.currentOccupancy ?? 0)),
                      occupancy: f.currentOccupancy ?? 0,
                      totalRevenue,
                      totalExpenses,
                      ebitdar,
                      ebitda,
                      blendedPPD,
                      censusByPayer,
                      revenueByPayer,
                    };
                  })}
                />
              ) : (
                <FacilityFinancialWrapper
                  facilityId={selectedFacilityId}
                  facilityName={facilityTabs.find((f) => f.id === selectedFacilityId)?.name || 'Facility'}
                  dealId={deal.id}
                />
              )}
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-4 space-y-4">
              <ValuationBreakdownWrapper dealId={deal.id} />
              <DecisionDashboard dealId={deal.id} />
            </TabsContent>

            {/* Quality Tab */}
            <TabsContent value="quality" className="mt-4">
              <QualityDashboard dealId={deal.id} />
            </TabsContent>

            {/* Sale-Leaseback Tab */}
            {deal.dealStructure === 'sale_leaseback' && (
              <TabsContent value="sale-leaseback" className="mt-4">
                <SaleLeasebackDashboard dealId={deal.id} />
              </TabsContent>
            )}
      </Tabs>
    </WorkbenchLayout>
  );
}
