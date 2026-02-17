'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Building2,
  ArrowLeftRight,
  Shield,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface Conflict {
  id: string;
  field: string;
  facilityName: string;
  sourceA: { document: string; value: number };
  sourceB: { document: string; value: number };
  variance: number;
  resolution: 'auto' | 'manual' | 'pending';
  resolvedValue?: number;
}

interface DocumentSummary {
  name: string;
  facilitiesFound: number;
  lineItemsFound: number;
  confidence: number;
  type: string;
}

interface FacilityMatch {
  facilityName: string;
  sources: string[];
  lineItemCount: number;
  hasConflicts: boolean;
}

interface ReconciliationReviewProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

// Auto-resolve threshold (3%)
const AUTO_RESOLVE_THRESHOLD = 0.03;

export function ReconciliationReview({ stageData, onUpdate }: ReconciliationReviewProps) {
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummary[]>([]);
  const [facilityMatches, setFacilityMatches] = useState<FacilityMatch[]>([]);
  const [validationScore, setValidationScore] = useState(0);
  const initRef = useRef(false);

  // Build reconciliation data from vision extraction
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const reconcile = () => {
      const visionData = stageData.visionExtraction;
      if (!visionData?.facilities || visionData.facilities.length === 0) {
        setLoading(false);
        return;
      }

      const facilities = visionData.facilities;

      // Build document summaries from sheet metadata
      // Group facilities by source document (using periods/sheets info)
      const docMap = new Map<string, { facilities: string[]; lineItems: number; confidence: number }>();

      facilities.forEach((f: any) => {
        // Determine source based on available metadata
        const source = f.sourceDocument || 'Uploaded Document';
        const existing = docMap.get(source) || { facilities: [], lineItems: 0, confidence: 0 };
        existing.facilities.push(f.name);
        existing.lineItems += f.lineItems?.length || 0;
        existing.confidence = Math.max(existing.confidence, f.confidence || 0.85);
        docMap.set(source, existing);
      });

      const summaries: DocumentSummary[] = Array.from(docMap.entries()).map(([name, data]) => ({
        name,
        facilitiesFound: data.facilities.length,
        lineItemsFound: data.lineItems,
        confidence: data.confidence,
        type: data.lineItems > 20 ? 'Financial' : data.lineItems > 0 ? 'Summary' : 'Reference',
      }));
      setDocumentSummaries(summaries);

      // Build facility cross-reference matrix
      const facilityNameMap = new Map<string, { sources: Set<string>; lineItems: number }>();
      facilities.forEach((f: any) => {
        const normalized = (f.name || '').toLowerCase().trim();
        const existing = facilityNameMap.get(normalized) || { sources: new Set<string>(), lineItems: 0 };
        existing.sources.add(f.sourceDocument || 'Document');
        existing.lineItems += f.lineItems?.length || 0;
        facilityNameMap.set(normalized, existing);
      });

      // Detect conflicts: compare same-named facilities
      const detectedConflicts: Conflict[] = [];
      const nameGroups = new Map<string, any[]>();

      facilities.forEach((f: any) => {
        const normalized = (f.name || '').toLowerCase().trim();
        const group = nameGroups.get(normalized) || [];
        group.push(f);
        nameGroups.set(normalized, group);
      });

      nameGroups.forEach((group, name) => {
        if (group.length < 2) return;

        // Compare bed counts
        const bedCounts = group.map((f: any) => f.beds).filter(Boolean);
        if (bedCounts.length >= 2) {
          for (let i = 1; i < bedCounts.length; i++) {
            if (bedCounts[0] !== bedCounts[i]) {
              const variance = Math.abs(bedCounts[0] - bedCounts[i]) / Math.max(bedCounts[0], bedCounts[i]);
              const resolved = variance <= AUTO_RESOLVE_THRESHOLD;
              detectedConflicts.push({
                id: `beds-${name}-${i}`,
                field: 'Bed Count',
                facilityName: group[0].name,
                sourceA: { document: 'Source A', value: bedCounts[0] },
                sourceB: { document: 'Source B', value: bedCounts[i] },
                variance,
                resolution: resolved ? 'auto' : 'pending',
                resolvedValue: resolved ? Math.max(bedCounts[0], bedCounts[i]) : undefined,
              });
            }
          }
        }

        // Compare total revenue across facilities
        const revenues = group.map((f: any) => {
          const revItems = (f.lineItems || []).filter((li: any) => li.category === 'revenue');
          return revItems.reduce((sum: number, li: any) =>
            sum + (li.values?.reduce((s: number, v: any) => s + (v.value || 0), 0) || 0), 0);
        }).filter((v: number) => v > 0);

        if (revenues.length >= 2) {
          for (let i = 1; i < revenues.length; i++) {
            const variance = Math.abs(revenues[0] - revenues[i]) / Math.max(revenues[0], revenues[i]);
            if (variance > 0.001) { // Only flag if there's actual difference
              const resolved = variance <= AUTO_RESOLVE_THRESHOLD;
              detectedConflicts.push({
                id: `rev-${name}-${i}`,
                field: 'Total Revenue',
                facilityName: group[0].name,
                sourceA: { document: 'Source A', value: revenues[0] },
                sourceB: { document: 'Source B', value: revenues[i] },
                variance,
                resolution: resolved ? 'auto' : 'pending',
                resolvedValue: resolved ? Math.max(revenues[0], revenues[i]) : undefined,
              });
            }
          }
        }
      });

      setConflicts(detectedConflicts);

      // Build facility match list
      const matches: FacilityMatch[] = Array.from(facilityNameMap.entries()).map(([name, data]) => ({
        facilityName: name.charAt(0).toUpperCase() + name.slice(1),
        sources: Array.from(data.sources),
        lineItemCount: data.lineItems,
        hasConflicts: detectedConflicts.some(c => c.facilityName.toLowerCase() === name),
      }));
      setFacilityMatches(matches);

      // Calculate validation score
      const totalChecks = Math.max(detectedConflicts.length, 1);
      const resolvedChecks = detectedConflicts.filter(c => c.resolution !== 'pending').length;
      const score = detectedConflicts.length === 0 ? 100 : Math.round((resolvedChecks / totalChecks) * 100);
      setValidationScore(score);

      // Update parent state
      const autoResolved = detectedConflicts.filter(c => c.resolution === 'auto').length;
      const manualResolved = detectedConflicts.filter(c => c.resolution === 'manual').length;
      const pending = detectedConflicts.filter(c => c.resolution === 'pending').length;

      onUpdate({
        reconciliation: {
          validated: pending === 0,
          conflicts: detectedConflicts,
          autoResolved,
          manualResolved,
          pending,
          validationScore: score,
        },
      });

      setLoading(false);
    };

    reconcile();
  }, []);

  // Resolve a conflict manually
  const resolveConflict = (conflictId: string, value: number) => {
    setConflicts(prev => {
      const updated = prev.map(c =>
        c.id === conflictId ? { ...c, resolution: 'manual' as const, resolvedValue: value } : c
      );

      const pending = updated.filter(c => c.resolution === 'pending').length;
      const autoResolved = updated.filter(c => c.resolution === 'auto').length;
      const manualResolved = updated.filter(c => c.resolution === 'manual').length;
      const score = updated.length === 0 ? 100 : Math.round(((autoResolved + manualResolved) / updated.length) * 100);
      setValidationScore(score);

      onUpdate({
        reconciliation: {
          validated: pending === 0,
          conflicts: updated,
          autoResolved,
          manualResolved,
          pending,
          validationScore: score,
        },
      });

      return updated;
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-surface-500">Running cross-document validation...</span>
      </div>
    );
  }

  const pendingConflicts = conflicts.filter(c => c.resolution === 'pending');
  const resolvedConflicts = conflicts.filter(c => c.resolution !== 'pending');

  return (
    <div className="space-y-6">
      {/* Validation score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <Shield className={cn('w-6 h-6 mx-auto mb-1', validationScore >= 80 ? 'text-emerald-500' : 'text-amber-500')} />
            <p className="text-2xl font-bold">{validationScore}%</p>
            <p className="text-xs text-surface-500">Validation Score</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{documentSummaries.length}</p>
            <p className="text-xs text-surface-500">Documents</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{facilityMatches.length}</p>
            <p className="text-xs text-surface-500">Facilities</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <p className={cn('text-2xl font-bold', pendingConflicts.length > 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {pendingConflicts.length}
            </p>
            <p className="text-xs text-surface-500">Pending Conflicts</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-document summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            Document Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documentSummaries.length > 0 ? documentSummaries.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-surface-400" />
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-surface-500">
                      {doc.facilitiesFound} facilities, {doc.lineItemsFound} line items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                  <Badge variant={doc.confidence > 0.9 ? 'default' : 'secondary'}>
                    {Math.round(doc.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-surface-500 text-center py-4">
                All data from a single source — no cross-document comparison needed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facility cross-reference matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            Facility Cross-Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {facilityMatches.map((match, idx) => (
              <div key={idx} className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                match.hasConflicts ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-surface-50 dark:bg-surface-800'
              )}>
                <div className="flex items-center gap-3">
                  <Building2 className={cn('w-5 h-5', match.hasConflicts ? 'text-amber-500' : 'text-surface-400')} />
                  <div>
                    <p className="font-medium text-sm">{match.facilityName}</p>
                    <p className="text-xs text-surface-500">
                      {match.lineItemCount} line items across {match.sources.length} source{match.sources.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {match.hasConflicts ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Conflicts
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Clean
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending conflicts */}
      {pendingConflicts.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-800">
          <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4" />
              Conflicts Requiring Review ({pendingConflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {pendingConflicts.map(conflict => (
              <div key={conflict.id} className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{conflict.facilityName}</p>
                    <p className="text-sm text-surface-500">{conflict.field}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600">
                    {(conflict.variance * 100).toFixed(1)}% variance
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => resolveConflict(conflict.id, conflict.sourceA.value)}
                    className="p-3 border rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                  >
                    <p className="text-xs text-surface-500">{conflict.sourceA.document}</p>
                    <p className="font-mono font-medium">
                      {typeof conflict.sourceA.value === 'number' && conflict.sourceA.value > 100
                        ? formatCurrency(conflict.sourceA.value)
                        : conflict.sourceA.value}
                    </p>
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, conflict.sourceB.value)}
                    className="p-3 border rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                  >
                    <p className="text-xs text-surface-500">{conflict.sourceB.document}</p>
                    <p className="font-mono font-medium">
                      {typeof conflict.sourceB.value === 'number' && conflict.sourceB.value > 100
                        ? formatCurrency(conflict.sourceB.value)
                        : conflict.sourceB.value}
                    </p>
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resolved conflicts */}
      {resolvedConflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Resolved ({resolvedConflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedConflicts.map(conflict => (
                <div key={conflict.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{conflict.facilityName}</span>
                    <span className="mx-2 text-surface-400">-</span>
                    <span className="text-surface-600">{conflict.field}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {conflict.resolution === 'auto' ? 'Auto-resolved' : 'Manual'}
                    </Badge>
                    <span className="font-mono text-emerald-600">
                      {typeof conflict.resolvedValue === 'number' && conflict.resolvedValue > 100
                        ? formatCurrency(conflict.resolvedValue)
                        : conflict.resolvedValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All clear message */}
      {conflicts.length === 0 && (
        <Card variant="glass">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-medium">No conflicts detected</p>
                <p className="text-sm text-surface-500">
                  All {facilityMatches.length} facilities validated successfully. Data is consistent across sources.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingConflicts.length === 0 && conflicts.length > 0 && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All conflicts resolved. Ready to proceed to facility verification.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
