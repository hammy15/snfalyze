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
} from 'lucide-react';

type AssetType = 'SNF' | 'ALF' | 'ILF';

interface DealInfo {
  name: string;
  assetType: AssetType | '';
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
    assetType: '',
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
      { status: 'uploading', duration: 800 },
      { status: 'parsing', duration: 1500 },
      { status: 'normalizing', duration: 1200 },
      { status: 'analyzing', duration: 2000 },
      { status: 'complete', duration: 0 },
    ];

    let currentStage = 0;
    let progress = 0;

    const processStage = () => {
      if (currentStage >= stages.length) return;

      const stage = stages[currentStage];

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: stage.status, progress: Math.min(progress, 100) }
            : f
        )
      );

      if (stage.status === 'complete') {
        // Randomly assign a document type
        const types = ['Financial Statement', 'Rent Roll', 'Census Report', 'Staffing Report', 'Survey'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, type: randomType } : f
          )
        );
        return;
      }

      const interval = setInterval(() => {
        progress += 5;
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: Math.min(progress, 100) } : f
          )
        );

        if (progress >= (currentStage + 1) * 25) {
          clearInterval(interval);
          currentStage++;
          setTimeout(processStage, 300);
        }
      }, stage.duration / 5);
    };

    processStage();
  };

  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleInputChange = (field: keyof DealInfo, value: string) => {
    setDealInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate analysis delay
    setTimeout(() => {
      router.push('/deals/new-deal');
    }, 2000);
  };

  const allFilesComplete = uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === 'complete');

  const hasMinimumInfo = dealInfo.name && dealInfo.assetType;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Upload & Analyze"
        description="Upload deal documents for automated extraction, normalization, and AI analysis"
      />

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
                    className="p-4 rounded-lg bg-cascadia-50 text-center"
                  >
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-cascadia-200 flex items-center justify-center text-sm font-medium text-cascadia-700">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-medium text-cascadia-900">{step.label}</p>
                    <p className="text-xs text-cascadia-500 mt-1">{step.description}</p>
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
                <label className="block text-sm font-medium text-cascadia-700 mb-1.5">
                  Asset Type
                </label>
                <div className="flex gap-2">
                  {(['SNF', 'ALF', 'ILF'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleInputChange('assetType', type)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                        dealInfo.assetType === type
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-cascadia-300 text-cascadia-600 hover:border-cascadia-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
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

              <div className="pt-4 border-t border-cascadia-200">
                <p className="text-xs font-medium text-cascadia-500 uppercase tracking-wide mb-3">
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
                      <AlertCircle className="w-4 h-4 text-cascadia-400" />
                    )}
                    <span className="text-sm text-cascadia-600">
                      {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {allFilesComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-cascadia-400" />
                    )}
                    <span className="text-sm text-cascadia-600">
                      {allFilesComplete ? 'All files processed' : 'Processing files...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMinimumInfo ? (
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-cascadia-400" />
                    )}
                    <span className="text-sm text-cascadia-600">
                      {hasMinimumInfo ? 'Deal info provided' : 'Add deal name & type'}
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
                  {isAnalyzing ? 'Starting Analysis...' : 'Run Full Analysis'}
                  {!isAnalyzing && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>

                <p className="text-xs text-cascadia-500 text-center">
                  Analysis will reconstruct financials, run dual valuations, and simulate capital partner outcomes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
