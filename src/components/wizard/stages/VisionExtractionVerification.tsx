'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  Building2,
  AlertCircle,
  Eye,
  Table2,
  BarChart3,
  X,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLVerificationTable, type PLFacility, type PLLineItem } from '@/components/extraction/PLVerificationTable';

// ============================================================================
// TYPES
// ============================================================================

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'extracting' | 'done' | 'error';
  errorMessage?: string;
}

interface ExtractionProgress {
  stage: 'reading' | 'converting' | 'analyzing' | 'structuring' | 'complete' | 'error';
  progress: number;
  message: string;
  sheetIndex?: number;
  totalSheets?: number;
}

interface VisionExtractedFacility {
  name: string;
  ccn?: string;
  state?: string;
  city?: string;
  beds?: number;
  periods: { label: string; startDate: string; endDate: string; type: string }[];
  lineItems: {
    category: 'revenue' | 'expense' | 'metric';
    subcategory: string;
    label: string;
    values: { period: string; value: number }[];
    annual?: number;
    ppd?: number;
    percentRevenue?: number;
    confidence: number;
  }[];
  census?: {
    periods: string[];
    totalDays: number[];
    avgDailyCensus: number[];
    occupancy: number[];
  };
  payerRates?: {
    medicarePartAPpd?: number;
    medicaidPpd?: number;
    privatePpd?: number;
    blendedPpd?: number;
  };
  confidence: number;
}

interface VisionExtractionResult {
  facilities: VisionExtractedFacility[];
  sheets: {
    name: string;
    index: number;
    type: string;
    facilitiesFound: string[];
    periodsFound: string[];
    confidence: number;
  }[];
  summary: {
    totalFacilities: number;
    totalLineItems: number;
    totalSheets: number;
    overallConfidence: number;
    processingTimeMs: number;
    hasCensusData: boolean;
    hasPayerRates: boolean;
  };
  warnings: string[];
  errors: string[];
}

interface VisionExtractionVerificationProps {
  sessionId?: string;
  dealId?: string;
  onComplete: (data: {
    facilities: PLFacility[];
    verified: boolean;
  }) => void;
  className?: string;
}

// ============================================================================
// STAGE INDICATORS
// ============================================================================

type WizardStage = 'upload' | 'extract' | 'verify' | 'complete';

const STAGES: { id: WizardStage; label: string; icon: React.ElementType }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'extract', label: 'AI Extract', icon: Eye },
  { id: 'verify', label: 'Verify P&L', icon: Table2 },
  { id: 'complete', label: 'Ready', icon: CheckCircle2 },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VisionExtractionVerification({
  sessionId,
  dealId,
  onComplete,
  className,
}: VisionExtractionVerificationProps) {
  // Current wizard stage
  const [currentStage, setCurrentStage] = useState<WizardStage>('upload');

  // File management
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [extractionResult, setExtractionResult] = useState<VisionExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Verification state
  const [verifiedFacilities, setVerifiedFacilities] = useState<PLFacility[]>([]);
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());

  // Convert extraction result to verification format
  useEffect(() => {
    if (extractionResult && extractionResult.facilities.length > 0) {
      const converted: PLFacility[] = extractionResult.facilities.map((f, idx) => ({
        id: `facility-${idx}`,
        name: f.name,
        ccn: f.ccn,
        state: f.state,
        city: f.city,
        beds: f.beds,
        periods: f.periods.map(p => p.label),
        lineItems: f.lineItems.map((item, itemIdx) => ({
          id: `${idx}-${itemIdx}`,
          category: item.category,
          subcategory: item.subcategory,
          label: item.label,
          values: item.values,
          annual: item.annual,
          ppd: item.ppd,
          percentRevenue: item.percentRevenue,
          confidence: item.confidence,
        })),
        census: f.census,
        confidence: f.confidence,
      }));
      setVerifiedFacilities(converted);
    }
  }, [extractionResult]);

  // File upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setExtractionError(null);

    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileEntry = newFiles[i];

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (sessionId) {
          formData.append('sessionId', sessionId);
        }
        if (dealId) {
          formData.append('dealId', dealId);
        }

        const response = await fetch('/api/wizard/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, id: data.data.id, status: 'uploaded' }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: 'error', errorMessage: data.error }
                : f
            )
          );
        }
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id
              ? { ...f, status: 'error', errorMessage: 'Upload failed' }
              : f
          )
        );
      }
    }

    setUploading(false);
  }, [sessionId, dealId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Run vision extraction
  const runVisionExtraction = async () => {
    const uploadedFiles = files.filter((f) => f.status === 'uploaded' || f.status === 'done');
    if (uploadedFiles.length === 0) {
      setExtractionError('Please upload at least one document');
      return;
    }

    setExtracting(true);
    setExtractionError(null);
    setCurrentStage('extract');

    // Update file statuses
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'uploaded' ? { ...f, status: 'extracting' } : f
      )
    );

    // Simulate progress
    const progressStages = [
      { stage: 'reading', progress: 15, message: 'Reading documents...' },
      { stage: 'converting', progress: 35, message: 'Converting for AI analysis...' },
      { stage: 'analyzing', progress: 60, message: 'Claude is reading your spreadsheets...' },
      { stage: 'structuring', progress: 85, message: 'Structuring extracted data...' },
    ];

    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < progressStages.length) {
        setExtractionProgress(progressStages[stageIndex] as ExtractionProgress);
        stageIndex++;
      }
    }, 2500);

    try {
      const response = await fetch('/api/extraction/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: uploadedFiles.map((f) => f.id),
          dealId,
          includeRawAnalysis: false,
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (data.success) {
        setExtractionProgress({
          stage: 'complete',
          progress: 100,
          message: 'Extraction complete!',
        });

        setExtractionResult(data.data);
        setCurrentStage('verify');

        // Update file statuses
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'extracting' ? { ...f, status: 'done' } : f
          )
        );
      } else {
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setExtractionError(err instanceof Error ? err.message : 'Extraction failed');
      setExtractionProgress({
        stage: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Extraction failed',
      });
      setCurrentStage('upload');

      // Reset file statuses
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'extracting' ? { ...f, status: 'uploaded' } : f
        )
      );
    } finally {
      setExtracting(false);
    }
  };

  // P&L verification handlers
  const handleUpdateLineItem = useCallback((
    facilityId: string,
    lineItemId: string,
    updates: Partial<PLLineItem>
  ) => {
    setVerifiedFacilities((prev) =>
      prev.map((f) =>
        f.id === facilityId
          ? {
              ...f,
              lineItems: f.lineItems.map((item) =>
                item.id === lineItemId ? { ...item, ...updates } : item
              ),
            }
          : f
      )
    );
  }, []);

  const handleApproveItem = useCallback((facilityId: string, lineItemId: string) => {
    setApprovedItems((prev) => new Set(prev).add(`${facilityId}-${lineItemId}`));
  }, []);

  const handleRejectItem = useCallback((facilityId: string, lineItemId: string) => {
    setVerifiedFacilities((prev) =>
      prev.map((f) =>
        f.id === facilityId
          ? {
              ...f,
              lineItems: f.lineItems.filter((item) => item.id !== lineItemId),
            }
          : f
      )
    );
  }, []);

  const handleApproveAll = useCallback((facilityId: string) => {
    const facility = verifiedFacilities.find((f) => f.id === facilityId);
    if (facility) {
      const newApproved = new Set(approvedItems);
      facility.lineItems.forEach((item) => {
        newApproved.add(`${facilityId}-${item.id}`);
      });
      setApprovedItems(newApproved);
    }
  }, [verifiedFacilities, approvedItems]);

  // Complete verification
  const completeVerification = () => {
    setCurrentStage('complete');
    onComplete({
      facilities: verifiedFacilities,
      verified: true,
    });
  };

  // Calculate progress stats
  const uploadedCount = files.filter((f) => f.status === 'uploaded' || f.status === 'done').length;
  const totalLineItems = verifiedFacilities.reduce((sum, f) => sum + f.lineItems.length, 0);
  const approvedCount = approvedItems.size;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stage Progress Indicator */}
      <div className="flex items-center justify-center gap-2 p-4 bg-surface-50 dark:bg-surface-900 rounded-lg">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = currentStage === stage.id;
          const isPast = STAGES.findIndex(s => s.id === currentStage) > idx;

          return (
            <div key={stage.id} className="flex items-center gap-2">
              {idx > 0 && (
                <ChevronRight className={cn(
                  'w-4 h-4',
                  isPast ? 'text-accent' : 'text-surface-300'
                )} />
              )}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                isActive && 'bg-accent text-white',
                isPast && 'bg-accent/20 text-accent',
                !isActive && !isPast && 'text-surface-400'
              )}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{stage.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Stage */}
      {currentStage === 'upload' && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
              isDragActive
                ? 'border-accent bg-accent/5'
                : 'border-surface-300 hover:border-accent/50 hover:bg-surface-50'
            )}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-surface-400 mb-4" />
            {isDragActive ? (
              <p className="text-accent font-medium text-lg">Drop files here</p>
            ) : (
              <>
                <p className="text-lg font-medium text-surface-700 dark:text-surface-200">
                  Drop deal documents for AI extraction
                </p>
                <p className="text-sm text-surface-500 mt-2">
                  Excel files (.xlsx, .xls) work best for P&L extraction. PDFs supported for rate letters.
                </p>
              </>
            )}
          </div>

          {/* Click to select button */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => {
                  const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
                  if (selectedFiles.length > 0) {
                    onDrop(selectedFiles);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-lg border-2 border-accent text-accent hover:bg-accent/10 transition-colors">
                <Upload className="w-5 h-5" />
                Click to Select Files
              </span>
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Uploaded Documents ({files.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      file.status === 'error'
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20'
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800'
                    )}
                  >
                    <FileText className="w-5 h-5 text-surface-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    {file.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    )}
                    {file.status === 'uploaded' && (
                      <Badge variant="outline" className="text-xs">Ready</Badge>
                    )}
                    {file.status === 'done' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    {file.status === 'error' && (
                      <span className="text-xs text-rose-500">{file.errorMessage || 'Error'}</span>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                    >
                      <X className="w-4 h-4 text-surface-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {extractionError && (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {extractionError}
              </p>
            </div>
          )}

          {/* Extract button */}
          {uploadedCount > 0 && !uploading && (
            <Button
              onClick={runVisionExtraction}
              disabled={extracting}
              className="w-full"
              size="lg"
            >
              <Eye className="w-5 h-5 mr-2" />
              Extract with AI Vision
            </Button>
          )}
        </div>
      )}

      {/* Extraction Stage */}
      {currentStage === 'extract' && extractionProgress && (
        <Card className="border-2 border-accent/30 bg-gradient-to-r from-accent/5 to-accent/10">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent animate-pulse">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">AI Vision Extraction</h3>
                <p className="text-sm text-surface-500">{extractionProgress.message}</p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-1">
                {extractionProgress.progress}%
              </Badge>
            </div>

            <Progress value={extractionProgress.progress} className="h-3" />

            <div className="grid grid-cols-4 gap-3 text-center text-sm">
              {(['reading', 'converting', 'analyzing', 'structuring'] as const).map((stage) => {
                const stageOrder = ['reading', 'converting', 'analyzing', 'structuring', 'complete'];
                const currentIdx = stageOrder.indexOf(extractionProgress.stage);
                const stageIdx = stageOrder.indexOf(stage);
                const isComplete = stageIdx < currentIdx;
                const isCurrent = stage === extractionProgress.stage;

                return (
                  <div
                    key={stage}
                    className={cn(
                      'p-3 rounded-lg transition-all',
                      isComplete && 'bg-accent/20 text-accent',
                      isCurrent && 'bg-accent text-white animate-pulse',
                      !isComplete && !isCurrent && 'bg-surface-100 text-surface-400'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 mx-auto mb-1 rounded-full border-2 border-current" />
                    )}
                    <span className="capitalize">{stage}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Stage */}
      {currentStage === 'verify' && extractionResult && (
        <div className="space-y-4">
          {/* Extraction Summary */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Extraction Complete
                </CardTitle>
                <Badge variant="outline" className="text-sm">
                  {Math.round(extractionResult.summary.overallConfidence * 100)}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <p className="text-2xl font-bold text-accent">{extractionResult.summary.totalFacilities}</p>
                  <p className="text-xs text-surface-500">Facilities</p>
                </div>
                <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <p className="text-2xl font-bold text-accent">{extractionResult.summary.totalLineItems}</p>
                  <p className="text-xs text-surface-500">Line Items</p>
                </div>
                <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <p className="text-2xl font-bold text-accent">{extractionResult.summary.totalSheets}</p>
                  <p className="text-xs text-surface-500">Sheets</p>
                </div>
                <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <p className="text-2xl font-bold text-accent">
                    {(extractionResult.summary.processingTimeMs / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-surface-500">Processing</p>
                </div>
              </div>

              {extractionResult.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Warnings</p>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    {extractionResult.warnings.slice(0, 3).map((warning, i) => (
                      <li key={i}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* P&L Verification Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="w-5 h-5" />
                  Verify Extracted Data
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-500">
                    {approvedCount} of {totalLineItems} items reviewed
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStage('upload')}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Re-extract
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PLVerificationTable
                facilities={verifiedFacilities}
                onUpdate={handleUpdateLineItem}
                onApprove={handleApproveItem}
                onReject={handleRejectItem}
                onApproveAll={handleApproveAll}
              />
            </CardContent>
          </Card>

          {/* Complete button */}
          <Button
            onClick={completeVerification}
            size="lg"
            className="w-full"
            disabled={verifiedFacilities.length === 0}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm & Generate Proforma
          </Button>
        </div>
      )}

      {/* Complete Stage */}
      {currentStage === 'complete' && (
        <Card className="border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
              Verification Complete!
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              {verifiedFacilities.length} facilities with {totalLineItems} line items verified and ready for proforma generation.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setCurrentStage('verify')}>
                <Table2 className="w-4 h-4 mr-1" />
                Review Data
              </Button>
              <Button>
                <BarChart3 className="w-4 h-4 mr-1" />
                View Proforma
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VisionExtractionVerification;
