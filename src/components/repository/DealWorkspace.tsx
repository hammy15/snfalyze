'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  FileText,
  ChevronDown,
  Sparkles,
  Upload,
  Search,
} from 'lucide-react';
import { DocOverviewCard } from '@/components/documents/DocOverviewCard';
import { DocUploadWithAnalysis } from '@/components/documents/DocUploadWithAnalysis';

interface Deal {
  id: string;
  name: string;
  status: string;
}

interface DocItem {
  id: string;
  filename: string;
  type: string | null;
  status: string;
  createdAt: string;
  aiSummary?: string | null;
  aiKeyFindings?: string[] | null;
  extractedData?: any;
  pendingClarifications?: number;
}

interface DealWorkspaceProps {
  className?: string;
}

export function DealWorkspace({ className }: DealWorkspaceProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch deals
  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => {
        const dealList = data.data || data.deals || [];
        setDeals(dealList);
      })
      .catch(() => {});
  }, []);

  // Fetch documents for selected deal
  useEffect(() => {
    if (!selectedDealId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    fetch(`/api/deals/${selectedDealId}/documents`)
      .then(r => r.json())
      .then(data => {
        setDocuments(data.documents || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDealId]);

  const filteredDocs = searchQuery
    ? documents.filter(d => d.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  const analyzedCount = documents.filter(d => d.status === 'complete').length;
  const selectedDeal = deals.find(d => d.id === selectedDealId);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Deal Selector */}
      <div className="neu-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Deal Workspace
            </h3>
          </div>
          {selectedDeal && (
            <span className="text-xs text-surface-500">
              {documents.length} docs · {analyzedCount} analyzed
            </span>
          )}
        </div>

        {/* Deal pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDealId(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              !selectedDealId
                ? 'bg-teal-500 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            All Deals
          </button>
          {deals.map(deal => (
            <button
              key={deal.id}
              onClick={() => setSelectedDealId(deal.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors truncate max-w-[200px]',
                selectedDealId === deal.id
                  ? 'bg-teal-500 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
            >
              {deal.name}
            </button>
          ))}
        </div>
      </div>

      {/* Upload + Search when deal selected */}
      {selectedDealId && (
        <>
          <DocUploadWithAnalysis
            dealId={selectedDealId}
            onDocumentUploaded={() => {
              // Refresh documents
              fetch(`/api/deals/${selectedDealId}/documents`)
                .then(r => r.json())
                .then(data => setDocuments(data.documents || []))
                .catch(() => {});
            }}
          />

          {documents.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
          )}
        </>
      )}

      {/* Documents */}
      {loading ? (
        <div className="neu-card p-8 text-center">
          <div className="w-6 h-6 mx-auto border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-surface-500 mt-3">Loading documents...</p>
        </div>
      ) : selectedDealId && filteredDocs.length > 0 ? (
        <div className="space-y-2">
          {filteredDocs.map(doc => {
            const aiAnalysis = doc.extractedData?.aiAnalysis;
            return (
              <DocOverviewCard
                key={doc.id}
                documentId={doc.id}
                filename={doc.filename}
                docType={doc.type || 'other'}
                status={doc.status || 'uploaded'}
                uploadedAt={doc.createdAt}
                summary={doc.aiSummary || aiAnalysis?.summary}
                keyFindings={(doc.aiKeyFindings as string[]) || aiAnalysis?.keyFindings}
                confidence={aiAnalysis?.confidence}
                extractedFields={doc.extractedData?.fields}
                pendingClarifications={doc.pendingClarifications}
              />
            );
          })}
        </div>
      ) : selectedDealId ? (
        <div className="neu-card p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-sm text-surface-500">No documents for this deal</p>
          <p className="text-xs text-surface-400 mt-1">Drop files above to upload</p>
        </div>
      ) : (
        <div className="neu-card p-8 text-center">
          <FolderOpen className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-sm text-surface-500">Select a deal to view its documents</p>
          <p className="text-xs text-surface-400 mt-1">
            Each deal has its own workspace with AI-analyzed documents
          </p>
        </div>
      )}
    </div>
  );
}
