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
} from 'lucide-react';
import { SaleLeasebackDashboard } from '@/components/sale-leaseback/SaleLeasebackDashboard';

// Mock deal data (in production, this would come from your API/database)
const mockDeal: Deal & { dealStructure?: string } = {
  id: '1',
  deal_id: 'CAS-2024-001',
  name: 'Sunrise SNF Portfolio - Oregon',
  asset_types: ['snf'],
  is_portfolio: true,
  facility_count: 3,
  total_beds: 360,
  states: ['OR'],
  source: 'broker',
  source_name: 'Marcus & Millichap',
  received_date: new Date('2024-01-15'),
  response_deadline: new Date('2024-02-15'),
  initial_hypothesis: 'turnaround',
  current_hypothesis: 'turnaround',
  hypothesis_notes: 'Portfolio shows declining census but strong market fundamentals. Believe we can improve operations.',
  status: 'active',
  current_stage: 'financial_reconstruction',
  asking_price: 45000000,
  created_at: new Date('2024-01-15'),
  updated_at: new Date(),
  created_by: 'Sarah Chen',
  assigned_to: ['Sarah Chen', 'Mike Rodriguez'],
  dealStructure: 'sale_leaseback', // Enable sale-leaseback tab for demo
};

const mockStageProgress: AnalysisStageProgress[] = [
  {
    id: '1',
    deal_id: '1',
    stage: 'document_understanding',
    status: 'completed',
    started_at: new Date('2024-01-16'),
    completed_at: new Date('2024-01-18'),
    completed_by: 'Sarah Chen',
    notes: 'All key documents received. Missing detailed payroll records for Q3.',
  },
  {
    id: '2',
    deal_id: '1',
    stage: 'financial_reconstruction',
    status: 'in_progress',
    started_at: new Date('2024-01-19'),
    notes: 'Working on normalizing T12. Some questions about management fee structure.',
  },
];

const mockAssumptions: DealAssumption[] = [
  {
    id: '1',
    deal_id: '1',
    stage: 'financial_reconstruction',
    type: 'census',
    description: 'Census will stabilize at 85% within 12 months',
    value: '85% by Month 12',
    rationale: 'Market average is 88%, new DON has strong track record',
    confidence: 'medium',
    impact: 'high',
    created_at: new Date(),
    created_by: 'Sarah Chen',
  },
  {
    id: '2',
    deal_id: '1',
    stage: 'financial_reconstruction',
    type: 'labor',
    description: 'Can reduce agency usage by 50% within 6 months',
    value: '50% reduction',
    rationale: 'Local labor market improving, competitive wages budgeted',
    confidence: 'low',
    impact: 'high',
    created_at: new Date(),
    created_by: 'Mike Rodriguez',
  },
  {
    id: '3',
    deal_id: '1',
    stage: 'document_understanding',
    type: 'minor',
    description: 'Q3 payroll data comparable to Q4',
    value: 'Using Q4 as proxy',
    rationale: 'No significant staffing changes reported',
    confidence: 'high',
    impact: 'low',
    created_at: new Date(),
    created_by: 'Sarah Chen',
  },
];

const mockDocuments: DealDocument[] = [
  {
    id: '1',
    deal_id: '1',
    name: 'Financial Package 2023.pdf',
    type: 'pdf',
    category: 'financials',
    size: 2500000,
    extracted: true,
    extraction_confidence: 0.92,
    uploaded_at: new Date('2024-01-16'),
    uploaded_by: 'Sarah Chen',
  },
  {
    id: '2',
    deal_id: '1',
    name: 'Rent Roll - January 2024.xlsx',
    type: 'excel',
    category: 'rent_roll',
    size: 450000,
    extracted: true,
    extraction_confidence: 0.98,
    uploaded_at: new Date('2024-01-16'),
    uploaded_by: 'Sarah Chen',
  },
  {
    id: '3',
    deal_id: '1',
    name: 'Survey Results 2023.pdf',
    type: 'pdf',
    category: 'survey',
    size: 1200000,
    extracted: false,
    uploaded_at: new Date('2024-01-17'),
    uploaded_by: 'Mike Rodriguez',
  },
];

const mockRisks: DealRisk[] = [
  {
    id: '1',
    deal_id: '1',
    category: 'regulatory',
    severity: 'medium',
    title: 'Recent survey deficiencies',
    description: 'One facility had 5 deficiencies on last survey including one G-level',
    mitigation: 'Review POC and verify corrections. May need additional CapEx.',
    is_deal_breaker: false,
    created_at: new Date(),
  },
  {
    id: '2',
    deal_id: '1',
    category: 'operational',
    severity: 'high',
    title: 'High agency dependency',
    description: 'Currently at 35% agency staffing across portfolio',
    mitigation: 'Budget for recruitment bonuses and wage increases',
    is_deal_breaker: false,
    created_at: new Date(),
  },
];

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal & { dealStructure?: string }>(mockDeal);
  const [stageProgress, setStageProgress] = useState<AnalysisStageProgress[]>(mockStageProgress);
  const [assumptions, setAssumptions] = useState<DealAssumption[]>(mockAssumptions);
  const [documents, setDocuments] = useState<DealDocument[]>(mockDocuments);
  const [risks, setRisks] = useState<DealRisk[]>(mockRisks);
  const [synthesis, setSynthesis] = useState<DealSynthesis | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStageStart = (stage: AnalysisStage) => {
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
  };

  const handleStageComplete = (stage: AnalysisStage, notes?: string) => {
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
    }
  };

  const handleStageBlock = (stage: AnalysisStage, blocker: string) => {
    setStageProgress((prev) =>
      prev.map((p) =>
        p.stage === stage
          ? { ...p, status: 'blocked', blockers: [...(p.blockers || []), blocker] }
          : p
      )
    );
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
              {ANALYSIS_STAGES[deal.current_stage].label}
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
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Stage Tracker */}
        <div className="col-span-1">
          <StageTracker
            dealId={deal.id}
            currentStage={deal.current_stage}
            stageProgress={stageProgress}
            onStageStart={handleStageStart}
            onStageComplete={handleStageComplete}
            onStageBlock={handleStageBlock}
            onNavigateToStage={handleNavigateToStage}
          />
        </div>

        {/* Right Column - Tabbed Content */}
        <div className="col-span-2">
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
              {deal.dealStructure === 'sale_leaseback' && (
                <TabsTrigger value="sale-leaseback" className="flex items-center gap-1">
                  <ArrowLeftRight className="h-4 w-4" />
                  Sale-Leaseback
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
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
                        Uploaded deal materials and extracted data
                      </CardDescription>
                    </div>
                    <Button>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Document
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.category} · {(doc.size / 1000000).toFixed(1)}MB ·{' '}
                              Uploaded {doc.uploaded_at.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.extracted ? (
                            <Badge className="bg-green-100 text-green-800">
                              Extracted ({Math.round((doc.extraction_confidence || 0) * 100)}%)
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not extracted</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assumptions Tab */}
            <TabsContent value="assumptions" className="mt-4">
              <AssumptionsPanel
                dealId={deal.id}
                currentStage={deal.current_stage}
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
