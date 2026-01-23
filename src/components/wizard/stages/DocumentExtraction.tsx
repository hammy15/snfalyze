'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface ExtractionDoc {
  id: string;
  filename: string;
  status: 'pending' | 'in_progress' | 'review_needed' | 'complete';
  extractedFields?: number;
  clarificationsCount?: number;
  clarificationsResolved?: number;
  confidence?: number;
}

interface DocumentExtractionProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function DocumentExtraction({ stageData, onUpdate, dealId }: DocumentExtractionProps) {
  const [documents, setDocuments] = useState<ExtractionDoc[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<string | null>(null);

  // Initialize from uploaded documents
  useEffect(() => {
    const uploadedDocs = stageData.documentOrganization?.documents || [];
    const existingExtraction = stageData.documentExtraction?.documents || [];

    const docs: ExtractionDoc[] = uploadedDocs.map((doc) => {
      const existing = existingExtraction.find((e) => e.id === doc.id);
      return {
        id: doc.id,
        filename: doc.filename,
        status: existing?.status || 'pending',
        extractedFields: existing?.extractedFields,
        clarificationsCount: existing?.clarificationsCount,
        clarificationsResolved: existing?.clarificationsResolved,
      };
    });

    setDocuments(docs);
  }, [stageData.documentOrganization, stageData.documentExtraction]);

  // Sync to parent
  useEffect(() => {
    onUpdate({
      documentExtraction: {
        documents,
      },
    });
  }, [documents, onUpdate]);

  // Start extraction for all pending documents
  const startExtraction = async () => {
    if (!dealId) return;

    setIsExtracting(true);
    const pendingDocs = documents.filter((d) => d.status === 'pending');

    for (const doc of pendingDocs) {
      setCurrentDoc(doc.id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'in_progress' } : d))
      );

      try {
        const response = await fetch(`/api/documents/${doc.id}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId, deep: true }),
        });

        const data = await response.json();

        if (data.success) {
          const hasClarifications =
            (data.data.clarifications?.length || 0) > 0;
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? {
                    ...d,
                    status: hasClarifications ? 'review_needed' : 'complete',
                    extractedFields: data.data.fieldsExtracted || 0,
                    clarificationsCount: data.data.clarifications?.length || 0,
                    clarificationsResolved: 0,
                    confidence: data.data.confidence || 0,
                  }
                : d
            )
          );
        } else {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? { ...d, status: 'review_needed', clarificationsCount: 1 }
                : d
            )
          );
        }
      } catch (err) {
        console.error('Extraction failed:', err);
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...d, status: 'review_needed', clarificationsCount: 1 }
              : d
          )
        );
      }
    }

    setCurrentDoc(null);
    setIsExtracting(false);
  };

  // Mark document as reviewed
  const markReviewed = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: 'complete',
              clarificationsResolved: d.clarificationsCount,
            }
          : d
      )
    );
  };

  // Calculate progress
  const completedCount = documents.filter((d) => d.status === 'complete').length;
  const reviewNeededCount = documents.filter((d) => d.status === 'review_needed').length;
  const pendingCount = documents.filter((d) => d.status === 'pending').length;
  const progress = documents.length > 0 ? (completedCount / documents.length) * 100 : 0;

  const getStatusIcon = (status: ExtractionDoc['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-primary-500" />;
      case 'review_needed':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-surface-400" />;
    }
  };

  const getStatusBadge = (status: ExtractionDoc['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default">Complete</Badge>;
      case 'review_needed':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Needs Review</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">Extracting...</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Extraction Progress: {completedCount} of {documents.length} complete
          </span>
          <span className="text-sm text-surface-500">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex gap-4 text-xs text-surface-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-primary-500" />
            {completedCount} complete
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            {reviewNeededCount} needs review
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-surface-400" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Start extraction button */}
      {pendingCount > 0 && !isExtracting && (
        <Button onClick={startExtraction} className="w-full">
          <Play className="w-4 h-4 mr-2" />
          Start Deep Extraction ({pendingCount} documents)
        </Button>
      )}

      {/* Extracting indicator */}
      {isExtracting && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              <p className="font-medium">
                Extracting data from{' '}
                {documents.find((d) => d.id === currentDoc)?.filename}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            variant="flat"
            className={cn(
              'transition-all',
              doc.status === 'complete' && 'border-l-4 border-l-primary-500',
              doc.status === 'review_needed' && 'border-l-4 border-l-amber-500'
            )}
          >
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                      {doc.extractedFields !== undefined && (
                        <span>{doc.extractedFields} fields extracted</span>
                      )}
                      {doc.confidence !== undefined && (
                        <span>{Math.round(doc.confidence * 100)}% confidence</span>
                      )}
                      {doc.clarificationsCount !== undefined &&
                        doc.clarificationsCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <MessageCircle className="w-3 h-3" />
                            {doc.clarificationsResolved || 0}/{doc.clarificationsCount} clarifications
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  {doc.status === 'review_needed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markReviewed(doc.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All complete message */}
      {completedCount === documents.length && documents.length > 0 && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All documents extracted and validated. Ready for COA mapping.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
