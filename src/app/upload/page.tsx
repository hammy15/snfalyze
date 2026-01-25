'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
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
  Building2,
  MapPin,
  Hash,
  FileText,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Zap,
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

export default function UploadPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dealInfo, setDealInfo] = useState<DealInfo>({
    name: '',
    assetTypes: [],
    state: '',
    beds: '',
    brokerName: '',
    brokerFirm: '',
  });

  const handleFilesAccepted = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: generateId(),
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Simulate file processing
    newFiles.forEach((uploadedFile) => {
      simulateProcessing(uploadedFile.id);
    });
  }, []);

  const simulateProcessing = (fileId: string) => {
    const stages: Array<{ status: UploadedFile['status']; duration: number }> = [
      { status: 'uploading', duration: 600 },
      { status: 'parsing', duration: 800 },
      { status: 'normalizing', duration: 600 },
      { status: 'analyzing', duration: 800 },
      { status: 'complete', duration: 0 },
    ];

    let currentStage = 0;

    const runStage = () => {
      if (currentStage >= stages.length) return;

      const stage = stages[currentStage];
      const progressForStage = Math.min((currentStage + 1) * 25, 100);

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: stage.status, progress: progressForStage }
            : f
        )
      );

      if (stage.status === 'complete') {
        // Randomly assign a document type
        const types = ['Financial Statement', 'Rent Roll', 'Census Report', 'Staffing Report', 'Survey'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, type: randomType, progress: 100 } : f
          )
        );
        return;
      }

      currentStage++;
      setTimeout(runStage, stage.duration);
    };

    runStage();
  };

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

  const [analysisStatus, setAnalysisStatus] = useState<string>('');

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisStatus('Creating deal...');

    try {
      // 1. Create the deal in the database
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

      if (!dealResponse.ok) {
        const errorData = await dealResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create deal');
      }

      const { data: deal } = await dealResponse.json();

      // 2. Upload all files to the deal
      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        setAnalysisStatus(`Uploading document ${i + 1}/${uploadedFiles.length}: ${uploadedFile.file.name}...`);

        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('dealId', deal.id);

        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          console.error(`Failed to upload ${uploadedFile.file.name}`);
        }
      }

      setAnalysisStatus('AI is analyzing documents... This may take a moment.');

      // 3. Brief delay to allow processing to start
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 4. Navigate to the deal page
      router.push(`/app/deals/${deal.id}`);
    } catch (error) {
      console.error('Error starting analysis:', error);
      setAnalysisStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  const allFilesComplete = uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === 'complete');

  const hasMinimumInfo = dealInfo.name && dealInfo.assetTypes.length > 0;

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
                  <Badge variant="default" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  6-stage guided workflow with CMS integration, facility verification,
                  COA mapping review, and step-by-step financial consolidation.
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
                Upload financial statements, rent rolls, survey reports, and other deal materials.
                All documents will be OCR-processed and normalized into Cascadia's Chart of Accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dropzone
                onFilesAccepted={handleFilesAccepted}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
              />
            </CardContent>
          </Card>

          {/* Processing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Processing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Upload', description: 'Secure file transfer' },
                  { label: 'Parse', description: 'OCR & table extraction' },
                  { label: 'Normalize', description: 'Cascadia COA mapping' },
                  { label: 'Analyze', description: 'AI-powered analysis' },
                ].map((step, idx) => (
                  <div
                    key={step.label}
                    className="p-4 rounded-lg bg-surface-50 text-center"
                  >
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-surface-200 flex items-center justify-center text-sm font-medium text-surface-700">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-medium text-surface-900">{step.label}</p>
                    <p className="text-xs text-surface-500 mt-1">{step.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deal Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>
                Optional: Pre-fill known deal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Deal Name"
                placeholder="e.g., Sunrise Gardens SNF"
                value={dealInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Asset Types <span className="text-surface-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex gap-2">
                  {(['SNF', 'ALF', 'ILF'] as const).map((type) => {
                    const isSelected = dealInfo.assetTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAssetTypeToggle(type)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-surface-300 text-surface-600 hover:border-surface-400'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                />
                <Input
                  label="Beds"
                  type="number"
                  placeholder="120"
                  value={dealInfo.beds}
                  onChange={(e) => handleInputChange('beds', e.target.value)}
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
                    onChange={(e) => handleInputChange('brokerName', e.target.value)}
                  />
                  <Input
                    label="Broker Firm"
                    placeholder="Marcus & Millichap"
                    value={dealInfo.brokerFirm}
                    onChange={(e) => handleInputChange('brokerFirm', e.target.value)}
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
                    {uploadedFiles.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm text-surface-600">
                      {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {allFilesComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm text-surface-600">
                      {allFilesComplete ? 'All files processed' : 'Processing files...'}
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
                  disabled={!allFilesComplete || !hasMinimumInfo || isAnalyzing}
                  loading={isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? 'Processing...' : 'Run Full Analysis'}
                  {!isAnalyzing && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>

                {isAnalyzing && analysisStatus && (
                  <div className="flex items-center justify-center gap-2 text-sm text-surface-600 bg-surface-50 rounded-lg p-3">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span>{analysisStatus}</span>
                  </div>
                )}

                {!isAnalyzing && (
                  <p className="text-xs text-surface-500 text-center">
                    Analysis will extract data, run AI analysis, and generate insights
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
