'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  Sparkles,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
} from 'lucide-react';

interface ExtractedField {
  value: string | number;
  confidence: number;
  source?: string;
}

interface DocOverviewCardProps {
  documentId: string;
  filename: string;
  docType: string;
  status: string;
  uploadedAt: string;
  summary?: string;
  keyFindings?: string[];
  confidence?: number;
  extractedFields?: Record<string, ExtractedField>;
  pendingClarifications?: number;
  onViewDocument?: () => void;
}

function formatFieldValue(value: string | number): string {
  if (typeof value === 'number') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }
  return String(value);
}

export function DocOverviewCard({
  documentId,
  filename,
  docType,
  status,
  uploadedAt,
  summary,
  keyFindings,
  confidence,
  extractedFields,
  pendingClarifications,
  onViewDocument,
}: DocOverviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isAnalyzed = status === 'complete' && summary;
  const isProcessing = ['parsing', 'extracting', 'normalizing', 'analyzing'].includes(status);

  const confidenceLevel = confidence
    ? confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low'
    : null;

  const confidenceStyles = {
    high: 'bg-emerald-500',
    medium: 'bg-amber-500',
    low: 'bg-red-500',
  };

  const fields = extractedFields ? Object.entries(extractedFields).slice(0, 8) : [];
  const highConfFields = fields.filter(([, f]) => f.confidence >= 0.8).length;
  const totalFields = fields.length;

  return (
    <div className="neu-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors text-left"
      >
        {/* Status indicator */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          isAnalyzed ? 'bg-emerald-100 dark:bg-emerald-900/30' :
          isProcessing ? 'bg-amber-100 dark:bg-amber-900/30' :
          status === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
          'bg-surface-100 dark:bg-surface-800'
        )}>
          {isAnalyzed ? (
            <Sparkles className="w-5 h-5 text-emerald-600" />
          ) : isProcessing ? (
            <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
          ) : status === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <FileText className="w-5 h-5 text-surface-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 truncate">
              {filename}
            </p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500 flex-shrink-0">
              {docType?.replace(/_/g, ' ') || 'unknown'}
            </span>
          </div>

          {/* Summary preview */}
          {isAnalyzed && summary && (
            <p className="text-xs text-surface-500 mt-1 line-clamp-2">{summary}</p>
          )}

          {isProcessing && (
            <p className="text-xs text-amber-600 mt-1">Processing document...</p>
          )}

          {status === 'error' && (
            <p className="text-xs text-red-600 mt-1">Analysis failed — retry or upload again</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-surface-400">
            <span>{new Date(uploadedAt).toLocaleDateString()}</span>
            {totalFields > 0 && (
              <span>{totalFields} fields extracted</span>
            )}
            {pendingClarifications && pendingClarifications > 0 && (
              <span className="text-amber-600">{pendingClarifications} clarifications needed</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Confidence bar */}
          {confidence != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', confidenceStyles[confidenceLevel!])}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-surface-600 dark:text-surface-400">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          )}
          <ChevronDown className={cn('w-4 h-4 text-surface-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-surface-200 dark:border-surface-700 p-4 space-y-4">
          {/* Full summary */}
          {summary && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">AI Summary</p>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400">{summary}</p>
            </div>
          )}

          {/* Key Findings */}
          {keyFindings && keyFindings.length > 0 && (
            <div>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium mb-2">Key Findings</p>
              <div className="space-y-1.5">
                {keyFindings.map((finding, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-surface-600 dark:text-surface-400">{finding}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Fields Grid */}
          {fields.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">Extracted Fields</p>
                <p className="text-[10px] text-surface-400">{highConfFields}/{totalFields} high confidence</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {fields.map(([key, field]) => (
                  <div
                    key={key}
                    className={cn(
                      'rounded-lg px-3 py-2',
                      field.confidence >= 0.8
                        ? 'bg-emerald-50 dark:bg-emerald-950/20'
                        : field.confidence >= 0.5
                        ? 'bg-amber-50 dark:bg-amber-950/20'
                        : 'bg-red-50 dark:bg-red-950/20'
                    )}
                  >
                    <p className="text-[10px] text-surface-500 capitalize truncate">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </p>
                    <p className="text-xs font-bold text-surface-900 dark:text-surface-50 truncate">
                      {formatFieldValue(field.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
            {onViewDocument && (
              <button
                onClick={onViewDocument}
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Document
              </button>
            )}
            {pendingClarifications && pendingClarifications > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600">
                <Info className="w-3.5 h-3.5" />
                {pendingClarifications} clarifications pending
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
