'use client';

import { useState } from 'react';
import {
  type DealAssumption,
  type AssumptionType,
  type ConfidenceLevel,
  type AnalysisStage,
  ANALYSIS_STAGES,
} from '@/lib/deals/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  AlertTriangle,
  Info,
  CheckCircle,
  Filter,
  Trash2,
  Edit,
  Users,
  Building,
  DollarSign,
  FileWarning,
  Wrench,
  TrendingUp,
} from 'lucide-react';

interface AssumptionsPanelProps {
  dealId: string;
  currentStage: AnalysisStage;
  assumptions: DealAssumption[];
  onAddAssumption: (assumption: Omit<DealAssumption, 'id' | 'deal_id' | 'created_at'>) => void;
  onUpdateAssumption: (id: string, updates: Partial<DealAssumption>) => void;
  onDeleteAssumption: (id: string) => void;
}

const ASSUMPTION_TYPES: { value: AssumptionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'minor', label: 'Minor', icon: <Info className="h-4 w-4" />, description: 'Small assumptions with limited impact' },
  { value: 'census', label: 'Census', icon: <Users className="h-4 w-4" />, description: 'Occupancy and census projections' },
  { value: 'labor', label: 'Labor', icon: <Building className="h-4 w-4" />, description: 'Staffing levels, wages, agency usage' },
  { value: 'regulatory', label: 'Regulatory', icon: <FileWarning className="h-4 w-4" />, description: 'Compliance, surveys, licensing' },
  { value: 'capital', label: 'Capital', icon: <Wrench className="h-4 w-4" />, description: 'CapEx, renovations, deferred maintenance' },
  { value: 'market', label: 'Market', icon: <TrendingUp className="h-4 w-4" />, description: 'Market conditions, competition, rates' },
];

const CONFIDENCE_LEVELS: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Low', color: 'bg-red-100 text-red-800' },
];

const IMPACT_LEVELS = [
  { value: 'high', label: 'High Impact', color: 'bg-red-100 text-red-800' },
  { value: 'medium', label: 'Medium Impact', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Low Impact', color: 'bg-blue-100 text-blue-800' },
];

export function AssumptionsPanel({
  dealId,
  currentStage,
  assumptions,
  onAddAssumption,
  onUpdateAssumption,
  onDeleteAssumption,
}: AssumptionsPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<AssumptionType | 'all'>('all');
  const [filterStage, setFilterStage] = useState<AnalysisStage | 'all'>('all');
  const [editingAssumption, setEditingAssumption] = useState<DealAssumption | null>(null);

  const [newAssumption, setNewAssumption] = useState<Omit<DealAssumption, 'id' | 'deal_id' | 'created_at'>>({
    stage: currentStage,
    type: 'minor',
    description: '',
    value: '',
    rationale: '',
    confidence: 'medium',
    impact: 'medium',
  });

  const resetForm = () => {
    setNewAssumption({
      stage: currentStage,
      type: 'minor',
      description: '',
      value: '',
      rationale: '',
      confidence: 'medium',
      impact: 'medium',
    });
    setEditingAssumption(null);
  };

  const handleSubmit = () => {
    if (editingAssumption) {
      onUpdateAssumption(editingAssumption.id, newAssumption);
    } else {
      onAddAssumption(newAssumption);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const startEdit = (assumption: DealAssumption) => {
    setEditingAssumption(assumption);
    setNewAssumption({
      stage: assumption.stage,
      type: assumption.type,
      description: assumption.description,
      value: assumption.value,
      rationale: assumption.rationale,
      confidence: assumption.confidence,
      impact: assumption.impact,
    });
    setIsAddModalOpen(true);
  };

  const filteredAssumptions = assumptions.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStage !== 'all' && a.stage !== filterStage) return false;
    return true;
  });

  // Group by type for summary view
  const groupedByType = ASSUMPTION_TYPES.reduce((acc, type) => {
    acc[type.value] = assumptions.filter((a) => a.type === type.value);
    return acc;
  }, {} as Record<AssumptionType, DealAssumption[]>);

  // Summary stats
  const lowConfidenceHighImpact = assumptions.filter(
    (a) => a.confidence === 'low' && a.impact === 'high'
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Assumptions Log</CardTitle>
            <CardDescription>
              Track assumptions made during analysis
            </CardDescription>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Assumption
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingAssumption ? 'Edit Assumption' : 'Log New Assumption'}
                </DialogTitle>
                <DialogDescription>
                  Document assumptions with their confidence level and impact
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select
                      value={newAssumption.stage}
                      onValueChange={(value) =>
                        setNewAssumption((prev) => ({ ...prev, stage: value as AnalysisStage }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ANALYSIS_STAGES) as AnalysisStage[]).map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {ANALYSIS_STAGES[stage].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newAssumption.type}
                      onValueChange={(value) =>
                        setNewAssumption((prev) => ({ ...prev, type: value as AssumptionType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSUMPTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.icon}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={newAssumption.description}
                    onChange={(e) =>
                      setNewAssumption((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="What are you assuming?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value / Projection</Label>
                  <Input
                    value={newAssumption.value || ''}
                    onChange={(e) =>
                      setNewAssumption((prev) => ({ ...prev, value: e.target.value }))
                    }
                    placeholder="e.g., 85% occupancy by Month 12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rationale</Label>
                  <Textarea
                    value={newAssumption.rationale || ''}
                    onChange={(e) =>
                      setNewAssumption((prev) => ({ ...prev, rationale: e.target.value }))
                    }
                    placeholder="Why is this a reasonable assumption?"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Confidence Level</Label>
                    <Select
                      value={newAssumption.confidence}
                      onValueChange={(value) =>
                        setNewAssumption((prev) => ({ ...prev, confidence: value as ConfidenceLevel }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONFIDENCE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Impact Level</Label>
                    <Select
                      value={newAssumption.impact}
                      onValueChange={(value) =>
                        setNewAssumption((prev) => ({ ...prev, impact: value as 'high' | 'medium' | 'low' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPACT_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!newAssumption.description}>
                    {editingAssumption ? 'Update' : 'Add'} Assumption
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Warning for high-risk assumptions */}
        {lowConfidenceHighImpact.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                {lowConfidenceHighImpact.length} low-confidence, high-impact assumption{lowConfidenceHighImpact.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              These assumptions need validation or risk acknowledgment.
            </p>
          </div>
        )}

        <Tabs defaultValue="list">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as AssumptionType | 'all')}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ASSUMPTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterStage}
                onValueChange={(v) => setFilterStage(v as AnalysisStage | 'all')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {(Object.keys(ANALYSIS_STAGES) as AnalysisStage[]).map((s) => (
                    <SelectItem key={s} value={s}>{ANALYSIS_STAGES[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assumptions List */}
            {filteredAssumptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No assumptions logged yet</p>
                <p className="text-sm">Click "Add Assumption" to start documenting</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssumptions.map((assumption) => {
                  const typeInfo = ASSUMPTION_TYPES.find((t) => t.value === assumption.type);
                  const confidenceInfo = CONFIDENCE_LEVELS.find((c) => c.value === assumption.confidence);
                  const impactInfo = IMPACT_LEVELS.find((i) => i.value === assumption.impact);
                  const isHighRisk = assumption.confidence === 'low' && assumption.impact === 'high';

                  return (
                    <div
                      key={assumption.id}
                      className={`p-3 border rounded-lg ${isHighRisk ? 'border-amber-300 bg-amber-50/50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{typeInfo?.icon}</div>
                          <div>
                            <p className="font-medium">{assumption.description}</p>
                            {assumption.value && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Value: {assumption.value}
                              </p>
                            )}
                            {assumption.rationale && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Rationale: {assumption.rationale}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEdit(assumption)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDeleteAssumption(assumption.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {ANALYSIS_STAGES[assumption.stage].label}
                        </Badge>
                        <Badge className={`text-xs ${confidenceInfo?.color}`}>
                          {confidenceInfo?.label} Confidence
                        </Badge>
                        <Badge className={`text-xs ${impactInfo?.color}`}>
                          {impactInfo?.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {ASSUMPTION_TYPES.map((type) => {
                const typeAssumptions = groupedByType[type.value];
                const count = typeAssumptions.length;
                const highImpactCount = typeAssumptions.filter((a) => a.impact === 'high').length;
                const lowConfidenceCount = typeAssumptions.filter((a) => a.confidence === 'low').length;

                return (
                  <div
                    key={type.value}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setFilterType(type.value);
                      setFilterStage('all');
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {type.icon}
                      <span className="font-medium">{type.label}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                    {count > 0 && (
                      <div className="flex gap-2 mt-2 text-xs">
                        {highImpactCount > 0 && (
                          <span className="text-red-600">{highImpactCount} high impact</span>
                        )}
                        {lowConfidenceCount > 0 && (
                          <span className="text-amber-600">{lowConfidenceCount} low confidence</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall stats */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <h5 className="font-medium mb-2">Summary Statistics</h5>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{assumptions.length}</div>
                  <div className="text-xs text-muted-foreground">Total Assumptions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {assumptions.filter((a) => a.confidence === 'low').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Low Confidence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {assumptions.filter((a) => a.impact === 'high').length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Impact</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
