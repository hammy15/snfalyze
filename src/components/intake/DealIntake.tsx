'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IntakeDropZone } from './IntakeDropZone';
import { IntakeProgress } from './IntakeProgress';
import { ExtractionReviewCards } from './ExtractionReviewCards';
import { QuickInfoForm } from './QuickInfoForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type IntakeState = 'idle' | 'uploading' | 'processing' | 'review' | 'quickform' | 'creating';
type ProcessingStage = 'uploading' | 'parsing' | 'extracting' | 'analyzing' | 'complete';

interface ExtractedFacility {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
  confidence: number;
  cmsRating?: number;
  isSff?: boolean;
}

interface FileResult {
  filename: string;
  documentType: string;
  rawText: string;
  summary: string;
  keyFindings: string[];
  confidence: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DealIntake() {
  const router = useRouter();

  // State machine
  const [state, setState] = useState<IntakeState>('idle');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('uploading');

  // Data
  const [facilities, setFacilities] = useState<ExtractedFacility[]>([]);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [dealName, setDealName] = useState('');
  const [assetType, setAssetType] = useState<'SNF' | 'ALF' | 'ILF' | 'HOSPICE'>('SNF');
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>();

  // =============================================================================
  // FILE UPLOAD HANDLER
  // =============================================================================

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setState('uploading');
    setProcessingStage('uploading');
    setError(null);
    setCurrentFile(files[0]?.name);

    try {
      // Build form data
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      // Simulate stage progression while API processes
      setProcessingStage('parsing');

      const parseTimer = setTimeout(() => setProcessingStage('extracting'), 2000);
      const extractTimer = setTimeout(() => setProcessingStage('analyzing'), 4000);

      const response = await fetch('/api/intake', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(parseTimer);
      clearTimeout(extractTimer);

      if (!response.ok) {
        throw new Error('Failed to process files');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      const data = result.data;

      setProcessingStage('complete');
      setFileResults(data.files || []);
      setFacilities(data.extractedFacilities || []);
      setDealName(data.suggestedDealName || 'New Deal');
      setAssetType(data.suggestedAssetType || 'SNF');

      // Brief pause to show complete state, then move to review
      setTimeout(() => {
        setState('review');
      }, 800);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('idle');
    }
  }, []);

  // =============================================================================
  // CMS LOOKUP HANDLER
  // =============================================================================

  const handleCCNSubmit = useCallback(async (ccn: string) => {
    setState('uploading');
    setProcessingStage('extracting');
    setError(null);

    try {
      const response = await fetch(`/api/intake/cms-lookup?ccn=${encodeURIComponent(ccn)}`);
      const result = await response.json();

      if (result.success && result.data) {
        const facility = result.data;
        setFacilities([facility]);
        setDealName(facility.name);
        setAssetType(facility.assetType || 'SNF');
        setProcessingStage('complete');

        setTimeout(() => setState('review'), 600);
      } else {
        // CMS lookup failed — go to review with what we have
        setFacilities([
          {
            name: `Facility ${ccn}`,
            ccn,
            assetType: 'SNF',
            confidence: 30,
          },
        ]);
        setDealName(`Facility ${ccn}`);
        setProcessingStage('complete');
        setTimeout(() => setState('review'), 600);
      }
    } catch (err) {
      console.error('CMS lookup error:', err);
      setError('CMS lookup failed — start with basics instead');
      setState('idle');
    }
  }, []);

  // =============================================================================
  // QUICK START HANDLER
  // =============================================================================

  const handleQuickStart = useCallback(() => {
    setState('quickform');
  }, []);

  const handleQuickFormSubmit = useCallback(
    (data: { dealName: string; assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE'; facilities: any[] }) => {
      setDealName(data.dealName);
      setAssetType(data.assetType);
      setFacilities(
        data.facilities.map((f: any) => ({
          name: f.name,
          ccn: f.ccn || undefined,
          state: f.state || undefined,
          assetType: f.assetType || data.assetType,
          licensedBeds: f.licensedBeds ? parseInt(f.licensedBeds) : undefined,
          confidence: 100,
        }))
      );
      setState('review');
    },
    []
  );

  // =============================================================================
  // CREATE DEAL HANDLER
  // =============================================================================

  const handleCreateDeal = useCallback(async () => {
    setState('creating');
    setError(null);

    try {
      const response = await fetch('/api/intake', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealName,
          dealStructure: 'purchase',
          assetType,
          facilities: facilities.map((f) => ({
            name: f.name,
            ccn: f.ccn,
            address: f.address,
            city: f.city,
            state: f.state,
            zipCode: f.zipCode,
            assetType: f.assetType,
            licensedBeds: f.licensedBeds,
            certifiedBeds: f.certifiedBeds,
            yearBuilt: f.yearBuilt,
          })),
          fileData: fileResults.map((f) => ({
            filename: f.filename,
            documentType: f.documentType,
            rawText: f.rawText?.slice(0, 50000),
            summary: f.summary,
            keyFindings: f.keyFindings,
            confidence: f.confidence,
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create deal');
      }

      // Redirect to the new deal
      router.push(result.data.redirectUrl || `/app/deals/${result.data.deal.id}`);
    } catch (err) {
      console.error('Create deal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create deal');
      setState('review');
    }
  }, [dealName, assetType, facilities, fileResults, router]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="max-w-5xl mx-auto">
      {/* Error toast */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* IDLE — Drop zone */}
      {state === 'idle' && (
        <IntakeDropZone
          onFilesSelected={handleFilesSelected}
          onCCNSubmit={handleCCNSubmit}
          onQuickStart={handleQuickStart}
        />
      )}

      {/* UPLOADING / PROCESSING — Progress */}
      {state === 'uploading' && (
        <IntakeProgress
          stage={processingStage}
          filesCount={fileResults.length || 1}
          currentFile={currentFile}
          facilitiesFound={facilities.length}
        />
      )}

      {/* QUICK FORM */}
      {state === 'quickform' && (
        <QuickInfoForm
          onSubmit={handleQuickFormSubmit}
          onCancel={() => setState('idle')}
        />
      )}

      {/* REVIEW — Extracted data */}
      {state === 'review' && (
        <div className="space-y-6">
          <ExtractionReviewCards
            facilities={facilities}
            files={fileResults}
            onFacilitiesChange={setFacilities}
            dealName={dealName}
            onDealNameChange={setDealName}
            assetType={assetType}
            onAssetTypeChange={setAssetType}
          />

          {/* Action bar */}
          <div className="flex items-center justify-between pt-4 border-t border-surface-200 dark:border-surface-700">
            <Button
              variant="secondary"
              onClick={() => {
                setState('idle');
                setFacilities([]);
                setFileResults([]);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
            </Button>

            <Button
              size="lg"
              onClick={handleCreateDeal}
              disabled={facilities.length === 0 || !dealName.trim()}
            >
              <Sparkles className="w-5 h-5" />
              Create Deal & Start Analysis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATING — Loading */}
      {state === 'creating' && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">
            Creating Your Deal
          </h2>
          <p className="text-sm text-surface-500">
            Setting up {facilities.length} facilities and initializing analysis pipeline...
          </p>
        </div>
      )}
    </div>
  );
}
