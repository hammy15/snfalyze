'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';

export function QuickDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const serializeAndNavigate = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    try {
      // Serialize files to sessionStorage so the pipeline page can pick them up
      const fileData = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return {
            name: file.name,
            type: file.type,
            base64: btoa(binary),
          };
        })
      );
      sessionStorage.setItem('pipeline-quick-drop-files', JSON.stringify(fileData));
      router.push('/app/deals/new');
    } catch {
      // Fallback: just navigate without files
      router.push('/app/deals/new');
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      serializeAndNavigate(files);
    } else {
      router.push('/app/deals/new');
    }
  }, [router, serializeAndNavigate]);

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      router.push('/app/deals/new');
    }
  }, [router, isProcessing]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'relative rounded-2xl border-2 border-dashed px-6 py-5 cursor-pointer transition-all',
        'flex items-center gap-4',
        isProcessing && 'pointer-events-none opacity-70',
        isDragging
          ? 'border-primary-400 bg-primary-500/10 scale-[1.02]'
          : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600 hover:bg-surface-800/50'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
        isDragging
          ? 'bg-primary-500/20 text-primary-400'
          : 'bg-surface-800 text-surface-500'
      )}>
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
        ) : isDragging ? (
          <Sparkles className="w-5 h-5" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
      </div>
      <div>
        <p className={cn(
          'text-sm font-medium transition-colors',
          isDragging ? 'text-primary-300' : 'text-surface-300'
        )}>
          {isProcessing
            ? 'Preparing files...'
            : isDragging
              ? 'Drop to start Smart Pipeline'
              : 'Drop broker packages here to start a new deal'}
        </p>
        <p className="text-xs text-surface-500 mt-0.5">
          PDF, Excel, or CSV — AI will parse, extract, and analyze automatically
        </p>
      </div>
      <FileText className={cn(
        'w-5 h-5 ml-auto flex-shrink-0 transition-colors',
        isDragging ? 'text-primary-400' : 'text-surface-600'
      )} />
    </div>
  );
}
