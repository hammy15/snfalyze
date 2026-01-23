'use client';

import { useState } from 'react';
import {
  type DealSynthesis,
  type DealHypothesis,
  type ConfidenceLevel,
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
  AlertTriangle,
  CheckCircle,
  DollarSign,
  XCircle,
  Target,
  Shield,
  Scale,
  TrendingUp,
  AlertCircle,
  Plus,
  X,
  Save,
  Eye,
} from 'lucide-react';

interface SynthesisBuilderProps {
  dealId: string;
  dealName: string;
  initialHypothesis: DealHypothesis;
  currentHypothesis?: DealHypothesis;
  askingPrice?: number;
  synthesis?: DealSynthesis;
  onSaveSynthesis: (synthesis: Omit<DealSynthesis, 'id' | 'deal_id' | 'created_at'>) => void;
}

type RecommendationType = 'pursue' | 'pursue_with_conditions' | 'pass' | 'need_more_info';

const RECOMMENDATION_OPTIONS: { value: RecommendationType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'pursue', label: 'Pursue', icon: <CheckCircle className="h-5 w-5" />, color: 'bg-green-100 border-green-300 text-green-800' },
  { value: 'pursue_with_conditions', label: 'Pursue with Conditions', icon: <AlertCircle className="h-5 w-5" />, color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { value: 'pass', label: 'Pass', icon: <XCircle className="h-5 w-5" />, color: 'bg-red-100 border-red-300 text-red-800' },
  { value: 'need_more_info', label: 'Need More Info', icon: <AlertTriangle className="h-5 w-5" />, color: 'bg-blue-100 border-blue-300 text-blue-800' },
];

export function SynthesisBuilder({
  dealId,
  dealName,
  initialHypothesis,
  currentHypothesis,
  askingPrice,
  synthesis: existingSynthesis,
  onSaveSynthesis,
}: SynthesisBuilderProps) {
  const [activeTab, setActiveTab] = useState('hypothesis');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [synthesis, setSynthesis] = useState<Omit<DealSynthesis, 'id' | 'deal_id' | 'created_at'>>({
    final_hypothesis: existingSynthesis?.final_hypothesis || currentHypothesis || initialHypothesis,
    hypothesis_changed: existingSynthesis?.hypothesis_changed || (currentHypothesis !== initialHypothesis),
    hypothesis_change_reason: existingSynthesis?.hypothesis_change_reason || '',

    must_go_right_first: existingSynthesis?.must_go_right_first || [],
    cannot_go_wrong: existingSynthesis?.cannot_go_wrong || [],
    deal_breakers: existingSynthesis?.deal_breakers || [],

    suggested_price_low: existingSynthesis?.suggested_price_low || 0,
    suggested_price_high: existingSynthesis?.suggested_price_high || 0,
    suggested_starting_point: existingSynthesis?.suggested_starting_point || 0,
    valuation_rationale: existingSynthesis?.valuation_rationale || '',

    walk_away_condition: existingSynthesis?.walk_away_condition || '',
    walk_away_price: existingSynthesis?.walk_away_price,

    overall_confidence: existingSynthesis?.overall_confidence || 'medium',
    confidence_factors: existingSynthesis?.confidence_factors || [],

    capital_partner_concerns: existingSynthesis?.capital_partner_concerns || [],
    capital_partner_price_adjustment: existingSynthesis?.capital_partner_price_adjustment,

    recommendation: existingSynthesis?.recommendation || 'need_more_info',
    recommendation_summary: existingSynthesis?.recommendation_summary || '',
  });

  const [newItem, setNewItem] = useState({
    must_go_right: '',
    cannot_go_wrong: '',
    deal_breaker: '',
    confidence_factor: '',
    capital_concern: '',
  });

  const updateSynthesis = (updates: Partial<typeof synthesis>) => {
    setSynthesis((prev) => ({ ...prev, ...updates }));
  };

  const addListItem = (field: keyof typeof synthesis, value: string) => {
    if (!value.trim()) return;
    const currentList = synthesis[field] as string[];
    updateSynthesis({ [field]: [...currentList, value.trim()] });
  };

  const removeListItem = (field: keyof typeof synthesis, index: number) => {
    const currentList = synthesis[field] as string[];
    updateSynthesis({ [field]: currentList.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    onSaveSynthesis(synthesis);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isPreviewMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deal Synthesis - Preview</CardTitle>
              <CardDescription>{dealName}</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
              <Eye className="h-4 w-4 mr-1" />
              Back to Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Recommendation Banner */}
            <div className={`p-4 rounded-lg border-2 ${RECOMMENDATION_OPTIONS.find(r => r.value === synthesis.recommendation)?.color}`}>
              <div className="flex items-center gap-3">
                {RECOMMENDATION_OPTIONS.find(r => r.value === synthesis.recommendation)?.icon}
                <div>
                  <div className="font-bold text-lg">
                    Recommendation: {RECOMMENDATION_OPTIONS.find(r => r.value === synthesis.recommendation)?.label}
                  </div>
                  <p className="mt-1">{synthesis.recommendation_summary}</p>
                </div>
              </div>
            </div>

            {/* Hypothesis */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Final Hypothesis</h4>
                <Badge variant="default" className="text-sm">
                  {DEAL_HYPOTHESES[synthesis.final_hypothesis].label}
                </Badge>
                {synthesis.hypothesis_changed && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Changed from: </span>
                    {DEAL_HYPOTHESES[initialHypothesis].label}
                    {synthesis.hypothesis_change_reason && (
                      <p className="text-muted-foreground mt-1">{synthesis.hypothesis_change_reason}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Confidence</h4>
                <Badge
                  className={`text-sm ${
                    synthesis.overall_confidence === 'high'
                      ? 'bg-green-100 text-green-800'
                      : synthesis.overall_confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {synthesis.overall_confidence.charAt(0).toUpperCase() + synthesis.overall_confidence.slice(1)} Confidence
                </Badge>
              </div>
            </div>

            {/* Valuation */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Valuation</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Low</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(synthesis.suggested_price_low)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Starting Point</div>
                  <div className="text-xl font-bold text-primary">
                    {formatCurrency(synthesis.suggested_starting_point)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">High</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(synthesis.suggested_price_high)}
                  </div>
                </div>
              </div>
              {askingPrice && (
                <div className="mt-3 text-center text-sm text-muted-foreground">
                  Asking Price: {formatCurrency(askingPrice)}
                  ({((synthesis.suggested_starting_point / askingPrice - 1) * 100).toFixed(1)}% vs. starting point)
                </div>
              )}
              <p className="mt-3 text-sm">{synthesis.valuation_rationale}</p>
            </div>

            {/* Critical Success Factors */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Must Go Right First
                </h4>
                <ul className="text-sm space-y-1">
                  {synthesis.must_go_right_first.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Cannot Go Wrong
                </h4>
                <ul className="text-sm space-y-1">
                  {synthesis.cannot_go_wrong.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-red-800">
                  <XCircle className="h-4 w-4" />
                  Deal Breakers
                </h4>
                <ul className="text-sm space-y-1 text-red-700">
                  {synthesis.deal_breakers.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Walk Away */}
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <h4 className="font-medium mb-2 text-amber-800">Walk-Away Parameters</h4>
              <p className="text-sm text-amber-700">{synthesis.walk_away_condition}</p>
              {synthesis.walk_away_price && (
                <p className="text-sm font-medium text-amber-800 mt-2">
                  Walk-Away Price: {formatCurrency(synthesis.walk_away_price)}
                </p>
              )}
            </div>

            {/* Capital Partner View */}
            {synthesis.capital_partner_concerns.length > 0 && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Capital Partner Lens</h4>
                <ul className="text-sm space-y-1">
                  {synthesis.capital_partner_concerns.map((concern, i) => (
                    <li key={i}>• {concern}</li>
                  ))}
                </ul>
                {synthesis.capital_partner_price_adjustment && (
                  <p className="mt-2 text-sm">
                    Suggested adjustment: {formatCurrency(synthesis.capital_partner_price_adjustment)}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Deal Synthesis Builder</CardTitle>
            <CardDescription>
              Complete your final analysis and recommendation
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPreviewMode(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save Synthesis
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
            <TabsTrigger value="success">Success Factors</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="capital">Capital View</TabsTrigger>
            <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
          </TabsList>

          {/* Hypothesis Tab */}
          <TabsContent value="hypothesis" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Final Hypothesis</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(DEAL_HYPOTHESES) as DealHypothesis[]).map((key) => {
                  const isSelected = synthesis.final_hypothesis === key;
                  return (
                    <div
                      key={key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => updateSynthesis({
                        final_hypothesis: key,
                        hypothesis_changed: key !== initialHypothesis
                      })}
                    >
                      <div className="font-medium">{DEAL_HYPOTHESES[key].label}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {DEAL_HYPOTHESES[key].description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {synthesis.hypothesis_changed && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Hypothesis changed from initial assessment</span>
                </div>
                <p className="text-sm text-amber-700 mb-2">
                  Initial: {DEAL_HYPOTHESES[initialHypothesis].label} →
                  Final: {DEAL_HYPOTHESES[synthesis.final_hypothesis].label}
                </p>
                <Label className="text-amber-800">Why did the hypothesis change?</Label>
                <Textarea
                  value={synthesis.hypothesis_change_reason || ''}
                  onChange={(e) => updateSynthesis({ hypothesis_change_reason: e.target.value })}
                  placeholder="Explain what changed your view during analysis..."
                  className="mt-1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Overall Confidence Level</Label>
              <Select
                value={synthesis.overall_confidence}
                onValueChange={(value) => updateSynthesis({ overall_confidence: value as ConfidenceLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High - Strong data support</SelectItem>
                  <SelectItem value="medium">Medium - Reasonable basis with some uncertainty</SelectItem>
                  <SelectItem value="low">Low - Significant uncertainty remains</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confidence Factors</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem.confidence_factor}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, confidence_factor: e.target.value }))}
                  placeholder="What supports your confidence level?"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('confidence_factors', newItem.confidence_factor);
                      setNewItem((prev) => ({ ...prev, confidence_factor: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('confidence_factors', newItem.confidence_factor);
                    setNewItem((prev) => ({ ...prev, confidence_factor: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {synthesis.confidence_factors.map((factor, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {factor}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeListItem('confidence_factors', i)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Success Factors Tab */}
          <TabsContent value="success" className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                What Must Go Right First
              </Label>
              <p className="text-xs text-muted-foreground">Priority actions that must happen for success</p>
              <div className="flex gap-2">
                <Input
                  value={newItem.must_go_right}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, must_go_right: e.target.value }))}
                  placeholder="e.g., Stabilize census above 80% within 6 months"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('must_go_right_first', newItem.must_go_right);
                      setNewItem((prev) => ({ ...prev, must_go_right: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('must_go_right_first', newItem.must_go_right);
                    setNewItem((prev) => ({ ...prev, must_go_right: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1">
                {synthesis.must_go_right_first.map((item, i) => (
                  <li key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">{item}</span>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem('must_go_right_first', i)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                What Cannot Go Wrong
              </Label>
              <p className="text-xs text-muted-foreground">Critical success factors that must be maintained</p>
              <div className="flex gap-2">
                <Input
                  value={newItem.cannot_go_wrong}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, cannot_go_wrong: e.target.value }))}
                  placeholder="e.g., Must maintain survey compliance"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('cannot_go_wrong', newItem.cannot_go_wrong);
                      setNewItem((prev) => ({ ...prev, cannot_go_wrong: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('cannot_go_wrong', newItem.cannot_go_wrong);
                    setNewItem((prev) => ({ ...prev, cannot_go_wrong: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1">
                {synthesis.cannot_go_wrong.map((item, i) => (
                  <li key={i} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">{item}</span>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem('cannot_go_wrong', i)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Deal Breakers
              </Label>
              <p className="text-xs text-muted-foreground">Conditions that would kill this deal</p>
              <div className="flex gap-2">
                <Input
                  value={newItem.deal_breaker}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, deal_breaker: e.target.value }))}
                  placeholder="e.g., Undisclosed environmental issues"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('deal_breakers', newItem.deal_breaker);
                      setNewItem((prev) => ({ ...prev, deal_breaker: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('deal_breakers', newItem.deal_breaker);
                    setNewItem((prev) => ({ ...prev, deal_breaker: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1">
                {synthesis.deal_breakers.map((item, i) => (
                  <li key={i} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm">{item}</span>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem('deal_breakers', i)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* Valuation Tab */}
          <TabsContent value="valuation" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Low Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    value={synthesis.suggested_price_low || ''}
                    onChange={(e) => updateSynthesis({ suggested_price_low: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Starting Point</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    value={synthesis.suggested_starting_point || ''}
                    onChange={(e) => updateSynthesis({ suggested_starting_point: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>High Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    value={synthesis.suggested_price_high || ''}
                    onChange={(e) => updateSynthesis({ suggested_price_high: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {askingPrice && synthesis.suggested_starting_point > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Asking Price: {formatCurrency(askingPrice)}
                </div>
                <div className="text-lg font-medium">
                  Suggested starting point is{' '}
                  <span className={synthesis.suggested_starting_point < askingPrice ? 'text-green-600' : 'text-red-600'}>
                    {((synthesis.suggested_starting_point / askingPrice - 1) * 100).toFixed(1)}%
                  </span>{' '}
                  {synthesis.suggested_starting_point < askingPrice ? 'below' : 'above'} asking
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valuation Rationale</Label>
              <Textarea
                value={synthesis.valuation_rationale}
                onChange={(e) => updateSynthesis({ valuation_rationale: e.target.value })}
                placeholder="Explain the basis for your valuation range..."
                rows={4}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Walk-Away Parameters</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Walk-Away Condition</Label>
                  <Textarea
                    value={synthesis.walk_away_condition}
                    onChange={(e) => updateSynthesis({ walk_away_condition: e.target.value })}
                    placeholder="Under what circumstances should we walk away from this deal?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Walk-Away Price (optional)</Label>
                  <div className="relative w-1/3">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9"
                      value={synthesis.walk_away_price || ''}
                      onChange={(e) => updateSynthesis({ walk_away_price: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Capital Partner View Tab */}
          <TabsContent value="capital" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Capital Partner Lens</h4>
              <p className="text-sm text-muted-foreground">
                View this deal from a capital partner's perspective. What concerns would they have?
                How might their requirements affect pricing?
              </p>
            </div>

            <div className="space-y-2">
              <Label>Capital Partner Concerns</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem.capital_concern}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, capital_concern: e.target.value }))}
                  placeholder="e.g., High agency dependency may concern lenders"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('capital_partner_concerns', newItem.capital_concern);
                      setNewItem((prev) => ({ ...prev, capital_concern: '' }));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addListItem('capital_partner_concerns', newItem.capital_concern);
                    setNewItem((prev) => ({ ...prev, capital_concern: '' }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1">
                {synthesis.capital_partner_concerns.map((concern, i) => (
                  <li key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{concern}</span>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem('capital_partner_concerns', i)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Price Adjustment for Capital Partner View</Label>
              <p className="text-xs text-muted-foreground">
                How much might the price need to adjust to satisfy capital partner requirements?
              </p>
              <div className="relative w-1/3">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  value={synthesis.capital_partner_price_adjustment || ''}
                  onChange={(e) => updateSynthesis({
                    capital_partner_price_adjustment: e.target.value ? Number(e.target.value) : undefined
                  })}
                  placeholder="Negative for reduction"
                />
              </div>
            </div>
          </TabsContent>

          {/* Recommendation Tab */}
          <TabsContent value="recommendation" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Final Recommendation</Label>
              <div className="grid grid-cols-2 gap-3">
                {RECOMMENDATION_OPTIONS.map((option) => {
                  const isSelected = synthesis.recommendation === option.value;
                  return (
                    <div
                      key={option.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? option.color + ' border-2' : 'hover:border-primary/50'
                      }`}
                      onClick={() => updateSynthesis({ recommendation: option.value })}
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

            <div className="space-y-2">
              <Label>Recommendation Summary *</Label>
              <Textarea
                value={synthesis.recommendation_summary}
                onChange={(e) => updateSynthesis({ recommendation_summary: e.target.value })}
                placeholder="Provide a clear, concise summary of your recommendation and key reasoning..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                This summary will be the primary output of your analysis. Make it clear and actionable.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
