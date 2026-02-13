'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { DocSummaryBadge } from './DocSummaryBadge';

interface UploadedDoc {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  docType?: string;
  summary?: string;
  keyFindings?: string[];
  confidence?: number;
  error?: string;
}

interface DocUploadWithAnalysisProps {
  dealId: string;
  onDocumentUploaded?: (doc: UploadedDoc) => void;
  className?: string;
}

export function DocUploadWithAnalysis({
  dealId,
  onDocumentUploaded,
  className,
}: DocUploadWithAnalysisProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUpload = useCallback((id: string, updates: Partial<UploadedDoc>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const pollForCompletion = useCallback(async (docId: string, uploadId: string) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/documents/${docId}/summary`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'complete') {
            const doc: Partial<UploadedDoc> = {
              status: 'complete',
              docType: data.type,
              summary: data.summary,
              keyFindings: data.keyFindings,
              confidence: data.confidence,
            };
            updateUpload(uploadId, doc);
            onDocumentUploaded?.({ id: docId, filename: '', ...doc } as UploadedDoc);
            return;
          }
          if (data.status === 'error') {
            updateUpload(uploadId, { status: 'error', error: 'Analysis failed' });
            return;
          }
        }
      } catch {}
    }
    updateUpload(uploadId, { status: 'error', error: 'Timed out waiting for analysis' });
  }, [updateUpload, onDocumentUploaded]);

  const uploadFile = useCallback(async (file: File) => {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const upload: UploadedDoc = {
      id: uploadId,
      filename: file.name,
      status: 'uploading',
    };
    setUploads(prev => [...prev, upload]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealId', dealId);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        updateUpload(uploadId, { status: 'error', error: err.error });
        return;
      }

      const data = await res.json();
      const docId = data.document?.id || data.id;
      updateUpload(uploadId, { id: docId, status: 'processing' });

      // Poll for completion
      pollForCompletion(docId, uploadId);
    } catch {
      updateUpload(uploadId, { status: 'error', error: 'Network error' });
    }
  }, [dealId, updateUpload, pollForCompletion]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => uploadFile(file));
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
          isDragOver
            ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
            : 'border-surface-300 dark:border-surface-600 hover:border-teal-300 hover:bg-surface-50/50 dark:hover:bg-surface-800/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2 py-8 px-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-surface-100 dark:bg-surface-800'
          )}>
            <Upload className={cn('w-6 h-6', isDragOver ? 'text-teal-600' : 'text-surface-400')} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Drop documents here or click to browse
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              PDF, Excel, CSV, images — AI will auto-analyze each file
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tiff"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress + results */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <div key={upload.id} className="relative">
              {upload.status === 'complete' ? (
                <DocSummaryBadge
                  filename={upload.filename}
                  docType={upload.docType || 'other'}
                  status="complete"
                  summary={upload.summary}
                  keyFindings={upload.keyFindings}
                  confidence={upload.confidence}
                />
              ) : (
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border',
                  upload.status === 'error'
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30'
                )}>
                  {upload.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" />
                  ) : upload.status === 'processing' ? (
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                      {upload.filename}
                    </p>
                    <p className="text-xs text-surface-500">
                      {upload.status === 'uploading' ? 'Uploading...' :
                       upload.status === 'processing' ? 'AI analyzing document...' :
                       upload.error || 'Error'}
                    </p>
                  </div>

                  {upload.status === 'error' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeUpload(upload.id); }}
                      className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
                    >
                      <X className="w-3.5 h-3.5 text-surface-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
