'use client';

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dropzone, UploadedFile } from '@/components/upload/dropzone';
import { generateId } from '@/lib/utils';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Zap,
  Loader2,
} from 'lucide-react';

type AssetType = 'SNF' | 'ALF' | 'ILF';

interface DealInfo {
  name: string;
  assetTypes: AssetType[];
  state: string;
  beds: string;
  brokerName: string;
  brokerFirm: string;
}

interface ServerDoc {
  id: string;
  filename: string;
  type: string | null;
  status: string;
  errors: string[] | null;
}

export default function UploadPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisPhase, setAnalysisPhase] = useState<
    'creating' | 'uploading' | 'processing' | 'done' | null
  >(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dealInfo, setDealInfo] = useState<DealInfo>({
    name: '',
    assetTypes: [],
    state: '',
    beds: '',
    brokerName: '',
    brokerFirm: '',
  });

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFilesAccepted = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: generateId(),
      file,
      status: 'ready' as const,
      progress: 0,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleInputChange = (field: keyof DealInfo, value: string) => {
    setDealInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssetTypeToggle = (type: AssetType) => {
    setDealInfo((prev) => {
      const current = prev.assetTypes;
      if (current.includes(type)) {
        return { ...prev, assetTypes: current.filter((t) => t !== type) };
      } else {
        return { ...prev, assetTypes: [...current, type] };
      }
    });
  };

  /** Parse JSON response safely — handles HTML error pages from server crashes */
  const safeJson = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        response.ok
          ? 'Invalid server response'
          : `Server error (${response.status})`
      );
    }
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisPhase('creating');
    setAnalysisStatus('Creating deal...');

    try {
      // 1. Create the deal
      const dealResponse = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dealInfo.name,
          assetTypes: dealInfo.assetTypes,
          beds: dealInfo.beds ? parseInt(dealInfo.beds) : undefined,
          primaryState: dealInfo.state || undefined,
          brokerName: dealInfo.brokerName || undefined,
          brokerFirm: dealInfo.brokerFirm || undefined,
          status: 'analyzing',
        }),
      });

      const dealData = await safeJson(dealResponse);
      if (!dealResponse.ok) {
        throw new Error(dealData.error || 'Failed to create deal');
      }
      const deal = dealData.data;

      // 2. Upload files one by one with real progress
      setAnalysisPhase('uploading');
      const docIdMap = new Map<string, string>(); // localId → server documentId

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uf = uploadedFiles[i];
        setAnalysisStatus(
          `Uploading ${i + 1}/${uploadedFiles.length}: ${uf.file.name}`
        );

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uf.id
              ? { ...f, status: 'uploading' as const, progress: 25 }
              : f
          )
        );

        const formData = new FormData();
        formData.append('file', uf.file);
        formData.append('dealId', deal.id);

        try {
          const uploadRes = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await safeJson(uploadRes);

          if (uploadRes.ok && uploadData.data?.id) {
            docIdMap.set(uf.id, uploadData.data.id);
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id
                  ? { ...f, status: 'uploaded' as const, progress: 40 }
                  : f
              )
            );
          } else {
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id
                  ? {
                      ...f,
                      status: 'error' as const,
                      error: uploadData.error || 'Upload failed',
                    }
                  : f
              )
            );
          }
        } catch (err) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id
                ? {
                    ...f,
                    status: 'error' as const,
                    error:
                      err instanceof Error ? err.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      }

      // 3. Poll for real processing status
      if (docIdMap.size === 0) {
        throw new Error('No files were uploaded successfully');
      }

      setAnalysisPhase('processing');
      setAnalysisStatus(
        'Documents uploaded. AI is extracting and analyzing...'
      );

      let attempts = 0;
      const maxAttempts = 150; // 5 minutes max (every 2s)

      await new Promise<void>((resolve) => {
        pollingRef.current = setInterval(async () => {
          attempts++;

          try {
            const res = await fetch(`/api/deals/${deal.id}`);
            if (!res.ok) {
              if (attempts >= maxAttempts) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                resolve();
              }
              return;
            }

            const data = await safeJson(res);
            const serverDocs: ServerDoc[] = data.data?.documents || [];

            let allDone = true;
            let processingFile = '';

            for (const [localId, serverId] of docIdMap.entries()) {
              const doc = serverDocs.find((d) => d.id === serverId);
              if (!doc) continue;

              const statusProgress: Record<string, number> = {
                uploaded: 45,
                parsing: 55,
                extracting: 65,
                normalizing: 75,
                analyzing: 85,
                complete: 100,
                error: 100,
              };

              const progress = statusProgress[doc.status] || 45;
              const isTerminal =
                doc.status === 'complete' || doc.status === 'error';

              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.id === localId
                    ? {
                        ...f,
                        status: isTerminal
                          ? (doc.status as 'complete' | 'error')
                          : (doc.status as UploadedFile['status']),
                        progress,
                        type: doc.type || f.type,
                        error: doc.errors?.[0],
                      }
                    : f
                )
              );

              if (!isTerminal) {
                allDone = false;
                processingFile = doc.filename;
              }
            }

            if (processingFile) {
              const activeDoc = serverDocs.find(
                (d) => d.filename === processingFile
              );
              const phase = activeDoc?.status || 'processing';
              setAnalysisStatus(
                `${processingFile} — ${phase}`
              );
            }

            if (allDone || attempts >= maxAttempts) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = null;
              resolve();
            }
          } catch {
            // Network error during poll — keep trying
            if (attempts >= maxAttempts) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = null;
              resolve();
            }
          }
        }, 2000);
      });

      // 4. Navigate to deal page
      setAnalysisPhase('done');
      setAnalysisStatus('Complete! Opening deal...');
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/app/deals/${deal.id}`);
    } catch (error) {
      console.error('Error starting analysis:', error);
      setAnalysisStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setAnalysisPhase(null);
      setIsAnalyzing(false);
    }
  };

  const hasFiles = uploadedFiles.length > 0;
  const hasMinimumInfo =
    dealInfo.name.trim().length > 0 && dealInfo.assetTypes.length > 0;
  const canStart = hasFiles && hasMinimumInfo && !isAnalyzing;

  // Phase progress for the status bar
  const phaseSteps = [
    { key: 'creating', label: 'Create Deal' },
    { key: 'uploading', label: 'Upload Files' },
    { key: 'processing', label: 'AI Processing' },
    { key: 'done', label: 'Done' },
  ];

  const currentPhaseIdx = analysisPhase
    ? phaseSteps.findIndex((s) => s.key === analysisPhase)
    : -1;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Upload & Analyze"
        description="Upload deal documents for automated extraction, normalization, and AI analysis"
      />

      {/* Workflow Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          hover
          onClick={() => router.push('/app/deals/new/wizard')}
          className="cursor-pointer border-2 border-primary-200 dark:border-primary-800 hover:border-primary-500 dark:hover:border-primary-500"
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">Guided Wizard</h3>
                  <Badge variant="default" className="text-xs">
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  6-stage guided workflow with CMS integration, facility
                  verification, COA mapping review, and step-by-step financial
                  consolidation.
                </p>
                <Button variant="link" className="px-0 mt-2">
                  Start Guided Setup <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="flat">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                <Zap className="w-6 h-6 text-surface-600 dark:text-surface-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Quick Upload</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Fast upload for experienced users. Upload documents directly
                  and let AI handle extraction automatically.
                </p>
                <p className="text-xs text-surface-500 mt-2">
                  Use the form below to proceed with quick upload.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Documents</CardTitle>
              <CardDescription>
                Upload financial statements, rent rolls, survey reports, and
                other deal materials. All documents will be OCR-processed and
                normalized into Cascadia&apos;s Chart of Accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dropzone
                onFilesAccepted={handleFilesAccepted}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
                disabled={isAnalyzing}
              />
            </CardContent>
          </Card>

          {/* Processing Pipeline Status — visible during analysis */}
          {isAnalyzing && analysisPhase && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Phase progress bar */}
                  <div className="flex items-center gap-1">
                    {phaseSteps.map((step, idx) => {
                      const isActive = idx === currentPhaseIdx;
                      const isComplete = idx < currentPhaseIdx;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                                isComplete
                                  ? 'bg-accent text-white'
                                  : isActive
                                    ? 'bg-accent/20 text-accent border-2 border-accent'
                                    : 'bg-surface-200 text-surface-500'
                              }`}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                isActive
                                  ? 'text-accent'
                                  : isComplete
                                    ? 'text-surface-700'
                                    : 'text-surface-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < phaseSteps.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 ${
                                idx < currentPhaseIdx
                                  ? 'bg-accent'
                                  : 'bg-surface-200'
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Current activity */}
                  <div className="flex items-center gap-2 text-sm text-surface-700 bg-white rounded-lg p-3 border border-surface-200">
                    <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
                    <span className="truncate">{analysisStatus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Information (static) */}
          {!isAnalyzing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Document Processing Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Upload', description: 'Secure file transfer' },
                    {
                      label: 'Parse',
                      description: 'OCR & table extraction',
                    },
                    {
                      label: 'Normalize',
                      description: 'Cascadia COA mapping',
                    },
                    {
                      label: 'Analyze',
                      description: 'AI-powered analysis',
                    },
                  ].map((step, idx) => (
                    <div
                      key={step.label}
                      className="p-4 rounded-lg bg-surface-50 text-center"
                    >
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-surface-200 flex items-center justify-center text-sm font-medium text-surface-700">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-medium text-surface-900">
                        {step.label}
                      </p>
                      <p className="text-xs text-surface-500 mt-1">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Deal Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>
                Required: Name your deal and select asset type(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Deal Name"
                placeholder="e.g., Sunrise Gardens SNF"
                value={dealInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isAnalyzing}
              />

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Asset Types{' '}
                  <span className="text-surface-400 font-normal">
                    (select all that apply)
                  </span>
                </label>
                <div className="flex gap-2">
                  {(['SNF', 'ALF', 'ILF'] as const).map((type) => {
                    const isSelected = dealInfo.assetTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAssetTypeToggle(type)}
                        disabled={isAnalyzing}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-surface-300 text-surface-600 hover:border-surface-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State"
                  placeholder="WA"
                  value={dealInfo.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  disabled={isAnalyzing}
                />
                <Input
                  label="Beds"
                  type="number"
                  placeholder="120"
                  value={dealInfo.beds}
                  onChange={(e) => handleInputChange('beds', e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>

              <div className="pt-4 border-t border-surface-200">
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-3">
                  Broker Information
                </p>
                <div className="space-y-3">
                  <Input
                    label="Broker Name"
                    placeholder="John Smith"
                    value={dealInfo.brokerName}
                    onChange={(e) =>
                      handleInputChange('brokerName', e.target.value)
                    }
                    disabled={isAnalyzing}
                  />
                  <Input
                    label="Broker Firm"
                    placeholder="Marcus & Millichap"
                    value={dealInfo.brokerFirm}
                    onChange={(e) =>
                      handleInputChange('brokerFirm', e.target.value)
                    }
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Status Indicators */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {hasFiles ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm text-surface-600">
                      {uploadedFiles.length} document
                      {uploadedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMinimumInfo ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm text-surface-600">
                      {hasMinimumInfo
                        ? `Deal info provided (${dealInfo.assetTypes.join(', ')})`
                        : 'Add deal name & select asset type(s)'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleStartAnalysis}
                  disabled={!canStart}
                  loading={isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    'Processing...'
                  ) : (
                    <>
                      Run Full Analysis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {isAnalyzing && analysisStatus && (
                  <div className="flex items-center justify-center gap-2 text-sm text-surface-600 bg-surface-50 rounded-lg p-3">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="truncate">{analysisStatus}</span>
                  </div>
                )}

                {!isAnalyzing && (
                  <p className="text-xs text-surface-500 text-center">
                    Analysis will extract data, run AI analysis, and generate
                    insights
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
