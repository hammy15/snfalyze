'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles, List } from 'lucide-react';
import { DealIntake } from '@/components/intake/DealIntake';
import { SmartIntakePipeline } from '@/components/smart-intake/SmartIntakePipeline';

export default function NewDealPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [useSmart, setUseSmart] = useState(mode !== 'legacy');

  // Check for files passed via sessionStorage from QuickDrop
  const [quickDropFiles, setQuickDropFiles] = useState<File[]>([]);
  useEffect(() => {
    const stored = sessionStorage.getItem('pipeline-quick-drop-files');
    if (stored) {
      sessionStorage.removeItem('pipeline-quick-drop-files');
      try {
        const fileData: Array<{ name: string; type: string; base64: string }> = JSON.parse(stored);
        const files = fileData.map((f) => {
          const bytes = atob(f.base64);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          return new File([arr], f.name, { type: f.type });
        });
        setQuickDropFiles(files);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  return (
    <div className="py-8 px-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              New Deal
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              {useSmart
                ? 'Drop your broker packages and let AI handle the rest'
                : 'Drop your broker package, enter a CMS number, or start with basics'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50">
            <button
              onClick={() => setUseSmart(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                useSmart
                  ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-500/30'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Pipeline
            </button>
            <button
              onClick={() => setUseSmart(false)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                !useSmart
                  ? 'bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 border border-surface-300 dark:border-surface-600 shadow-sm'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
              )}
            >
              <List className="w-3.5 h-3.5" />
              Standard
            </button>
          </div>
        </div>
      </div>

      {/* Intake Mode */}
      {useSmart ? (
        <SmartIntakePipeline
          initialFiles={quickDropFiles.length > 0 ? quickDropFiles : undefined}
          onCancel={() => setUseSmart(false)}
        />
      ) : (
        <DealIntake />
      )}
    </div>
  );
}
