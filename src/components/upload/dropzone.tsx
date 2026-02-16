'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, FileSpreadsheet, Image, X, CheckCircle, Loader2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface UploadedFile {
  id: string;
  file: File;
  status: 'ready' | 'uploading' | 'uploaded' | 'parsing' | 'extracting' | 'normalizing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  type?: string;
  error?: string;
}

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

const acceptedTypes = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

export function Dropzone({ onFilesAccepted, uploadedFiles, onRemoveFile, disabled, className }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, [disabled]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesAccepted(files);
      }
    },
    [onFilesAccepted, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesAccepted(files);
      }
      // Reset so re-selecting the same file works
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFilesAccepted]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return FileText;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
    if (type.includes('image')) return Image;
    return FileText;
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'ready':
        return 'Ready to upload';
      case 'uploading':
        return 'Uploading...';
      case 'uploaded':
        return 'Uploaded — queued for processing';
      case 'parsing':
        return 'Extracting text & data...';
      case 'extracting':
        return 'Deep extraction...';
      case 'normalizing':
        return 'Mapping to Chart of Accounts...';
      case 'analyzing':
        return 'AI analyzing document...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Dropzone Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative block border-2 border-dashed rounded-xl p-12 text-center transition-all',
          disabled
            ? 'border-surface-200 bg-surface-50 cursor-not-allowed opacity-60'
            : isDragActive
              ? 'border-accent bg-accent/5 cursor-pointer'
              : 'border-surface-300 hover:border-accent/50 hover:bg-surface-50 cursor-pointer'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={Object.values(acceptedTypes).flat().join(',')}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'p-4 rounded-full transition-colors',
              isDragActive ? 'bg-accent/10' : 'bg-surface-100'
            )}
          >
            <Upload
              className={cn(
                'w-8 h-8 transition-colors',
                isDragActive ? 'text-accent' : 'text-surface-500'
              )}
            />
          </div>

          <div>
            <p className="text-lg font-medium text-surface-900">
              {isDragActive ? 'Drop files here' : 'Drop deal documents here'}
            </p>
            <p className="mt-1 text-sm text-surface-500">
              or <span className="text-accent font-medium underline">click to browse</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="px-2 py-1 text-xs bg-surface-100 text-surface-600 rounded">PDF</span>
            <span className="px-2 py-1 text-xs bg-surface-100 text-surface-600 rounded">Excel</span>
            <span className="px-2 py-1 text-xs bg-surface-100 text-surface-600 rounded">CSV</span>
            <span className="px-2 py-1 text-xs bg-surface-100 text-surface-600 rounded">Images</span>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-surface-700">
            Documents ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => {
              const Icon = getFileIcon(uploadedFile.file);
              const isProcessing = ['uploading', 'uploaded', 'parsing', 'extracting', 'normalizing', 'analyzing'].includes(
                uploadedFile.status
              );

              return (
                <div
                  key={uploadedFile.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-surface-200 bg-white"
                >
                  <div className="p-2 rounded-lg bg-surface-50">
                    <Icon className="w-5 h-5 text-surface-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-900 truncate">
                        {uploadedFile.file.name}
                      </p>
                      {uploadedFile.type && (
                        <span className="px-2 py-0.5 text-xs bg-surface-100 text-surface-600 rounded">
                          {uploadedFile.type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {uploadedFile.status === 'ready' ? (
                        <>
                          <Circle className="w-3 h-3 text-surface-400" />
                          <span className="text-xs text-surface-500">
                            {getStatusText(uploadedFile.status)}
                          </span>
                        </>
                      ) : isProcessing ? (
                        <>
                          <Loader2 className="w-3 h-3 text-accent animate-spin" />
                          <span className="text-xs text-surface-500">
                            {getStatusText(uploadedFile.status)}
                          </span>
                        </>
                      ) : uploadedFile.status === 'complete' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-status-success" />
                          <span className="text-xs text-status-success">Complete</span>
                        </>
                      ) : uploadedFile.status === 'error' ? (
                        <span className="text-xs text-status-error">
                          {uploadedFile.error || 'Processing failed'}
                        </span>
                      ) : null}
                    </div>

                    {isProcessing && (
                      <Progress
                        value={uploadedFile.progress}
                        size="sm"
                        variant={getStatusColor(uploadedFile.status) as 'default' | 'success' | 'error'}
                        className="mt-2"
                      />
                    )}
                  </div>

                  {!isProcessing && uploadedFile.status !== 'complete' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(uploadedFile.id);
                      }}
                      className="text-surface-400 hover:text-surface-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
