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
  // IDLE STATE — Drop zone
  // ========================================================================

  if (pipeline.status === 'idle') {
    return (
      <div className="max-w-3xl mx-auto py-12">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to standard intake
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100 mb-2">Smart Intake Pipeline</h1>
          <p className="text-sm text-surface-400 max-w-md mx-auto">
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
              ? 'border-primary-400 bg-primary-500/10 scale-[1.02]'
              : 'border-surface-700/50 bg-surface-900/30 hover:border-surface-600 hover:bg-surface-800/30'
          )}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
            isDragging ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-800 text-surface-500'
          )}>
            {isDragging ? <Sparkles className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
          </div>
          <p className={cn(
            'text-lg font-semibold mb-1 transition-colors',
            isDragging ? 'text-primary-300' : 'text-surface-200'
          )}>
            {isDragging ? 'Drop to start pipeline' : 'Drop broker packages here'}
          </p>
          <p className="text-sm text-surface-500">
            PDF, Excel, CSV — AI will parse everything automatically
          </p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // ACTIVE PIPELINE
  // ========================================================================

  return (
    <div className="max-w-4xl mx-auto">
      {/* Timeline */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 mb-4">
        <PipelineTimeline
          currentPhase={pipeline.phase}
          completedPhases={pipeline.completedPhases}
          phaseProgress={pipeline.phaseProgress}
          isPaused={pipeline.isPaused}
        />
      </div>

      <div className="flex gap-4">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Error State */}
          {pipeline.status === 'failed' && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-rose-300 mb-1">Pipeline Error</h3>
              <p className="text-sm text-rose-400/80 mb-4">{pipeline.error}</p>
              <button
                onClick={() => pipeline.reset()}
                className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 text-sm hover:bg-surface-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Clarification Phase */}
          {pipeline.isPaused && pipeline.clarifications.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-surface-900/30 backdrop-blur-xl p-6">
              <ClarificationCards
                clarifications={pipeline.clarifications}
                onSubmit={handleClarificationSubmit}
              />
            </div>
          )}

          {/* Running Phases (not paused, not complete, not error) */}
          {pipeline.status === 'running' && !pipeline.isPaused && (
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-6">
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                <div>
                  <h3 className="text-sm font-semibold text-surface-200">
                    {pipeline.phase.charAt(0).toUpperCase() + pipeline.phase.slice(1)}
                  </h3>
                  <p className="text-xs text-surface-500">{pipeline.phaseMessage}</p>
                </div>
                {pipeline.phaseProgress > 0 && (
                  <span className="ml-auto text-sm font-medium text-primary-400">
                    {pipeline.phaseProgress}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${pipeline.phaseProgress}%` }}
                />
              </div>

              {/* Live event feed */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Parsed files */}
                {pipeline.parsedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs animate-fade-in">
                    <FileText className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-surface-300">{file.filename}</span>
                    <span className="text-surface-600">·</span>
                    <span className="text-surface-500">{file.docType.replace(/_/g, ' ')}</span>
                    <span className="text-surface-600">·</span>
                    <span className="text-surface-500">{file.confidence}% confidence</span>
                  </div>
                ))}

                {/* Detected facilities */}
                {pipeline.detectedFacilities.map((f, i) => (
                  <div key={`facility-${i}`} className="flex items-center gap-2 text-xs animate-fade-in">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">{f.name}</span>
                    {f.beds && <span className="text-surface-500">{f.beds} beds</span>}
                    {f.state && <span className="text-surface-500">{f.state}</span>}
                  </div>
                ))}

                {/* CMS matches */}
                {pipeline.cmsMatches.map((m, i) => (
                  <div key={`cms-${i}`} className="flex items-center gap-2 text-xs animate-fade-in">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-surface-300">CMS Match:</span>
                    <span className="text-amber-300">{m.facilityName}</span>
                    <span className="text-surface-600">·</span>
                    <span className="text-amber-400">{m.stars}-star</span>
                  </div>
                ))}

                {/* Tool results */}
                {pipeline.toolResults.map((t, i) => (
                  <div key={`tool-${i}`} className="flex items-center gap-2 text-xs animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-primary-300">{t.headline || t.toolName}</span>
                  </div>
                ))}

                {/* Analysis score */}
                {pipeline.analysisScore !== null && (
                  <div className="flex items-center gap-2 text-xs animate-fade-in">
                    <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-primary-300">
                      Analysis complete — Score: {pipeline.analysisScore}
                    </span>
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

        {/* Sidebar — Live Stats */}
        <div className="w-56 flex-shrink-0 space-y-3">
          {/* Files */}
          <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-surface-500 mb-2">Files</h4>
            <div className="text-2xl font-bold text-surface-200">{pipeline.parsedFiles.length}</div>
            <div className="text-xs text-surface-500">documents parsed</div>
          </div>

          {/* Facilities */}
          <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-surface-500 mb-2">Facilities</h4>
            <div className="text-2xl font-bold text-surface-200">{pipeline.detectedFacilities.length}</div>
            <div className="text-xs text-surface-500">detected</div>
          </div>

          {/* Completeness */}
          <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-surface-500 mb-2">Completeness</h4>
            <div className={cn(
              'text-2xl font-bold',
              pipeline.completenessScore >= 70 ? 'text-emerald-400' :
              pipeline.completenessScore >= 40 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {pipeline.completenessScore}%
            </div>
            {pipeline.missingDocuments.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {pipeline.missingDocuments.slice(0, 3).map((doc, i) => (
                  <div key={i} className="text-[10px] text-surface-500 truncate">
                    Missing: {doc}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Red Flags */}
          {pipeline.redFlags.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <h4 className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Red Flags
              </h4>
              <div className="text-2xl font-bold text-amber-400">{pipeline.redFlags.length}</div>
              <div className="mt-1.5 space-y-1">
                {pipeline.redFlags.slice(0, 3).map((flag) => (
                  <div key={flag.id} className="flex items-start gap-1 text-[10px]">
                    <AlertTriangle className={cn(
                      'w-2.5 h-2.5 mt-0.5 flex-shrink-0',
                      flag.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                    )} />
                    <span className={flag.severity === 'critical' ? 'text-rose-300' : 'text-amber-300'}>
                      {flag.message.slice(0, 60)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CMS Matches */}
          {pipeline.cmsMatches.length > 0 && (
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-3">
              <h4 className="text-[10px] uppercase tracking-wider text-surface-500 mb-2">CMS Matches</h4>
              {pipeline.cmsMatches.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs mb-1">
                  <span className="text-surface-400 truncate mr-2">{m.facilityName}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star
                        key={s}
                        className={cn(
                          'w-2.5 h-2.5',
                          s < m.stars ? 'text-amber-400 fill-amber-400' : 'text-surface-700'
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
