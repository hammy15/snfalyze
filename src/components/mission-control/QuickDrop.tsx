'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Sparkles,
} from 'lucide-react';

export function QuickDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Navigate to deal creation — files will be handled there
    router.push('/app/deals/new');
  }, [router]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => router.push('/app/deals/new')}
      className={cn(
        'relative rounded-2xl border-2 border-dashed px-6 py-5 cursor-pointer transition-all',
        'flex items-center gap-4',
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
        {isDragging ? <Sparkles className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
      </div>
      <div>
        <p className={cn(
          'text-sm font-medium transition-colors',
          isDragging ? 'text-primary-300' : 'text-surface-300'
        )}>
          {isDragging ? 'Drop to start a new deal' : 'Drop broker packages here to start a new deal'}
        </p>
        <p className="text-xs text-surface-500 mt-0.5">
          PDF, Excel, or CSV — AI will extract facilities and financials
        </p>
      </div>
      <FileText className={cn(
        'w-5 h-5 ml-auto flex-shrink-0 transition-colors',
        isDragging ? 'text-primary-400' : 'text-surface-600'
      )} />
    </div>
  );
}
