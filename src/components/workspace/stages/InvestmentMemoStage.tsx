'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Wand2, Download, Eye, Edit3, Loader2, Check } from 'lucide-react';
import type { InvestmentMemoStageData, MemoSection } from '@/types/workspace';

interface InvestmentMemoStageProps {
  dealId: string;
  stageData: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

const MEMO_SECTIONS = [
  { id: 'executive_summary', title: 'Executive Summary' },
  { id: 'facility_overview', title: 'Facility Overview' },
  { id: 'market_analysis', title: 'Market Analysis' },
  { id: 'financial_analysis', title: 'Financial Analysis' },
  { id: 'risk_assessment', title: 'Risk Assessment' },
  { id: 'investment_thesis', title: 'Investment Thesis & Value Creation' },
  { id: 'due_diligence', title: 'Due Diligence Checklist' },
  { id: 'recommendation', title: 'Recommendation' },
];

export function InvestmentMemoStage({ dealId, stageData, onUpdate }: InvestmentMemoStageProps) {
  const [activeSection, setActiveSection] = useState('executive_summary');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const data = stageData as Partial<InvestmentMemoStageData>;
  const sections = data.sections || [];
  const currentSection = sections.find(s => s.id === activeSection);
  const status = data.status || 'not_started';

  const generateMemo = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workspace/memo`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        onUpdate({
          sections: result.sections,
          memoId: result.memoId,
          status: 'draft',
        });
      }
    } catch (err) {
      console.error('Failed to generate memo:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSectionContent = (sectionId: string, content: string) => {
    onUpdate({
      sections: sections.map(s =>
        s.id === sectionId ? { ...s, content, isEdited: true } : s
      ),
    });
  };

  const regenerateSection = async (sectionId: string) => {
    try {
      const res = await fetch(`/api/deals/${dealId}/workspace/memo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSection: sectionId }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.section) {
          onUpdate({
            sections: sections.map(s =>
              s.id === sectionId ? { ...result.section, isEdited: false } : s
            ),
          });
        }
      }
    } catch (err) {
      console.error('Failed to regenerate section:', err);
    }
  };

  const exportMemo = async (format: 'pdf' | 'docx') => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workspace/memo/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investment-memo.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        onUpdate({ lastExportedAt: new Date().toISOString(), exportFormat: format });
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (status === 'not_started') {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <FileText className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-2">Generate Investment Memo</h3>
        <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
          Auto-generate a professional 8-section investment memorandum from your deal data. You can edit every section after generation.
        </p>
        <button
          onClick={generateMemo}
          disabled={isGenerating}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {isGenerating ? 'Generating Memo...' : 'Generate Investment Memo'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex gap-4 h-full">
      {/* Section navigation */}
      <div className="w-56 shrink-0 space-y-1">
        {MEMO_SECTIONS.map(sec => {
          const section = sections.find(s => s.id === sec.id);
          const hasContent = !!section?.content;
          const isActive = activeSection === sec.id;

          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              )}
            >
              <div className="flex items-center gap-2">
                {hasContent ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-surface-300 dark:border-surface-600 shrink-0" />
                )}
                <span className="truncate">{sec.title}</span>
              </div>
            </button>
          );
        })}

        {/* Export buttons */}
        <div className="border-t border-surface-200 dark:border-surface-700 pt-3 mt-3 space-y-2">
          <button
            onClick={() => exportMemo('pdf')}
            disabled={isExporting}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            onClick={() => exportMemo('docx')}
            disabled={isExporting}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export DOCX
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
            {MEMO_SECTIONS.find(s => s.id === activeSection)?.title}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => regenerateSection(activeSection)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            >
              <Wand2 className="w-3 h-3" /> Regenerate
            </button>
            <div className="flex bg-surface-200 dark:bg-surface-700 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('edit')}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  viewMode === 'edit' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'text-surface-500'
                )}
              >
                <Edit3 className="w-3 h-3 inline mr-1" />Edit
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  viewMode === 'preview' ? 'bg-white dark:bg-surface-600 shadow-sm' : 'text-surface-500'
                )}
              >
                <Eye className="w-3 h-3 inline mr-1" />Preview
              </button>
            </div>
          </div>
        </div>

        {/* Section content */}
        <div className="p-5">
          {viewMode === 'edit' ? (
            <textarea
              value={currentSection?.content || ''}
              onChange={e => updateSectionContent(activeSection, e.target.value)}
              placeholder={`Write or edit the ${MEMO_SECTIONS.find(s => s.id === activeSection)?.title} section...`}
              className="w-full min-h-[400px] text-sm text-surface-800 dark:text-surface-200 bg-transparent border-none outline-none resize-y leading-relaxed placeholder-surface-400"
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none min-h-[400px]">
              {currentSection?.content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-surface-800 dark:text-surface-200">
                  {currentSection.content}
                </div>
              ) : (
                <p className="text-surface-400 italic">No content yet. Generate or write this section.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
