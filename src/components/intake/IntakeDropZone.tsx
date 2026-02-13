'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  Hash,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

interface IntakeDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onCCNSubmit: (ccn: string) => void;
  onQuickStart: () => void;
  disabled?: boolean;
}

export function IntakeDropZone({
  onFilesSelected,
  onCCNSubmit,
  onQuickStart,
  disabled,
}: IntakeDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [ccnInput, setCcnInput] = useState('');
  const [mode, setMode] = useState<'drop' | 'ccn'>('drop');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && !disabled) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0 && !disabled) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleCCNSubmit = () => {
    const cleaned = ccnInput.trim();
    if (cleaned.length >= 5) {
      onCCNSubmit(cleaned);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden',
          isDragActive
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 scale-[1.01]'
            : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 dark:hover:border-primary-600',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Animated gradient background on drag */}
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-accent-500/5 to-primary-500/5 animate-pulse" />
        )}

        <div className="relative p-12 md:p-16">
          {mode === 'drop' ? (
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300',
                  isDragActive
                    ? 'bg-primary-500 shadow-lg shadow-primary-500/30 scale-110'
                    : 'bg-surface-100 dark:bg-surface-800'
                )}
              >
                {isDragActive ? (
                  <Zap className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <Upload className="w-10 h-10 text-surface-400 dark:text-surface-500" />
                )}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                {isDragActive ? 'Drop it like it\'s hot' : 'Drop your deal package'}
              </h2>
              <p className="text-surface-500 dark:text-surface-400 max-w-md mb-8">
                Broker packages, P&Ls, census reports, OMs — we&apos;ll extract everything
                and organize by facility, type, and state.
              </p>

              {/* File type badges */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {[
                  { icon: FileText, label: 'PDF', desc: 'Financials, OMs' },
                  { icon: FileSpreadsheet, label: 'Excel / CSV', desc: 'P&L, Census' },
                  { icon: Image, label: 'Images', desc: 'Scanned docs' },
                ].map((type) => (
                  <div
                    key={type.label}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
                  >
                    <type.icon className="w-4 h-4 text-primary-500" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">{type.label}</p>
                      <p className="text-[10px] text-surface-500">{type.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Browse button */}
              <Button size="lg" onClick={() => inputRef.current?.click()}>
                <Sparkles className="w-5 h-5" />
                Browse Files
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* CCN Entry Mode */
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-6">
                <Hash className="w-10 h-10 text-accent-500" />
              </div>
              <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                Look up by CMS Number
              </h2>
              <p className="text-surface-500 dark:text-surface-400 max-w-md mb-8">
                Enter a CMS Certification Number and we&apos;ll pull public data including ratings, beds, and surveys.
              </p>

              <div className="flex items-center gap-3 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. 50-5432"
                  value={ccnInput}
                  onChange={(e) => setCcnInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCCNSubmit()}
                  className="flex-1 px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-mono tracking-wider"
                />
                <Button
                  size="lg"
                  onClick={handleCCNSubmit}
                  disabled={ccnInput.trim().length < 5}
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => setMode('drop')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            mode === 'drop'
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          <Upload className="w-4 h-4" />
          Drop Files
        </button>
        <span className="text-surface-300 dark:text-surface-600">or</span>
        <button
          onClick={() => setMode('ccn')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            mode === 'ccn'
              ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          <Hash className="w-4 h-4" />
          CMS Number
        </button>
        <span className="text-surface-300 dark:text-surface-600">or</span>
        <button
          onClick={onQuickStart}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-all"
        >
          <Zap className="w-4 h-4" />
          Start from Scratch
        </button>
      </div>
    </div>
  );
}
