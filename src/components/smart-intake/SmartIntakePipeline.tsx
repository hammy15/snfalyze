'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Sparkles,
  AlertTriangle,
  Building2,
  Check,
  Loader2,
  ArrowLeft,
  Star,
  Shield,
} from 'lucide-react';
import { PipelineTimeline } from './PipelineTimeline';
import { ClarificationCards } from './ClarificationCards';
import { PipelineResults } from './PipelineResults';
import { DealProfileCard } from './DealProfileCard';
import { usePipelineStream } from '@/hooks/use-pipeline-stream';
import type { ClarificationAnswer } from '@/lib/pipeline/types';

interface SmartIntakePipelineProps {
  /** Pre-supplied files (e.g., from QuickDrop) */
  initialFiles?: File[];
  onCancel?: () => void;
}

export function SmartIntakePipeline({ initialFiles, onCancel }: SmartIntakePipelineProps) {
  const [isDragging, setIsDragging] = useState(false);

  const pipeline = usePipelineStream({
    onRedFlag: (flag) => {
      console.log(`[Pipeline] Red flag: ${flag.severity} — ${flag.message}`);
    },
  });

  // Auto-start if files were provided
  const [autoStarted, setAutoStarted] = useState(false);
  if (initialFiles && initialFiles.length > 0 && !autoStarted && pipeline.status === 'idle') {
    setAutoStarted(true);
    pipeline.startPipeline(initialFiles);
  }

  // File handlers
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        pipeline.startPipeline(files);
      }
    },
    [pipeline]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        pipeline.startPipeline(files);
      }
    },
    [pipeline]
  );

  const handleClarificationSubmit = useCallback(
    (answers: ClarificationAnswer[]) => {
      pipeline.submitClarifications(answers);
    },
    [pipeline]
  );

  // ========================================================================
  // IDLE STATE — Warm neumorphic drop zone
  // ========================================================================

  if (pipeline.status === 'idle') {
    return (
      <div className="max-w-3xl mx-auto py-12">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-sm text-[var(--warm-text-secondary)] hover:text-[var(--warm-text)] dark:text-surface-400 dark:hover:text-surface-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to standard intake
          </button>
        )}

        <div className="text-center mb-8">
          <div className="neu-pill-warm w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--warm-text)] dark:text-surface-100 mb-2">
            Smart Intake Pipeline
          </h1>
          <p className="text-sm text-[var(--warm-text-secondary)] dark:text-surface-400 max-w-md mx-auto">
            Drop your broker packages and let AI do the rest. We&apos;ll parse, extract, analyze,
            and run all relevant financial tools automatically.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all text-center',
            isDragging
              ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-500/10 scale-[1.02]'
              : 'border-[#D6D3CD] dark:border-surface-700/50 bg-[var(--warm-bg)] dark:bg-surface-900/30 hover:border-primary-300 dark:hover:border-surface-600 hover:bg-[var(--warm-surface)] dark:hover:bg-surface-800/30'
          )}
          style={{
            boxShadow: isDragging
              ? 'inset 3px 3px 6px var(--warm-shadow-dark), inset -3px -3px 6px var(--warm-shadow-light)'
              : '6px 6px 14px var(--warm-shadow-dark), -6px -6px 14px var(--warm-shadow-light)',
          }}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className={cn(
            'neu-pill-warm w-14 h-14 flex items-center justify-center mx-auto mb-4 transition-colors',
            isDragging && 'text-primary-500'
          )}>
            {isDragging ? <Sparkles className="w-7 h-7 text-primary-500" /> : <Upload className="w-7 h-7 text-[var(--warm-text-secondary)] dark:text-surface-500" />}
          </div>
          <p className={cn(
            'text-lg font-semibold mb-1 transition-colors',
            isDragging ? 'text-primary-600 dark:text-primary-300' : 'text-[var(--warm-text)] dark:text-surface-200'
          )}>
            {isDragging ? 'Drop to start pipeline' : 'Drop broker packages here'}
          </p>
          <p className="text-sm text-[var(--warm-text-secondary)] dark:text-surface-500">
            PDF, Excel, CSV — AI will parse everything automatically
          </p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ACTIVE PIPELINE — Split View Layout
  // ========================================================================

  return (
    <div className="max-w-6xl mx-auto">
      {/* Timeline */}
      <div className="neu-card-warm mb-4">
        <PipelineTimeline
          currentPhase={pipeline.phase}
          completedPhases={pipeline.completedPhases}
          phaseProgress={pipeline.phaseProgress}
          isPaused={pipeline.isPaused}
        />
      </div>

      {/* Split View: Left 60% + Right 40% */}
      <div className="flex gap-4 items-start">
        {/* LEFT PANEL — Live Activity Feed */}
        <div className="w-[60%] min-w-0 flex-shrink-0">
          {/* Error State */}
          {pipeline.status === 'failed' && (
            <div className="neu-card-warm border border-rose-200 dark:border-rose-500/30 p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-300 mb-1">Pipeline Error</h3>
              <p className="text-sm text-rose-600 dark:text-rose-400/80 mb-4">{pipeline.error}</p>
              <button
                onClick={() => pipeline.reset()}
                className="neu-button text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Clarification Phase */}
          {pipeline.isPaused && pipeline.clarifications.length > 0 && (
            <div className="neu-card-warm">
              <ClarificationCards
                clarifications={pipeline.clarifications}
                onSubmit={handleClarificationSubmit}
              />
            </div>
          )}

          {/* Running Phases */}
          {pipeline.status === 'running' && !pipeline.isPaused && (
            <div className="neu-card-warm">
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="neu-pill-warm w-9 h-9 flex items-center justify-center">
                  <Loader2 className="w-4.5 h-4.5 text-primary-500 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--warm-text)] dark:text-surface-200">
                    {pipeline.phase.charAt(0).toUpperCase() + pipeline.phase.slice(1)}
                  </h3>
                  <p className="text-xs text-[var(--warm-text-secondary)] dark:text-surface-500">{pipeline.phaseMessage}</p>
                </div>
                {pipeline.phaseProgress > 0 && (
                  <span className="ml-auto text-sm font-bold text-primary-600 dark:text-primary-400">
                    {pipeline.phaseProgress}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-5 neu-inset-warm">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${pipeline.phaseProgress}%` }}
                />
              </div>

              {/* Live event feed */}
              <div className="neu-inset-warm p-3 space-y-2 max-h-72 overflow-y-auto">
                {/* Parsed files */}
                {pipeline.parsedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg bg-[var(--warm-bg)] dark:bg-surface-800/50">
                    <FileText className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[var(--warm-text)] dark:text-surface-300 truncate">{file.filename}</span>
                    <span className="text-[var(--warm-text-secondary)] dark:text-surface-500 ml-auto flex-shrink-0">
                      {file.docType.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}

                {/* Detected facilities */}
                {pipeline.detectedFacilities.map((f, i) => (
                  <div key={`facility-${i}`} className="flex items-center gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">{f.name}</span>
                    {f.beds && <span className="text-[var(--warm-text-secondary)] dark:text-surface-500">{f.beds} beds</span>}
                    {f.state && <span className="text-[var(--warm-text-secondary)] dark:text-surface-500">{f.state}</span>}
                  </div>
                ))}

                {/* CMS matches */}
                {pipeline.cmsMatches.map((m, i) => (
                  <div key={`cms-${i}`} className="flex items-center gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[var(--warm-text)] dark:text-surface-300">CMS:</span>
                    <span className="text-amber-700 dark:text-amber-300">{m.facilityName}</span>
                    <span className="text-amber-600 dark:text-amber-400 ml-auto">{m.stars}-star</span>
                  </div>
                ))}

                {/* Red flags */}
                {pipeline.redFlags.map((flag) => (
                  <div key={flag.id} className={cn(
                    'flex items-start gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg',
                    flag.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-500/5' : 'bg-amber-50 dark:bg-amber-500/5'
                  )}>
                    <AlertTriangle className={cn(
                      'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                      flag.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'
                    )} />
                    <span className={flag.severity === 'critical' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}>
                      {flag.message}
                    </span>
                  </div>
                ))}

                {/* Tool results */}
                {pipeline.toolResults.map((t, i) => (
                  <div key={`tool-${i}`} className="flex items-center gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/5">
                    <Check className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-primary-700 dark:text-primary-300">{t.headline || t.toolName}</span>
                  </div>
                ))}

                {/* Analysis score */}
                {pipeline.analysisScore !== null && (
                  <div className="flex items-center gap-2 text-xs animate-fade-in px-2 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-primary-700 dark:text-primary-300 font-medium">
                      Analysis complete — Score: {pipeline.analysisScore}
                    </span>
                  </div>
                )}

                {/* Empty state */}
                {pipeline.parsedFiles.length === 0 && pipeline.detectedFacilities.length === 0 && (
                  <div className="text-center py-6">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-[var(--warm-text-secondary)] dark:text-surface-500">
                      Processing your files...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete — Results */}
          {pipeline.status === 'completed' && pipeline.synthesis && pipeline.dealId && (
            <PipelineResults
              dealId={pipeline.dealId}
              dealName={pipeline.dealName || 'New Deal'}
              synthesis={pipeline.synthesis}
              redFlags={pipeline.redFlags}
              completenessScore={pipeline.completenessScore}
            />
          )}
        </div>

        {/* RIGHT PANEL — Deal Profile Card */}
        <div className="w-[40%] flex-shrink-0">
          <DealProfileCard
            dealName={pipeline.dealName}
            parsedFiles={pipeline.parsedFiles}
            detectedFacilities={pipeline.detectedFacilities}
            cmsMatches={pipeline.cmsMatches}
            completenessScore={pipeline.completenessScore}
            missingDocuments={pipeline.missingDocuments}
            redFlags={pipeline.redFlags}
            analysisScore={pipeline.analysisScore}
            analysisThesis={pipeline.analysisThesis}
            toolResults={pipeline.toolResults}
            synthesis={pipeline.synthesis}
            isRunning={pipeline.status === 'running'}
          />
        </div>
      </div>
    </div>
  );
}
