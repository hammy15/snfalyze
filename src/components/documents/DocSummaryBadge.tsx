'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface DocSummaryBadgeProps {
  filename: string;
  docType: string;
  status: string;
  summary?: string;
  keyFindings?: string[];
  confidence?: number;
  onExpand?: () => void;
}

const typeIcons: Record<string, typeof FileText> = {
  financial_statement: FileSpreadsheet,
  rent_roll: FileSpreadsheet,
  census_report: FileSpreadsheet,
  staffing_report: FileText,
  cost_report: FileSpreadsheet,
  survey_report: FileText,
  om_package: FileText,
  lease_agreement: FileText,
  appraisal: FileText,
};

const typeLabels: Record<string, string> = {
  financial_statement: 'Financial',
  rent_roll: 'Rent Roll',
  census_report: 'Census',
  staffing_report: 'Staffing',
  cost_report: 'Cost Report',
  survey_report: 'Survey',
  om_package: 'OM Package',
  lease_agreement: 'Lease',
  appraisal: 'Appraisal',
  other: 'Document',
};

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (confidence >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export function DocSummaryBadge({
  filename,
  docType,
  status,
  summary,
  keyFindings,
  confidence,
  onExpand,
}: DocSummaryBadgeProps) {
  const [showPreview, setShowPreview] = useState(false);
  const Icon = typeIcons[docType] || FileText;
  const label = typeLabels[docType] || docType?.replace(/_/g, ' ') || 'Document';
  const isAnalyzed = status === 'complete' && summary;

  return (
    <div className="group relative">
      {/* Badge Row */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer',
          isAnalyzed
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            : status === 'error'
            ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
            : 'border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 hover:bg-surface-100 dark:hover:bg-surface-800/50'
        )}
        onClick={() => {
          if (isAnalyzed) setShowPreview(!showPreview);
          onExpand?.();
        }}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', isAnalyzed ? 'text-emerald-600' : 'text-surface-400')} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
            {filename}
          </p>
          {isAnalyzed && summary && (
            <p className="text-xs text-surface-500 truncate mt-0.5">
              {summary.slice(0, 80)}{summary.length > 80 ? '...' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Type label */}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
            {label}
          </span>

          {/* Status */}
          {isAnalyzed ? (
            <>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', confidenceColor(confidence || 0))}>
                {Math.round((confidence || 0) * 100)}%
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            </>
          ) : status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : status === 'complete' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          )}

          {isAnalyzed && (
            <ChevronDown className={cn('w-3.5 h-3.5 text-surface-400 transition-transform', showPreview && 'rotate-180')} />
          )}
        </div>
      </div>

      {/* Expandable Preview */}
      {showPreview && isAnalyzed && (
        <div className="mt-1 px-3 py-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 space-y-2">
          <p className="text-xs text-surface-600 dark:text-surface-400">{summary}</p>
          {keyFindings && keyFindings.length > 0 && (
            <div>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Key Findings</p>
              <ul className="space-y-0.5">
                {keyFindings.slice(0, 3).map((finding, i) => (
                  <li key={i} className="text-xs text-surface-600 dark:text-surface-400 flex items-start gap-1">
                    <span className="text-emerald-500 mt-0.5">&#x2022;</span>
                    {finding}
                  </li>
                ))}
                {keyFindings.length > 3 && (
                  <li className="text-[10px] text-surface-500">+{keyFindings.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
