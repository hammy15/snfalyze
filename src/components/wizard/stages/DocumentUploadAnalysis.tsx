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
  }>;
  documentTypes: Array<{
    filename: string;
    suggestedType: string;
    confidence: number;
  }>;
  confidence: number;
}

interface DocumentUploadAnalysisProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  onAnalysisComplete: (analysis: AIAnalysis) => void;
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

    // Update stage data with confirmed values
    onUpdate({
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
    });

    onAnalysisComplete(analysis);
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
                        <span className="flex-1 font-medium">{facility.name}</span>
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
