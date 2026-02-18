'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, DollarSign, Loader2, Check } from 'lucide-react';

interface UploadedFile {
  file: File;
  role: 'raw_source' | 'completed_proforma' | 'value_assessment';
}

interface DealMetadata {
  name: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  primaryState: string;
  dealDate: string;
  askingPrice: string;
  finalPrice: string;
  beds: string;
}

interface HistoricalDealUploadProps {
  onComplete?: (dealId: string) => void;
}

export function HistoricalDealUpload({ onComplete }: HistoricalDealUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [metadata, setMetadata] = useState<DealMetadata>({
    name: '', assetType: 'SNF', primaryState: '', dealDate: '',
    askingPrice: '', finalPrice: '', beds: '',
  });
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [phase, setPhase] = useState<string>('');
  const [dealId, setDealId] = useState<string | null>(null);

  const handleDrop = useCallback((role: UploadedFile['role']) => (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({ file, role }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = useCallback((role: UploadedFile['role']) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.map(file => ({ file, role }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!metadata.name || !metadata.assetType || files.length === 0) return;

    setUploading(true);
    try {
      // 1. Create the historical deal
      setPhase('Creating deal record...');
      const createRes = await fetch('/api/learning/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metadata.name,
          assetType: metadata.assetType,
          primaryState: metadata.primaryState || undefined,
          dealDate: metadata.dealDate || undefined,
          askingPrice: metadata.askingPrice ? Number(metadata.askingPrice) : undefined,
          finalPrice: metadata.finalPrice ? Number(metadata.finalPrice) : undefined,
          beds: metadata.beds ? Number(metadata.beds) : undefined,
        }),
      });
      const { data: deal } = await createRes.json();
      setDealId(deal.id);

      // 2. Upload all files
      setPhase('Uploading files...');
      for (const { file, role } of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileRole', role);
        await fetch(`/api/learning/deals/${deal.id}/upload`, {
          method: 'POST',
          body: formData,
        });
      }

      // 3. Trigger processing
      setPhase('Processing...');
      setProcessing(true);
      const processRes = await fetch(`/api/learning/deals/${deal.id}/process`, {
        method: 'POST',
      });
      const processResult = await processRes.json();

      if (processResult.success) {
        setPhase('Complete!');
        onComplete?.(deal.id);
      } else {
        setPhase(`Error: ${processResult.error}`);
      }
    } catch (error) {
      setPhase(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const roleFiles = (role: UploadedFile['role']) => files.filter(f => f.role === role);

  return (
    <div className="space-y-6">
      {/* Metadata Form */}
      <div className="bg-white rounded-xl border border-[#E2DFD8] p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">Deal Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-600 mb-1">Deal Name *</label>
            <input
              type="text"
              value={metadata.name}
              onChange={e => setMetadata(m => ({ ...m, name: e.target.value }))}
              placeholder="e.g., Sapphire Portfolio"
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Asset Type *</label>
            <select
              value={metadata.assetType}
              onChange={e => setMetadata(m => ({ ...m, assetType: e.target.value as DealMetadata['assetType'] }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            >
              <option value="SNF">SNF</option>
              <option value="ALF">ALF / Memory Care</option>
              <option value="ILF">Independent Living</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">State</label>
            <input
              type="text"
              value={metadata.primaryState}
              onChange={e => setMetadata(m => ({ ...m, primaryState: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="OR"
              maxLength={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Deal Date</label>
            <input
              type="date"
              value={metadata.dealDate}
              onChange={e => setMetadata(m => ({ ...m, dealDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Asking Price</label>
            <input
              type="number"
              value={metadata.askingPrice}
              onChange={e => setMetadata(m => ({ ...m, askingPrice: e.target.value }))}
              placeholder="400000000"
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Final Price</label>
            <input
              type="number"
              value={metadata.finalPrice}
              onChange={e => setMetadata(m => ({ ...m, finalPrice: e.target.value }))}
              placeholder="380000000"
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Total Beds</label>
            <input
              type="number"
              value={metadata.beds}
              onChange={e => setMetadata(m => ({ ...m, beds: e.target.value }))}
              placeholder="1300"
              className="w-full px-3 py-2 rounded-lg border border-[#E2DFD8] bg-white text-surface-800 text-sm"
            />
          </div>
        </div>
      </div>

      {/* File Upload Zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DropZone
          role="raw_source"
          icon={<FileSpreadsheet className="w-8 h-8" />}
          title="Raw Source Files"
          description="T13, opco review, census, rent rolls"
          files={roleFiles('raw_source')}
          onDrop={handleDrop('raw_source')}
          onFileSelect={handleFileSelect('raw_source')}
          onRemove={(i) => {
            const rawIdx = files.findIndex((f, idx) => f.role === 'raw_source' && roleFiles('raw_source').indexOf(f) === i);
            if (rawIdx >= 0) removeFile(rawIdx);
          }}
          color="primary"
        />
        <DropZone
          role="completed_proforma"
          icon={<FileText className="w-8 h-8" />}
          title="Completed Proforma"
          description="Your completed proforma spreadsheet"
          files={roleFiles('completed_proforma')}
          onDrop={handleDrop('completed_proforma')}
          onFileSelect={handleFileSelect('completed_proforma')}
          onRemove={(i) => {
            const idx = files.findIndex((f) => f.role === 'completed_proforma' && roleFiles('completed_proforma').indexOf(f) === i);
            if (idx >= 0) removeFile(idx);
          }}
          color="emerald"
        />
        <DropZone
          role="value_assessment"
          icon={<DollarSign className="w-8 h-8" />}
          title="Value Assessment"
          description="LOI, valuation summary, deal memo"
          files={roleFiles('value_assessment')}
          onDrop={handleDrop('value_assessment')}
          onFileSelect={handleFileSelect('value_assessment')}
          onRemove={(i) => {
            const idx = files.findIndex((f) => f.role === 'value_assessment' && roleFiles('value_assessment').indexOf(f) === i);
            if (idx >= 0) removeFile(idx);
          }}
          color="amber"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-surface-500">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
          {phase && <span className="ml-4 text-primary-600">{phase}</span>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!metadata.name || files.length === 0 || uploading}
          className="px-6 py-2.5 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : processing ? (
            <>
              <Check className="w-4 h-4" />
              Complete
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload & Learn
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// DropZone Sub-Component
// ============================================================================

interface DropZoneProps {
  role: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  files: UploadedFile[];
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  color: 'primary' | 'emerald' | 'amber';
}

const colorMap = {
  primary: 'border-primary-300 bg-primary-50/50 text-primary-600',
  emerald: 'border-emerald-300 bg-emerald-50/50 text-emerald-600',
  amber: 'border-amber-300 bg-amber-50/50 text-amber-600',
};

function DropZone({ role, icon, title, description, files, onDrop, onFileSelect, onRemove, color }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { onDrop(e); setDragOver(false); }}
      className={`relative rounded-xl border-2 border-dashed p-6 transition-all text-center ${
        dragOver ? 'border-primary-500 bg-primary-50 scale-[1.02]' : colorMap[color]
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {icon}
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs opacity-70">{description}</p>
      </div>

      <label className="mt-3 inline-block px-4 py-1.5 rounded-full bg-white border border-current text-xs font-medium cursor-pointer hover:bg-opacity-80 transition-colors">
        Browse Files
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          multiple
          onChange={onFileSelect}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-1.5 border border-[#E2DFD8]">
              <FileSpreadsheet className="w-3 h-3 flex-shrink-0" />
              <span className="truncate flex-1 text-left text-surface-700">{f.file.name}</span>
              <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
