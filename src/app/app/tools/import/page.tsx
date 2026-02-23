'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  Trash2,
  MapPin,
  Building2,
} from 'lucide-react';

interface ParsedRow {
  name: string;
  ccn?: string;
  state?: string;
  beds?: number;
  askingPrice?: number;
  assetType?: string;
  source?: string;
  notes?: string;
  [key: string]: string | number | undefined;
}

interface ColumnMapping {
  csvColumn: string;
  dealField: string;
}

const DEAL_FIELDS = [
  { key: 'name', label: 'Deal/Facility Name', required: true },
  { key: 'ccn', label: 'CCN (Provider Number)', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'beds', label: 'Beds', required: false },
  { key: 'askingPrice', label: 'Asking Price', required: false },
  { key: 'assetType', label: 'Asset Type (SNF/ALF/ILF)', required: false },
  { key: 'source', label: 'Source/Broker', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: '__skip', label: '— Skip Column —', required: false },
];

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedDeals, setParsedDeals] = useState<ParsedRow[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const [isDragOver, setIsDragOver] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    setCsvHeaders(headers);

    // Parse rows
    const rows = lines.slice(1).map(line => parseCSVLine(line)).filter(r => r.some(c => c.trim()));
    setCsvRows(rows);

    // Auto-map columns
    const autoMappings: ColumnMapping[] = headers.map(h => {
      const lower = h.toLowerCase().trim();
      let field = '__skip';
      if (lower.includes('name') || lower.includes('facility')) field = 'name';
      else if (lower.includes('ccn') || lower.includes('provider')) field = 'ccn';
      else if (lower === 'state' || lower === 'st') field = 'state';
      else if (lower.includes('bed')) field = 'beds';
      else if (lower.includes('price') || lower.includes('ask') || lower.includes('value')) field = 'askingPrice';
      else if (lower.includes('type') || lower.includes('asset')) field = 'assetType';
      else if (lower.includes('source') || lower.includes('broker')) field = 'source';
      else if (lower.includes('note') || lower.includes('comment')) field = 'notes';
      return { csvColumn: h, dealField: field };
    });
    setMappings(autoMappings);
    setStep('map');
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))) {
      handleFile(file);
    }
  }, [handleFile]);

  const applyMappings = () => {
    const deals: ParsedRow[] = csvRows.map(row => {
      const deal: ParsedRow = { name: '' };
      mappings.forEach((mapping, idx) => {
        if (mapping.dealField !== '__skip' && row[idx]) {
          const val = row[idx];
          if (mapping.dealField === 'beds' || mapping.dealField === 'askingPrice') {
            deal[mapping.dealField] = parseFloat(val.replace(/[^0-9.]/g, '')) || undefined;
          } else {
            deal[mapping.dealField] = val;
          }
        }
      });
      return deal;
    }).filter(d => d.name);
    setParsedDeals(deals);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const deal of parsedDeals) {
      try {
        const res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deal.name,
            ccn: deal.ccn,
            primaryState: deal.state,
            beds: deal.beds,
            askingPrice: deal.askingPrice,
            assetType: deal.assetType || 'SNF',
            source: deal.source,
            notes: deal.notes,
            status: 'new',
          }),
        });
        if (res.ok) {
          success++;
        } else {
          failed++;
          errors.push(`${deal.name}: ${res.statusText}`);
        }
      } catch {
        failed++;
        errors.push(`${deal.name}: Network error`);
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    }

    setImportResults({ success, failed, errors });
    setStep('done');
  };

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary-500" />
          Bulk Deal Importer
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Import deals from a CSV or Excel export — map columns and create deals in batch
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, i) => {
          const steps = ['upload', 'map', 'preview', 'importing'] as const;
          const stepIdx = steps.indexOf(step === 'done' ? 'importing' : step);
          const isActive = i <= stepIdx;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={cn('w-8 h-px', isActive ? 'bg-primary-400' : 'bg-surface-200 dark:bg-surface-700')} />}
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
              )}>
                <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold', isActive ? 'bg-primary-500 text-white' : 'bg-surface-300 text-white')}>
                  {step === 'done' && i === 3 ? '✓' : i + 1}
                </span>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-16 text-center transition-colors cursor-pointer',
            isDragOver ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10' : 'border-surface-300 dark:border-surface-600 hover:border-primary-300'
          )}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.tsv,.txt';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          <FileSpreadsheet className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Drop a CSV file here, or click to browse
          </p>
          <p className="text-xs text-surface-400 mt-2">
            Supports CSV with deal names, CCNs, states, beds, asking prices
          </p>
        </div>
      )}

      {/* Map columns step */}
      {step === 'map' && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-900 p-5">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4">
            Map CSV Columns to Deal Fields
          </h3>
          <p className="text-xs text-surface-500 mb-4">{csvRows.length} rows detected. Auto-mapped where possible.</p>

          <div className="space-y-3">
            {mappings.map((mapping, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-1/3 text-sm text-surface-600 dark:text-surface-400 font-mono truncate">{mapping.csvColumn}</div>
                <ArrowRight className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <select
                  value={mapping.dealField}
                  onChange={e => {
                    const updated = [...mappings];
                    updated[idx] = { ...mapping, dealField: e.target.value };
                    setMappings(updated);
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200"
                >
                  {DEAL_FIELDS.map(f => (
                    <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={applyMappings}
              disabled={!mappings.some(m => m.dealField === 'name')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
            >
              Preview Import <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <div>
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900 mb-4">
            <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{parsedDeals.length} deals ready to import</span>
              <button onClick={() => setStep('map')} className="text-xs text-primary-500 hover:text-primary-600">Edit mappings</button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-surface-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-surface-500 uppercase">CCN</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-surface-500 uppercase">State</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-surface-500 uppercase">Beds</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-surface-500 uppercase">Price</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-surface-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {parsedDeals.slice(0, 50).map((deal, i) => (
                    <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                      <td className="px-3 py-2 font-medium text-surface-800 dark:text-surface-200">{deal.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-surface-500">{deal.ccn || '—'}</td>
                      <td className="px-3 py-2 text-surface-500">{deal.state || '—'}</td>
                      <td className="px-3 py-2 text-center text-surface-700 dark:text-surface-300">{deal.beds || '—'}</td>
                      <td className="px-3 py-2 text-right text-surface-700 dark:text-surface-300">
                        {deal.askingPrice ? `$${(deal.askingPrice / 1000000).toFixed(1)}M` : '—'}
                      </td>
                      <td className="px-3 py-2 text-surface-500">{deal.assetType || 'SNF'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep('map')} className="text-sm text-surface-500 hover:text-surface-700">Back</button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import {parsedDeals.length} Deals
            </button>
          </div>
        </div>
      )}

      {/* Importing step */}
      {step === 'importing' && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Importing deals...</p>
          <p className="text-xs text-surface-400 mt-1">This may take a moment</p>
        </div>
      )}

      {/* Done step */}
      {step === 'done' && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-8 bg-white dark:bg-surface-900 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Import Complete</h3>
          <p className="text-sm text-surface-500 mt-2">
            {importResults.success} deal{importResults.success !== 1 ? 's' : ''} imported successfully
            {importResults.failed > 0 && <span className="text-red-500"> &middot; {importResults.failed} failed</span>}
          </p>
          {importResults.errors.length > 0 && (
            <div className="mt-4 text-left max-w-md mx-auto">
              {importResults.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3 flex-shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <a href="/app/deals" className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
              View Pipeline
            </a>
            <button onClick={() => { setStep('upload'); setCsvRows([]); setParsedDeals([]); }} className="px-4 py-2 text-sm text-surface-500 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800">
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
