'use client';

import { useState } from 'react';
import {
  type Deal,
  type DealOutcome,
  type DealSynthesis,
  DEAL_HYPOTHESES,
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
  Trophy,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Plus,
  X,
  DollarSign,
  Calendar,
  Tag,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

interface DealMemoryProps {
  deals: (Deal & { synthesis?: DealSynthesis; outcome?: DealOutcome })[];
  onRecordOutcome: (dealId: string, outcome: Omit<DealOutcome, 'id' | 'deal_id' | 'created_at'>) => void;
}

const OUTCOME_OPTIONS = [
  { value: 'won', label: 'Won', icon: <Trophy className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { value: 'lost_to_competitor', label: 'Lost to Competitor', icon: <TrendingDown className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
  { value: 'passed', label: 'Passed', icon: <XCircle className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  { value: 'deal_fell_through', label: 'Deal Fell Through', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { value: 'still_active', label: 'Still Active', icon: <Clock className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
];

export function DealMemory({ deals, onRecordOutcome }: DealMemoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [isRecordingOutcome, setIsRecordingOutcome] = useState(false);

  const [newOutcome, setNewOutcome] = useState<Omit<DealOutcome, 'id' | 'deal_id' | 'created_at'>>({
    outcome: 'still_active',
    final_price: undefined,
    close_date: undefined,
    what_we_got_right: [],
    what_we_got_wrong: [],
    surprises: [],
    comparable_deal_tags: [],
  });

  const [newItems, setNewItems] = useState({
    right: '',
    wrong: '',
    surprise: '',
    tag: '',
  });

  // Get all unique tags across deals
  const allTags = Array.from(
    new Set(
      deals
        .flatMap((d) => d.outcome?.comparable_deal_tags || [])
        .filter(Boolean)
    )
  );

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = deal.name.toLowerCase().includes(query);
      const matchesId = deal.deal_id.toLowerCase().includes(query);
      const matchesTags = deal.outcome?.comparable_deal_tags?.some((t) =>
        t.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesId && !matchesTags) return false;
    }

    // Outcome filter
    if (filterOutcome !== 'all') {
      if (deal.outcome?.outcome !== filterOutcome) return false;
    }

    // Tag filter
    if (filterTag !== 'all') {
      if (!deal.outcome?.comparable_deal_tags?.includes(filterTag)) return false;
    }

    return true;
  });

  // Calculate statistics
  const completedDeals = deals.filter((d) => d.outcome && d.outcome.outcome !== 'still_active');
  const wonDeals = deals.filter((d) => d.outcome?.outcome === 'won');
  const passedDeals = deals.filter((d) => d.outcome?.outcome === 'passed');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRecordOutcome = () => {
    if (selectedDeal) {
      onRecordOutcome(selectedDeal, newOutcome);
      setIsRecordingOutcome(false);
      setSelectedDeal(null);
      setNewOutcome({
        outcome: 'still_active',
        what_we_got_right: [],
        what_we_got_wrong: [],
        surprises: [],
        comparable_deal_tags: [],
      });
    }
  };

  const addListItem = (field: 'what_we_got_right' | 'what_we_got_wrong' | 'surprises' | 'comparable_deal_tags', value: string) => {
    if (!value.trim()) return;
    setNewOutcome((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }));
  };

  const removeListItem = (field: 'what_we_got_right' | 'what_we_got_wrong' | 'surprises' | 'comparable_deal_tags', index: number) => {
    setNewOutcome((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  const selectedDealData = deals.find((d) => d.id === selectedDeal);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{deals.length}</div>
              <div className="text-sm text-muted-foreground">Total Deals</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{wonDeals.length}</div>
              <div className="text-sm text-muted-foreground">Won</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{passedDeals.length}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {completedDeals.length > 0
                  ? `${Math.round((wonDeals.length / completedDeals.length) * 100)}%`
                  : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Deal Memory
              </CardTitle>
              <CardDescription>
                Learn from past deals to improve future analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="deals">
            <TabsList>
              <TabsTrigger value="deals">Past Deals</TabsTrigger>
              <TabsTrigger value="learnings">Key Learnings</TabsTrigger>
            </TabsList>

            <TabsContent value="deals" className="mt-4">
              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search deals by name, ID, or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    {OUTCOME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          {o.icon}
                          {o.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {allTags.length > 0 && (
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="w-[150px]">
                      <Tag className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Deal List */}
              <div className="space-y-3">
                {filteredDeals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deals found</p>
                  </div>
                ) : (
                  filteredDeals.map((deal) => {
                    const outcomeInfo = OUTCOME_OPTIONS.find(
                      (o) => o.value === deal.outcome?.outcome
                    );

                    return (
                      <div
                        key={deal.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{deal.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {deal.deal_id}
                              </Badge>
                              {deal.outcome && (
                                <Badge className={`text-xs ${outcomeInfo?.color}`}>
                                  {outcomeInfo?.icon}
                                  <span className="ml-1">{outcomeInfo?.label}</span>
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>
                                {deal.asset_types.map((t) => t.toUpperCase()).join(', ')}
                              </span>
                              <span>•</span>
                              <span>{deal.states?.join(', ')}</span>
                              {deal.asking_price && (
                                <>
                                  <span>•</span>
                                  <span>Ask: {formatCurrency(deal.asking_price)}</span>
                                </>
                              )}
                              {deal.outcome?.final_price && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Final: {formatCurrency(deal.outcome.final_price)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Tags */}
                            {deal.outcome?.comparable_deal_tags && deal.outcome.comparable_deal_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {deal.outcome.comparable_deal_tags.map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Learnings Preview */}
                            {deal.outcome && (deal.outcome.what_we_got_right.length > 0 || deal.outcome.what_we_got_wrong.length > 0) && (
                              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                {deal.outcome.what_we_got_right.length > 0 && (
                                  <div>
                                    <span className="text-green-600 font-medium">What we got right:</span>
                                    <ul className="mt-1 text-muted-foreground">
                                      {deal.outcome.what_we_got_right.slice(0, 2).map((item, i) => (
                                        <li key={i}>• {item}</li>
                                      ))}
                                      {deal.outcome.what_we_got_right.length > 2 && (
                                        <li className="text-xs">+{deal.outcome.what_we_got_right.length - 2} more</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {deal.outcome.what_we_got_wrong.length > 0 && (
                                  <div>
                                    <span className="text-red-600 font-medium">What we got wrong:</span>
                                    <ul className="mt-1 text-muted-foreground">
                                      {deal.outcome.what_we_got_wrong.slice(0, 2).map((item, i) => (
                                        <li key={i}>• {item}</li>
                                      ))}
                                      {deal.outcome.what_we_got_wrong.length > 2 && (
                                        <li className="text-xs">+{deal.outcome.what_we_got_wrong.length - 2} more</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {!deal.outcome && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDeal(deal.id);
                                  setIsRecordingOutcome(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Record Outcome
                              </Button>
                            )}
                            {deal.outcome && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDeal(deal.id);
                                  setNewOutcome({
                                    outcome: deal.outcome!.outcome,
                                    final_price: deal.outcome!.final_price,
                                    close_date: deal.outcome!.close_date,
                                    what_we_got_right: deal.outcome!.what_we_got_right,
                                    what_we_got_wrong: deal.outcome!.what_we_got_wrong,
                                    surprises: deal.outcome!.surprises,
                                    comparable_deal_tags: deal.outcome!.comparable_deal_tags,
                                  });
                                  setIsRecordingOutcome(true);
                                }}
                              >
                                Edit Outcome
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="learnings" className="mt-4">
              {/* Aggregated Learnings */}
              <div className="space-y-6">
                {/* Common Patterns */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    What We Consistently Get Right
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const allRight = deals.flatMap((d) => d.outcome?.what_we_got_right || []);
                      const counts = allRight.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const sorted = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                      if (sorted.length === 0) {
                        return <p className="text-sm text-muted-foreground">No data yet</p>;
                      }

                      return sorted.map(([item, count], i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="flex-1 text-sm">{item}</span>
                          <Badge variant="secondary">{count}x</Badge>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Common Mistakes to Avoid
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const allWrong = deals.flatMap((d) => d.outcome?.what_we_got_wrong || []);
                      const counts = allWrong.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const sorted = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                      if (sorted.length === 0) {
                        return <p className="text-sm text-muted-foreground">No data yet</p>;
                      }

                      return sorted.map(([item, count], i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="flex-1 text-sm">{item}</span>
                          <Badge variant="secondary">{count}x</Badge>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Recurring Surprises
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const allSurprises = deals.flatMap((d) => d.outcome?.surprises || []);
                      const counts = allSurprises.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const sorted = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                      if (sorted.length === 0) {
                        return <p className="text-sm text-muted-foreground">No data yet</p>;
                      }

                      return sorted.map(([item, count], i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-amber-50 rounded">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="flex-1 text-sm">{item}</span>
                          <Badge variant="secondary">{count}x</Badge>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Record Outcome Dialog */}
      <Dialog open={isRecordingOutcome} onOpenChange={setIsRecordingOutcome}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Deal Outcome</DialogTitle>
            <DialogDescription>
              {selectedDealData?.name} ({selectedDealData?.deal_id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Outcome Selection */}
            <div className="space-y-2">
              <Label>What happened?</Label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((option) => {
                  const isSelected = newOutcome.outcome === option.value;
                  return (
                    <div
                      key={option.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? option.color + ' border-2' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setNewOutcome((prev) => ({ ...prev, outcome: option.value as DealOutcome['outcome'] }))}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Price & Close Date */}
            {(newOutcome.outcome === 'won' || newOutcome.outcome === 'lost_to_competitor') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Final Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9"
                      value={newOutcome.final_price || ''}
                      onChange={(e) =>
                        setNewOutcome((prev) => ({
                          ...prev,
                          final_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Close Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-9"
                      value={
                        newOutcome.close_date instanceof Date
                          ? newOutcome.close_date.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setNewOutcome((prev) => ({
                          ...prev,
                          close_date: e.target.value ? new Date(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* What We Got Right */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                What did we get right?
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newItems.right}
                  onChange={(e) => setNewItems((prev) => ({ ...prev, right: e.target.value }))}
                  placeholder="e.g., Correctly identified census upside potential"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('what_we_got_right', newItems.right);
                      setNewItems((prev) => ({ ...prev, right: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('what_we_got_right', newItems.right);
                    setNewItems((prev) => ({ ...prev, right: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newOutcome.what_we_got_right.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 bg-green-100">
                    {item}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeListItem('what_we_got_right', i)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* What We Got Wrong */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                What did we get wrong?
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newItems.wrong}
                  onChange={(e) => setNewItems((prev) => ({ ...prev, wrong: e.target.value }))}
                  placeholder="e.g., Underestimated deferred maintenance costs"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('what_we_got_wrong', newItems.wrong);
                      setNewItems((prev) => ({ ...prev, wrong: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('what_we_got_wrong', newItems.wrong);
                    setNewItems((prev) => ({ ...prev, wrong: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newOutcome.what_we_got_wrong.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 bg-red-100">
                    {item}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeListItem('what_we_got_wrong', i)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Surprises */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                What surprised us?
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newItems.surprise}
                  onChange={(e) => setNewItems((prev) => ({ ...prev, surprise: e.target.value }))}
                  placeholder="e.g., Unexpected environmental issues discovered"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('surprises', newItems.surprise);
                      setNewItems((prev) => ({ ...prev, surprise: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('surprises', newItems.surprise);
                    setNewItems((prev) => ({ ...prev, surprise: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newOutcome.surprises.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 bg-amber-100">
                    {item}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeListItem('surprises', i)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Comparable Deal Tags
              </Label>
              <p className="text-xs text-muted-foreground">
                Tags help find similar deals in the future (e.g., "rural_snf", "turnaround", "high_agency")
              </p>
              <div className="flex gap-2">
                <Input
                  value={newItems.tag}
                  onChange={(e) => setNewItems((prev) => ({ ...prev, tag: e.target.value }))}
                  placeholder="e.g., rural_snf"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('comparable_deal_tags', newItems.tag);
                      setNewItems((prev) => ({ ...prev, tag: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('comparable_deal_tags', newItems.tag);
                    setNewItems((prev) => ({ ...prev, tag: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newOutcome.comparable_deal_tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeListItem('comparable_deal_tags', i)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRecordingOutcome(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordOutcome}>
                Save Outcome
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
