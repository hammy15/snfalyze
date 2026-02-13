'use client';

import { cn } from '@/lib/utils';
import {
  Upload,
  FileSearch,
  Building2,
  Brain,
  CheckCircle,
  Loader2,
} from 'lucide-react';

type IntakeStage = 'uploading' | 'parsing' | 'extracting' | 'analyzing' | 'complete';

interface IntakeProgressProps {
  stage: IntakeStage;
  filesCount: number;
  currentFile?: string;
  facilitiesFound: number;
}

const STAGES: { id: IntakeStage; label: string; icon: any; description: string }[] = [
  { id: 'uploading', label: 'Uploading', icon: Upload, description: 'Sending files to server' },
  { id: 'parsing', label: 'Parsing', icon: FileSearch, description: 'Reading document contents' },
  { id: 'extracting', label: 'Extracting', icon: Building2, description: 'Identifying facilities & data' },
  { id: 'analyzing', label: 'AI Analysis', icon: Brain, description: 'Deep analysis & classification' },
  { id: 'complete', label: 'Complete', icon: CheckCircle, description: 'Ready for review' },
];

export function IntakeProgress({
  stage,
  filesCount,
  currentFile,
  facilitiesFound,
}: IntakeProgressProps) {
  const currentIdx = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="neu-card p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
          {stage === 'complete' ? (
            <CheckCircle className="w-8 h-8 text-white" />
          ) : (
            <Brain className="w-8 h-8 text-white animate-pulse" />
          )}
        </div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
          {stage === 'complete' ? 'Analysis Complete' : 'Analyzing Your Deal'}
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {filesCount} file{filesCount !== 1 ? 's' : ''} being processed
          {facilitiesFound > 0 && ` · ${facilitiesFound} facilities found`}
        </p>
        {currentFile && stage !== 'complete' && (
          <p className="text-xs text-primary-500 mt-2 font-mono truncate max-w-xs mx-auto">
            {currentFile}
          </p>
        )}
      </div>

      {/* Progress Steps */}
      <div className="space-y-1">
        {STAGES.map((s, idx) => {
          const isActive = s.id === stage;
          const isComplete = idx < currentIdx;
          const isPending = idx > currentIdx;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500',
                isActive && 'bg-primary-50 dark:bg-primary-950/30',
                isComplete && 'opacity-60',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300',
                  isActive && 'bg-primary-500 shadow-md shadow-primary-500/30',
                  isComplete && 'bg-emerald-500',
                  isPending && 'bg-surface-100 dark:bg-surface-800',
                )}
              >
                {isActive ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : isComplete ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Icon className={cn('w-5 h-5', isPending ? 'text-surface-400' : 'text-white')} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isActive && 'text-primary-600 dark:text-primary-400',
                    isComplete && 'text-surface-600 dark:text-surface-400',
                    isPending && 'text-surface-400 dark:text-surface-600',
                  )}
                >
                  {s.label}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isActive ? 'text-primary-500/70' : 'text-surface-400 dark:text-surface-600',
                  )}
                >
                  {s.description}
                </p>
              </div>

              {isActive && (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
