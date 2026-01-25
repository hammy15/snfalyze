'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  Building2,
  Edit2,
  X,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  PieChart,
  BarChart3,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'analyzing' | 'done' | 'error';
}

interface ExtractionSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalNOI: number;
  avgOccupancy: number;
  totalBeds: number;
  dataQuality: number;
  periodsExtracted: string[];
  warnings: string[];
}

interface ExtractionMetadata {
  extractedAt: string;
  filesProcessed: string[];
  totalRowsProcessed: number;
  mappedItems: number;
  unmappedItems: number;
}

interface ExtractedLineItem {
  category: string;
  subcategory: string;
  label: string;
  originalLabel: string;
  coaCode: string | null;
  coaName: string | null;
  annualized: number | null;
  percentOfRevenue: number | null;
  facility: string;
  confidence: number;
}

interface FacilityMetrics {
  avgDailyCensus: number | null;
  occupancyRate: number | null;
  netOperatingIncome: number | null;
  ebitdaMargin: number | null;
}

interface AIAnalysis {
  suggestedDealName: string;
  suggestedDealType: 'purchase' | 'sale_leaseback' | 'acquisition_financing';
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF';
  facilities: Array<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    beds?: number;
    type?: string;
    confidence: number;
    sourceSheet?: string;
    metrics?: FacilityMetrics;
  }>;
  documentTypes: Array<{
    filename: string;
    suggestedType: string;
    confidence: number;
    sheetsFound?: string[];
  }>;
  confidence: number;
  analysisDetails?: {
    totalSheetsParsed: number;
    totalRowsAnalyzed: number;
    facilityIndicatorsFound: string[];
    companyName?: string | null;
    dateRange?: string | null;
  };
  extraction?: {
    facilities: Array<{
      name: string;
      entityName: string | null;
      metrics: FacilityMetrics & {
        payorMix: {
          medicare: number | null;
          medicaid: number | null;
          private: number | null;
          other: number | null;
        };
        revenuePPD: number | null;
        expensePPD: number | null;
        laborPPD: number | null;
        ebitda: number | null;
      };
    }>;
    lineItems: ExtractedLineItem[];
    summary: ExtractionSummary;
    metadata: ExtractionMetadata;
  };
}

interface DocumentUploadAnalysisProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  onAnalysisComplete: (analysis: AIAnalysis, stageData: Partial<WizardStageData>) => void;
  sessionId?: string;
}

export function DocumentUploadAnalysis({
  stageData,
  onUpdate,
  onAnalysisComplete,
  sessionId,
}: DocumentUploadAnalysisProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields from AI analysis
  const [dealName, setDealName] = useState('');
  const [dealType, setDealType] = useState<'purchase' | 'sale_leaseback' | 'acquisition_financing'>('purchase');
  const [assetType, setAssetType] = useState<'SNF' | 'ALF' | 'ILF'>('SNF');
  const [facilities, setFacilities] = useState<AIAnalysis['facilities']>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setUploading(true);

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
              f.id === fileEntry.id ? { ...f, status: 'error' } : f
            )
          );
        }
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id ? { ...f, status: 'error' } : f
          )
        );
      }
    }

    setUploading(false);
  }, [sessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
  });

  // Remove a file
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Run AI analysis on uploaded files
  const runAnalysis = async () => {
    const uploadedFiles = files.filter((f) => f.status === 'uploaded' || f.status === 'done');
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    setAnalyzing(true);
    setError(null);

    // Update file statuses to analyzing
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'uploaded' ? { ...f, status: 'analyzing' } : f
      )
    );

    try {
      const response = await fetch('/api/wizard/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fileIds: uploadedFiles.map((f) => f.id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data as AIAnalysis;
        setAnalysis(result);
        setDealName(result.suggestedDealName);
        setDealType(result.suggestedDealType);
        setAssetType(result.suggestedAssetType);
        setFacilities(result.facilities);

        // Update file statuses to done
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'analyzing' ? { ...f, status: 'done' } : f
          )
        );
      } else {
        setError(data.error || 'Analysis failed');
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'analyzing' ? { ...f, status: 'uploaded' } : f
          )
        );
      }
    } catch (err) {
      setError('Failed to analyze documents');
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'analyzing' ? { ...f, status: 'uploaded' } : f
        )
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Confirm and proceed
  const confirmAnalysis = () => {
    if (!analysis) return;

    // Build the stage data update including extraction data
    const stageDataUpdate: Partial<WizardStageData> & { extraction?: AIAnalysis['extraction'] } = {
      dealStructure: {
        dealName,
        dealStructure: dealType,
        assetType,
        facilityCount: facilities.length,
        isAllOrNothing: true,
      },
      facilityIdentification: {
        facilities: facilities.map((f, i) => ({
          slot: i + 1,
          name: f.name,
          address: f.address,
          city: f.city,
          state: f.state,
          licensedBeds: f.beds,
          assetType: (f.type as 'SNF' | 'ALF' | 'ILF') || assetType,
          isVerified: false,
        })),
      },
      documentOrganization: {
        documents: files
          .filter((f) => f.status === 'done')
          .map((f) => ({
            id: f.id,
            filename: f.name,
            type: analysis.documentTypes.find((d) => d.filename === f.name)?.suggestedType,
            confirmedType: false,
          })),
      },
    };

    // IMPORTANT: Save extraction data for COA mapping stage
    // Only save essential data to avoid 413 Request Too Large errors
    if (analysis.extraction) {
      // Limit lineItems to first 500 to avoid payload size issues
      const limitedLineItems = analysis.extraction.lineItems?.slice(0, 500) || [];

      (stageDataUpdate as any).extraction = {
        facilities: analysis.extraction.facilities,
        lineItems: limitedLineItems.map(item => ({
          // Only keep essential fields for COA mapping
          category: item.category,
          label: item.label,
          originalLabel: item.originalLabel,
          coaCode: item.coaCode,
          coaName: item.coaName,
          annualized: item.annualized,
          facility: item.facility,
          confidence: item.confidence,
        })),
        summary: analysis.extraction.summary,
        metadata: {
          extractedAt: analysis.extraction.metadata.extractedAt,
          filesProcessed: analysis.extraction.metadata.filesProcessed,
          mappedItems: analysis.extraction.metadata.mappedItems,
          unmappedItems: analysis.extraction.metadata.unmappedItems,
          // Don't save totalRowsProcessed as it's not essential
        },
      };
    }

    onUpdate(stageDataUpdate);
    onAnalysisComplete(analysis, stageDataUpdate);
  };

  // Update a facility
  const updateFacility = (index: number, updates: Partial<AIAnalysis['facilities'][0]>) => {
    setFacilities((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  // Add a facility
  const addFacility = () => {
    setFacilities((prev) => [
      ...prev,
      { name: `Facility ${prev.length + 1}`, confidence: 1.0 },
    ]);
  };

  // Remove a facility
  const removeFacility = (index: number) => {
    setFacilities((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadedCount = files.filter((f) => f.status === 'uploaded' || f.status === 'done').length;
  const hasAnalysis = analysis !== null;

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-400'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto text-surface-400 mb-4" />
        {uploading ? (
          <p className="text-surface-600 dark:text-surface-400">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-primary-600 dark:text-primary-400 font-medium">
            Drop files here
          </p>
        ) : (
          <>
            <p className="text-lg font-medium text-surface-700 dark:text-surface-300">
              Drop your deal documents here
            </p>
            <p className="text-sm text-surface-500 mt-2">
              PDF, Excel (.xlsx, .xls), CSV - We'll analyze and extract deal info automatically
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Documents ({files.length})</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  file.status === 'error'
                    ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20'
                    : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800'
                )}
              >
                <FileText className="w-5 h-5 text-surface-400 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                {file.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                )}
                {file.status === 'analyzing' && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Analyzing
                  </Badge>
                )}
                {file.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-primary-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
                >
                  <X className="w-4 h-4 text-surface-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Analyze button */}
      {!hasAnalysis && uploadedCount > 0 && (
        <Button
          onClick={runAnalysis}
          disabled={analyzing || uploadedCount === 0}
          className="w-full"
          size="lg"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing {uploadedCount} document{uploadedCount > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze Documents with AI
            </>
          )}
        </Button>
      )}

      {/* AI Analysis Results */}
      {hasAnalysis && (
        <Card className="border-2 border-primary-200 dark:border-primary-800">
          <CardContent className="pt-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-lg">AI Analysis Results</h3>
                <Badge variant="secondary">
                  {Math.round(analysis.confidence * 100)}% confidence
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                {isEditing ? 'Done Editing' : 'Edit'}
              </Button>
            </div>

            {/* Analysis Stats */}
            {analysis.analysisDetails && (
              <div className="space-y-3">
                {(analysis.analysisDetails.companyName || analysis.analysisDetails.dateRange) && (
                  <div className="flex items-center gap-4 text-sm text-surface-600 dark:text-surface-400">
                    {analysis.analysisDetails.companyName && (
                      <span><strong>Company:</strong> {analysis.analysisDetails.companyName}</span>
                    )}
                    {analysis.analysisDetails.dateRange && (
                      <span><strong>As of:</strong> {analysis.analysisDetails.dateRange}</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600">{analysis.analysisDetails.totalSheetsParsed}</p>
                    <p className="text-xs text-surface-500">Sheets Parsed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600">{analysis.analysisDetails.totalRowsAnalyzed.toLocaleString()}</p>
                    <p className="text-xs text-surface-500">Rows Analyzed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600">{facilities.length}</p>
                    <p className="text-xs text-surface-500">Buildings Found</p>
                  </div>
                </div>
              </div>
            )}

            {/* Extraction Financial Summary */}
            {analysis.extraction && (
              <div className="space-y-4">
                {/* Financial Overview */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-primary-50 dark:from-emerald-900/20 dark:to-primary-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Financial Summary (Annualized)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Total Revenue</p>
                      <p className="text-xl font-bold text-emerald-600">
                        ${(analysis.extraction.summary.totalRevenue / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Total Expenses</p>
                      <p className="text-xl font-bold text-rose-600">
                        ${(analysis.extraction.summary.totalExpenses / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Net Operating Income</p>
                      <p className="text-xl font-bold text-primary-600">
                        ${(analysis.extraction.summary.totalNOI / 1000000).toFixed(2)}M
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Quality & COA Mapping Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="w-4 h-4 text-primary-500" />
                      <h4 className="font-medium text-sm">Data Quality</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${analysis.extraction.summary.dataQuality * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary-600">
                        {Math.round(analysis.extraction.summary.dataQuality * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                      {analysis.extraction.metadata.mappedItems} of {analysis.extraction.metadata.mappedItems + analysis.extraction.metadata.unmappedItems} items mapped to COA
                    </p>
                  </div>

                  <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-primary-500" />
                      <h4 className="font-medium text-sm">COA Mapping Status</h4>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-lg font-bold text-emerald-600">{analysis.extraction.metadata.mappedItems}</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">Mapped</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="text-lg font-bold text-amber-600">{analysis.extraction.metadata.unmappedItems}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400">Unmapped</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period Coverage */}
                {analysis.extraction.summary.periodsExtracted.length > 0 && (
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700">
                    <p className="text-xs text-surface-500 mb-1">Periods Extracted</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.extraction.summary.periodsExtracted.slice(0, 12).map((period, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {period}
                        </Badge>
                      ))}
                      {analysis.extraction.summary.periodsExtracted.length > 12 && (
                        <Badge variant="secondary" className="text-xs">
                          +{analysis.extraction.summary.periodsExtracted.length - 12} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-Facility Metrics */}
                {analysis.extraction.facilities.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-500" />
                      <h4 className="font-medium">Per-Facility Operating Metrics</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {analysis.extraction.facilities.map((facility, idx) => (
                        <div key={idx} className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-primary-500" />
                            <h5 className="font-medium text-sm truncate">{facility.name}</h5>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-surface-500">Avg Daily Census</p>
                              <p className="font-semibold">
                                {facility.metrics.avgDailyCensus?.toFixed(1) || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-surface-500">Occupancy</p>
                              <p className="font-semibold">
                                {facility.metrics.occupancyRate ? `${facility.metrics.occupancyRate.toFixed(1)}%` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-surface-500">Rev PPD</p>
                              <p className="font-semibold text-emerald-600">
                                {facility.metrics.revenuePPD ? `$${facility.metrics.revenuePPD.toFixed(0)}` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-surface-500">NOI</p>
                              <p className="font-semibold text-primary-600">
                                {facility.metrics.netOperatingIncome
                                  ? `$${(facility.metrics.netOperatingIncome / 1000).toFixed(0)}K`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                          {facility.metrics.payorMix && (
                            <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                              <p className="text-xs text-surface-500 mb-1">Payor Mix</p>
                              <div className="flex gap-1 text-xs">
                                {facility.metrics.payorMix.medicare && (
                                  <Badge variant="outline" className="text-xs px-1">
                                    MC: {facility.metrics.payorMix.medicare.toFixed(0)}%
                                  </Badge>
                                )}
                                {facility.metrics.payorMix.medicaid && (
                                  <Badge variant="outline" className="text-xs px-1">
                                    MA: {facility.metrics.payorMix.medicaid.toFixed(0)}%
                                  </Badge>
                                )}
                                {facility.metrics.payorMix.private && (
                                  <Badge variant="outline" className="text-xs px-1">
                                    Pvt: {facility.metrics.payorMix.private.toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {analysis.extraction.summary.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="font-medium text-sm text-amber-800 dark:text-amber-300">Extraction Warnings</h4>
                    </div>
                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      {analysis.extraction.summary.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Deal Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Deal Name</Label>
                {isEditing ? (
                  <Input
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                  />
                ) : (
                  <p className="font-medium text-lg">{dealName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Deal Type</Label>
                {isEditing ? (
                  <Select value={dealType} onValueChange={(v) => setDealType(v as typeof dealType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Direct Purchase</SelectItem>
                      <SelectItem value="sale_leaseback">Sale-Leaseback</SelectItem>
                      <SelectItem value="acquisition_financing">Acquisition Financing</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium capitalize">{dealType.replace('_', '-')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Asset Type</Label>
                {isEditing ? (
                  <Select value={assetType} onValueChange={(v) => setAssetType(v as typeof assetType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SNF">Skilled Nursing Facility</SelectItem>
                      <SelectItem value="ALF">Assisted Living Facility</SelectItem>
                      <SelectItem value="ILF">Independent Living Facility</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{assetType}</p>
                )}
              </div>
            </div>

            {/* Facilities */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">
                  Detected Facilities ({facilities.length})
                </Label>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={addFacility}>
                    + Add Facility
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {facilities.map((facility, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-100 dark:bg-surface-800"
                  >
                    <Building2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    {isEditing ? (
                      <>
                        <Input
                          value={facility.name}
                          onChange={(e) =>
                            updateFacility(index, { name: e.target.value })
                          }
                          className="flex-1"
                          placeholder="Facility name"
                        />
                        <Input
                          value={facility.city || ''}
                          onChange={(e) =>
                            updateFacility(index, { city: e.target.value })
                          }
                          className="w-32"
                          placeholder="City"
                        />
                        <Input
                          value={facility.state || ''}
                          onChange={(e) =>
                            updateFacility(index, { state: e.target.value })
                          }
                          className="w-20"
                          placeholder="State"
                        />
                        <button
                          onClick={() => removeFacility(index)}
                          className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
                        >
                          <X className="w-4 h-4 text-surface-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block truncate">{facility.name}</span>
                          {facility.sourceSheet && (
                            <span className="text-xs text-surface-400">from: {facility.sourceSheet}</span>
                          )}
                        </div>
                        {facility.city && facility.state && (
                          <span className="text-sm text-surface-500">
                            {facility.city}, {facility.state}
                          </span>
                        )}
                        {facility.beds && (
                          <Badge variant="secondary">{facility.beds} beds</Badge>
                        )}
                        <Badge
                          variant={facility.confidence > 0.8 ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {Math.round(facility.confidence * 100)}%
                        </Badge>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <Button onClick={confirmAnalysis} size="lg" className="w-full">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Confirm & Continue to Verification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
