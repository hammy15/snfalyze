'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BrainVisualization } from '@/components/brain/BrainVisualization';
import { SenseIndicator } from '@/components/brain/SenseIndicator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Crosshair,
  Upload,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Zap,
  Eye,
  Ear,
  Hand,
  ShieldAlert,
  Handshake,
  AlertTriangle,
  TrendingUp,
  FileText,
  X,
  Building2,
  MapPin,
  BedDouble,
  Pencil,
  Sparkles,
} from 'lucide-react';

interface RecentDeal {
  id: string;
  name: string;
  assetType: string;
  primaryState: string;
  beds: number;
  confidenceScore: number;
  status: string;
  analyzedAt: string | null;
}

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
}

interface FileExtractionResult {
  filename: string;
  documentType: string;
  rawText: string;
  extractedFacilities: ExtractedFacility[];
  summary: string;
  keyFindings: string[];
  confidence: number;
  spreadsheetData?: Record<string, any[][]>;
}

interface IntakeResult {
  sessionId: string;
  files: FileExtractionResult[];
  extractedFacilities: ExtractedFacility[];
  suggestedDealName: string;
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  suggestedState: string | null;
}

type IntakeStep = 'idle' | 'uploading' | 'results' | 'creating';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv'];

const SENSES = [
  { id: 'cms', name: 'CMS', icon: '👁', description: 'Star ratings, deficiencies, SFF status' },
  { id: 'market', name: 'Market', icon: '👂', description: 'Medicaid rates, economic data, labor markets' },
  { id: 'financial', name: 'Financial', icon: '✋', description: 'P&L extraction, EBITDAR, occupancy' },
  { id: 'regulatory', name: 'Regulatory', icon: '👃', description: 'CON, licensing, survey body behavior' },
  { id: 'deal', name: 'Deal', icon: '👄', description: 'Valuations, risk scoring, deal structure' },
];

const ANALYSIS_PHASES = [
  { id: 'intake', label: 'Document Intake', description: 'Upload deal package — CIL identifies document types', icon: Upload, duration: '~5s' },
  { id: 'senses', label: 'Sense Activation', description: 'CIL activates relevant senses based on deal context', icon: Eye, duration: '~10s' },
  { id: 'newo', label: 'Newo Analysis', description: 'Operations brain evaluates staffing, quality, reimbursement', icon: Zap, duration: '~30s' },
  { id: 'dev', label: 'Dev Analysis', description: 'Strategy brain models valuations, deal structure, IPO impact', icon: TrendingUp, duration: '~30s' },
  { id: 'tension', label: 'Tension Resolution', description: 'CIL reconciles where Newo and Dev disagree', icon: AlertTriangle, duration: '~10s' },
  { id: 'synthesis', label: 'CIL Synthesis', description: 'Final recommendation with confidence score', icon: CheckCircle2, duration: '~5s' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [brainHealth, setBrainHealth] = useState({ newo: 'online' as const, dev: 'online' as const });

  // Intake flow state
  const [intakeStep, setIntakeStep] = useState<IntakeStep>('idle');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [intakeResult, setIntakeResult] = useState<IntakeResult | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [editedDealName, setEditedDealName] = useState('');
  const [editedFacilities, setEditedFacilities] = useState<ExtractedFacility[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/deals?limit=10').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/cil/status').then((r) => r.json()).catch(() => ({})),
    ]).then(([dealsData, status]) => {
      const analyzed = (dealsData.data || [])
        .filter((d: RecentDeal) => d.analyzedAt)
        .sort((a: RecentDeal, b: RecentDeal) => new Date(b.analyzedAt!).getTime() - new Date(a.analyzedAt!).getTime())
        .slice(0, 5);
      setRecentDeals(analyzed);
      if (status?.brains) {
        setBrainHealth({
          newo: status.brains.newo?.status || 'online',
          dev: status.brains.dev?.status || 'online',
        });
      }
      setLoading(false);
    });
  }, []);

  // ---- File handling ----

  const isValidFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
  };

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter(isValidFile);
    if (valid.length === 0) return;
    setSelectedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const newFiles = valid.filter((f) => !names.has(f.name));
      return [...prev, ...newFiles];
    });
    setIntakeError(null);
  }, []);

  const removeFile = useCallback((name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  // ---- Drag and drop ----

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // ---- Upload files to POST /api/intake ----

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIntakeStep('uploading');
    setIntakeError(null);
    setUploadProgress(10);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    // Simulate progress ticks while waiting
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 600);

    try {
      const res = await fetch('/api/intake', { method: 'POST', body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Processing failed');

      const data = json.data as IntakeResult;
      setIntakeResult(data);
      setEditedDealName(data.suggestedDealName);
      setEditedFacilities([...data.extractedFacilities]);
      setIntakeStep('results');
    } catch (err) {
      clearInterval(progressInterval);
      setIntakeError(err instanceof Error ? err.message : 'Something went wrong');
      setIntakeStep('idle');
      setUploadProgress(0);
    }
  }, [selectedFiles]);

  // ---- Create deal via PUT /api/intake ----

  const handleCreateDeal = useCallback(async () => {
    if (!intakeResult || !editedDealName.trim()) return;
    setIntakeStep('creating');
    setCreateError(null);

    try {
      const res = await fetch('/api/intake', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealName: editedDealName.trim(),
          assetType: intakeResult.suggestedAssetType,
          facilities: editedFacilities,
          fileData: intakeResult.files.map((f) => ({
            filename: f.filename,
            documentType: f.documentType,
            rawText: f.rawText,
            summary: f.summary,
            keyFindings: f.keyFindings,
            confidence: f.confidence,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Create failed' }));
        throw new Error(err.error || `Failed (${res.status})`);
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create deal');

      const redirectUrl = json.data?.redirectUrl;
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create deal');
      setIntakeStep('results');
    }
  }, [intakeResult, editedDealName, editedFacilities, router]);

  // ---- Reset intake flow ----

  const resetIntake = useCallback(() => {
    setIntakeStep('idle');
    setSelectedFiles([]);
    setUploadProgress(0);
    setIntakeResult(null);
    setIntakeError(null);
    setEditedDealName('');
    setEditedFacilities([]);
    setCreateError(null);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <Crosshair className="w-6 h-6 text-primary-500" />
          Deal Analyzer
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Newo + Dev analyze every deal in parallel with full CIL orchestration
        </p>
      </div>

      {/* Brain Status */}
      <div className="neu-card-warm p-8">
        <div className="flex flex-col items-center">
          <BrainVisualization
            newoStatus={brainHealth.newo}
            devStatus={brainHealth.dev}
            compact
          />
          <div className="mt-6">
            <SenseIndicator senses={SENSES} />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DEAL INTAKE FLOW                                                  */}
      {/* ================================================================= */}
      <div className="neu-card-warm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100">
            Feed CIL Your Documents
          </h2>
        </div>
        <p className="text-xs text-surface-400 mb-5">
          Drop your deal package and CIL will extract facilities, financials, and structure a new deal for you.
        </p>

        {/* ---------- STEP: IDLE — File Drop Zone ---------- */}
        {intakeStep === 'idle' && (
          <>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-200',
                isDragOver
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 scale-[1.01]'
                  : 'border-primary-200 dark:border-primary-500/30 hover:border-primary-400 dark:hover:border-primary-500/50 bg-primary-50/20 dark:bg-primary-500/5'
              )}
            >
              <div className={cn(
                'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors',
                isDragOver ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-primary-50 dark:bg-primary-500/10'
              )}>
                <Upload className={cn(
                  'w-6 h-6 transition-colors',
                  isDragOver ? 'text-primary-600' : 'text-primary-400'
                )} />
              </div>
              <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                {isDragOver ? 'Release to Add Files' : 'Drop files here or click to browse'}
              </h3>
              <p className="text-xs text-surface-400 mt-1.5 max-w-sm mx-auto">
                CIMs, T12s, rent rolls, proformas, offering memoranda — CIL will identify and extract everything.
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-surface-300">
                <span>PDF, Excel, CSV</span>
                <span>·</span>
                <span>Max 50MB per file</span>
                <span>·</span>
                <span>AI-powered extraction</span>
              </div>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-surface-600 dark:text-surface-300">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
                    className="text-[10px] text-surface-400 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {selectedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F0EEE9] dark:bg-surface-800/50"
                  >
                    <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-surface-700 dark:text-surface-200 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-surface-400">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-surface-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}

                {intakeError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {intakeError}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 neu-button-primary rounded-xl text-sm font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Process {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''} with CIL
                </button>
              </div>
            )}
          </>
        )}

        {/* ---------- STEP: UPLOADING — Progress ---------- */}
        {intakeStep === 'uploading' && (
          <div className="py-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                CIL is processing your documents...
              </h3>
              <p className="text-xs text-surface-400 mt-1">
                Parsing files, extracting facilities, classifying documents
              </p>
            </div>
            {/* Progress bar */}
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-primary-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-surface-400">
                <span>Processing</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 text-[10px] text-surface-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Newo standing by
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Dev standing by
              </span>
            </div>
          </div>
        )}

        {/* ---------- STEP: RESULTS — Review extracted data ---------- */}
        {intakeStep === 'results' && intakeResult && (
          <div className="space-y-5">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  CIL extracted {intakeResult.extractedFacilities.length} facilit{intakeResult.extractedFacilities.length === 1 ? 'y' : 'ies'} from {intakeResult.files.length} file{intakeResult.files.length > 1 ? 's' : ''}
                </div>
                <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                  Review the details below and create your deal
                </div>
              </div>
            </div>

            {/* Deal name input */}
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-300 mb-1.5">
                Deal Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editedDealName}
                  onChange={(e) => setEditedDealName(e.target.value)}
                  className="neu-input w-full text-sm pr-8"
                  placeholder="Enter deal name..."
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-300 pointer-events-none" />
              </div>
            </div>

            {/* Deal metadata row */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0EEE9] dark:bg-surface-800/50 text-xs">
                <Building2 className="w-3.5 h-3.5 text-primary-500" />
                <span className="font-medium text-surface-700 dark:text-surface-200">
                  {intakeResult.suggestedAssetType}
                </span>
              </div>
              {intakeResult.suggestedState && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0EEE9] dark:bg-surface-800/50 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" />
                  <span className="font-medium text-surface-700 dark:text-surface-200">
                    {intakeResult.suggestedState}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0EEE9] dark:bg-surface-800/50 text-xs">
                <FileText className="w-3.5 h-3.5 text-surface-400" />
                <span className="text-surface-500">
                  {intakeResult.files.length} document{intakeResult.files.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Extracted facilities */}
            <div>
              <h3 className="text-xs font-bold text-surface-700 dark:text-surface-200 mb-2">
                Extracted Facilities
              </h3>
              <div className="space-y-2">
                {editedFacilities.map((fac, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F0EEE9] dark:bg-surface-800/50 border border-surface-200/50 dark:border-surface-700/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={fac.name}
                          onChange={(e) => {
                            const updated = [...editedFacilities];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditedFacilities(updated);
                          }}
                          className="neu-input w-full text-xs font-medium py-1.5"
                        />
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-surface-400">
                          {fac.state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {fac.state}
                            </span>
                          )}
                          {fac.licensedBeds != null && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="w-3 h-3" />
                              {fac.licensedBeds} beds
                            </span>
                          )}
                          <span className={cn(
                            'px-1.5 py-0.5 rounded-full font-medium',
                            fac.assetType === 'SNF' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' :
                            fac.assetType === 'ALF' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                            'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                          )}>
                            {fac.assetType}
                          </span>
                          {fac.ccn && (
                            <span className="font-mono text-surface-300">CCN: {fac.ccn}</span>
                          )}
                        </div>
                      </div>
                      {/* Confidence indicator */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <div className={cn(
                          'text-[10px] font-bold',
                          fac.confidence >= 70 ? 'text-emerald-500' :
                          fac.confidence >= 40 ? 'text-amber-500' : 'text-red-400'
                        )}>
                          {fac.confidence}%
                        </div>
                        <div className="text-[9px] text-surface-300">conf</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document summaries */}
            {intakeResult.files.some((f) => f.summary) && (
              <div>
                <h3 className="text-xs font-bold text-surface-700 dark:text-surface-200 mb-2">
                  Document Summaries
                </h3>
                <div className="space-y-2">
                  {intakeResult.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#F0EEE9] dark:bg-surface-800/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3.5 h-3.5 text-primary-400" />
                        <span className="text-xs font-medium text-surface-700 dark:text-surface-200 truncate">
                          {file.filename}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                          {file.documentType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {file.summary && (
                        <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                          {file.summary}
                        </p>
                      )}
                      {file.keyFindings.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {file.keyFindings.slice(0, 3).map((finding, fi) => (
                            <span
                              key={fi}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400"
                            >
                              {finding.length > 60 ? finding.slice(0, 60) + '...' : finding}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleCreateDeal}
                disabled={!editedDealName.trim() || editedFacilities.length === 0}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 neu-button-primary rounded-xl text-sm font-medium transition-opacity',
                  (!editedDealName.trim() || editedFacilities.length === 0) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Create Deal
              </button>
              <button
                onClick={resetIntake}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP: CREATING — Spinner ---------- */}
        {intakeStep === 'creating' && (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                Creating your deal...
              </h3>
              <p className="text-xs text-surface-400 mt-1">
                Setting up facilities, analysis stages, and documents
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How Dual-Brain Analysis Works */}
      <div className="neu-card-warm p-6">
        <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100 mb-5">
          How Dual-Brain Analysis Works
        </h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary-300 via-teal-300 to-orange-300" />

          <div className="space-y-6">
            {ANALYSIS_PHASES.map((phase, i) => (
              <div key={phase.id} className="flex items-start gap-4 relative">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10',
                  i < 2 ? 'bg-primary-100 dark:bg-primary-500/10' :
                  i < 4 ? (i === 2 ? 'bg-teal-100 dark:bg-teal-500/10' : 'bg-orange-100 dark:bg-orange-500/10') :
                  'bg-surface-100 dark:bg-surface-800'
                )}>
                  <phase.icon className={cn(
                    'w-4 h-4',
                    i < 2 ? 'text-primary-500' :
                    i === 2 ? 'text-teal-500' :
                    i === 3 ? 'text-orange-500' :
                    'text-surface-500'
                  )} />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                      {phase.label}
                    </h3>
                    <span className="text-[10px] text-surface-300 font-mono">{phase.duration}</span>
                    {i === 2 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 font-medium">NEWO</span>}
                    {i === 3 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-medium">DEV</span>}
                    {i === 4 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 font-medium">TENSION</span>}
                    {i === 5 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 font-medium">CIL</span>}
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What Each Brain Evaluates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Newo */}
        <div className="neu-card-warm p-5 border-l-4 border-teal-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <h3 className="text-sm font-bold text-teal-700 dark:text-teal-400">Newo Evaluates</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Operational Viability Score', desc: '0-100 — Can Cascadia actually run this?' },
              { label: 'Staffing Feasibility', desc: 'HPPD, agency dependency, turnover, labor market depth' },
              { label: 'Quality Remediation', desc: 'Deficiency patterns, SFF risk, remediation cost/timeline' },
              { label: 'Platform Synergies', desc: 'Mgmt fee savings, GPO, PDPM billing, referral network' },
              { label: 'Reimbursement Upside', desc: 'PDPM gaps, quality bonuses, state supplement programs' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{item.label}</div>
                  <div className="text-[10px] text-surface-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dev */}
        <div className="neu-card-warm p-5 border-l-4 border-orange-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400">Dev Evaluates</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: '4-Scenario Valuation', desc: 'Bear / Base / Bull / Cascadia-Normalized models' },
              { label: 'Deal Structure', desc: 'Bid strategy, R&W insurance, earnouts, conditions precedent' },
              { label: 'Seller Intelligence', desc: 'PE exit windows, founder motivation, timing signals' },
              { label: 'IPO Impact', desc: 'Post-acquisition ops count, revenue scale, multiple expansion' },
              { label: 'Pipeline Positioning', desc: 'Tier ranking, geographic overlap, cluster potential' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{item.label}</div>
                  <div className="text-[10px] text-surface-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      {recentDeals.length > 0 && (
        <div className="neu-card-warm p-5">
          <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            Recent Analyses
          </h2>
          <div className="space-y-2">
            {recentDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/app/deals/${deal.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[#EFEDE8] dark:hover:bg-surface-800/50 transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{deal.name}</div>
                  <div className="text-[10px] text-surface-400">
                    {deal.assetType} · {deal.primaryState} · {deal.beds} beds
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  {deal.confidenceScore && (
                    <span className={cn(
                      'text-xs font-bold',
                      deal.confidenceScore >= 80 ? 'text-emerald-500' :
                      deal.confidenceScore >= 60 ? 'text-amber-500' : 'text-red-400'
                    )}>
                      {deal.confidenceScore}%
                    </span>
                  )}
                  <ArrowRight className="w-3 h-3 text-surface-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
