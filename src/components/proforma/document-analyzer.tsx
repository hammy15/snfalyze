'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  Edit3,
} from 'lucide-react';

type FileType = 'pdf' | 'excel' | 'csv' | 'unknown';
type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: FileType;
  file: File;
  status: ExtractionStatus;
  extractedData?: ExtractedData;
  error?: string;
}

interface ExtractedField {
  field: string;
  label: string;
  value: number | string;
  confidence: number; // 0-1
  source: string; // e.g., "Page 3, Row 15" or "Sheet1, Cell B12"
  category: string;
}

interface ExtractedData {
  facilityName?: string;
  facilityType?: string;
  period?: string;
  fields: ExtractedField[];
}

interface DocumentAnalyzerProps {
  onExtractComplete: (data: ExtractedData) => void;
  onClose: () => void;
}

// Simulated AI extraction based on file type
function simulateExtraction(file: UploadedFile): Promise<ExtractedData> {
  return new Promise((resolve) => {
    // Simulate processing time
    const delay = 1500 + Math.random() * 2000;

    setTimeout(() => {
      // Generate mock extracted data based on file name patterns
      const isSnf = file.name.toLowerCase().includes('snf');
      const isAlf = file.name.toLowerCase().includes('alf');

      const baseRevenue = 800000 + Math.random() * 400000;
      const beds = isSnf ? 95 : isAlf ? 72 : 100;

      resolve({
        facilityName: file.name.replace(/\.(pdf|xlsx|xls|csv)$/i, '').replace(/[-_]/g, ' '),
        facilityType: isSnf ? 'SNF' : isAlf ? 'ALF' : 'SNF',
        period: 'Jan 2024 - Dec 2024',
        fields: [
          // Revenue
          { field: 'medicaidRevenue', label: 'Medicaid Revenue', value: Math.round(baseRevenue * 0.35), confidence: 0.95, source: 'Page 2, Row 12', category: 'Revenue' },
          { field: 'medicareRevenue', label: 'Medicare Revenue', value: Math.round(baseRevenue * 0.25), confidence: 0.92, source: 'Page 2, Row 15', category: 'Revenue' },
          { field: 'privateRevenue', label: 'Private Pay Revenue', value: Math.round(baseRevenue * 0.15), confidence: 0.88, source: 'Page 2, Row 18', category: 'Revenue' },
          { field: 'hmoRevenue', label: 'HMO Revenue', value: Math.round(baseRevenue * 0.12), confidence: 0.90, source: 'Page 2, Row 21', category: 'Revenue' },
          { field: 'otherRevenue', label: 'Other Revenue', value: Math.round(baseRevenue * 0.08), confidence: 0.85, source: 'Page 2, Row 24', category: 'Revenue' },
          { field: 'totalRevenue', label: 'Total Revenue', value: Math.round(baseRevenue * 0.95), confidence: 0.97, source: 'Page 2, Row 28', category: 'Revenue' },

          // Expenses
          { field: 'nursingWages', label: 'Nursing Wages', value: Math.round(baseRevenue * 0.28), confidence: 0.94, source: 'Page 3, Row 5', category: 'Expenses' },
          { field: 'nursingBenefits', label: 'Nursing Benefits', value: Math.round(baseRevenue * 0.06), confidence: 0.91, source: 'Page 3, Row 6', category: 'Expenses' },
          { field: 'nursingAgency', label: 'Nursing Agency', value: Math.round(baseRevenue * 0.04), confidence: 0.87, source: 'Page 3, Row 7', category: 'Expenses' },
          { field: 'therapyWages', label: 'Therapy Wages', value: Math.round(baseRevenue * 0.08), confidence: 0.93, source: 'Page 3, Row 12', category: 'Expenses' },
          { field: 'dietaryExpenses', label: 'Dietary Total', value: Math.round(baseRevenue * 0.06), confidence: 0.89, source: 'Page 3, Row 18', category: 'Expenses' },
          { field: 'adminExpenses', label: 'Admin Total', value: Math.round(baseRevenue * 0.10), confidence: 0.86, source: 'Page 3, Row 25', category: 'Expenses' },
          { field: 'totalOpex', label: 'Total Operating Expenses', value: Math.round(baseRevenue * 0.75), confidence: 0.95, source: 'Page 3, Row 35', category: 'Expenses' },

          // Metrics
          { field: 'ebitdar', label: 'EBITDAR', value: Math.round(baseRevenue * 0.18), confidence: 0.96, source: 'Page 4, Row 3', category: 'Metrics' },
          { field: 'ebitda', label: 'EBITDA', value: Math.round(baseRevenue * 0.12), confidence: 0.94, source: 'Page 4, Row 8', category: 'Metrics' },
          { field: 'netIncome', label: 'Net Income', value: Math.round(baseRevenue * 0.06), confidence: 0.92, source: 'Page 4, Row 15', category: 'Metrics' },

          // Census
          { field: 'licensedBeds', label: 'Licensed Beds', value: beds, confidence: 0.99, source: 'Page 1, Row 5', category: 'Census' },
          { field: 'avgOccupancy', label: 'Avg Occupancy', value: '85%', confidence: 0.91, source: 'Page 1, Row 8', category: 'Census' },
          { field: 'totalPatientDays', label: 'Total Patient Days', value: Math.round(beds * 0.85 * 365), confidence: 0.93, source: 'Page 5, Row 45', category: 'Census' },
        ],
      });
    }, delay);
  });
}

function getFileType(file: File): FileType {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls'].includes(ext || '')) return 'excel';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}

function getFileIcon(type: FileType) {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'excel':
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    case 'csv':
      return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
    default:
      return <File className="w-5 h-5 text-gray-400" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DocumentAnalyzer({ onExtractComplete, onClose }: DocumentAnalyzerProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Revenue', 'Expenses', 'Metrics', 'Census']));
  const [editingField, setEditingField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: getFileType(file),
      file,
      status: 'pending' as ExtractionStatus,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Process each file
    for (const uploadedFile of uploadedFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: 'processing' } : f
        )
      );

      try {
        const extractedData = await simulateExtraction(uploadedFile);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'completed', extractedData }
              : f
          )
        );

        // Auto-select the first completed file
        setSelectedFileId((current) => current || uploadedFile.id);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error', error: 'Failed to extract data' }
              : f
          )
        );
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      const type = getFileType(file);
      return type !== 'unknown';
    });

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
    }
  }, [selectedFileId]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const completedFiles = files.filter((f) => f.status === 'completed');

  // Group fields by category
  const groupedFields = selectedFile?.extractedData?.fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ExtractedField[]>) || {};

  const handleApplyToProforma = useCallback(() => {
    if (selectedFile?.extractedData) {
      onExtractComplete(selectedFile.extractedData);
    }
  }, [selectedFile, onExtractComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Document Analyzer</h2>
              <p className="text-sm text-gray-500">Upload documents to auto-extract financial data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - File List */}
          <div className="w-80 border-r flex flex-col">
            {/* Upload Area */}
            <div className="p-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  isDragging
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                )}
              >
                <Upload className={cn(
                  'w-8 h-8 mx-auto mb-2',
                  isDragging ? 'text-purple-500' : 'text-gray-400'
                )} />
                <p className="text-sm font-medium text-gray-700">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Excel, CSV supported
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => file.status === 'completed' && setSelectedFileId(file.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        selectedFileId === file.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300',
                        file.status === 'completed' && 'cursor-pointer'
                      )}
                    >
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      {file.status === 'pending' && (
                        <span className="text-xs text-gray-400">Queued</span>
                      )}
                      {file.status === 'processing' && (
                        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                      )}
                      {file.status === 'completed' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {files.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {completedFiles.length} of {files.length} processed
                  </span>
                  {files.some((f) => f.status === 'processing') && (
                    <span className="text-purple-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Extracted Data */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedFile ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Select a processed document</p>
                  <p className="text-sm mt-1">to view extracted data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Document Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedFile.extractedData?.facilityName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {selectedFile.extractedData?.facilityType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedFile.extractedData?.period}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedFile.extractedData?.fields.length} fields extracted
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm">
                      <Eye className="w-4 h-4" />
                      Preview Source
                    </button>
                  </div>
                </div>

                {/* Extracted Fields */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {Object.entries(groupedFields).map(([category, fields]) => (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedCategories.has(category) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-900">{category}</span>
                            <span className="text-xs text-gray-500">({fields.length} fields)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {fields.filter((f) => f.confidence >= 0.9).length === fields.length ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                High confidence
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">
                                Review recommended
                              </span>
                            )}
                          </div>
                        </button>

                        {expandedCategories.has(category) && (
                          <div className="divide-y">
                            {fields.map((field) => (
                              <div
                                key={field.field}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {field.label}
                                  </p>
                                  <p className="text-xs text-gray-500">{field.source}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {editingField === field.field ? (
                                    <input
                                      type="text"
                                      defaultValue={typeof field.value === 'number' ? field.value : field.value}
                                      onBlur={() => setEditingField(null)}
                                      onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                      autoFocus
                                      className="w-32 text-right text-sm font-mono border rounded px-2 py-1"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                                      {typeof field.value === 'number'
                                        ? formatCurrency(field.value)
                                        : field.value}
                                    </span>
                                  )}
                                  <div
                                    className={cn(
                                      'w-16 h-1.5 rounded-full overflow-hidden bg-gray-200'
                                    )}
                                    title={`${Math.round(field.confidence * 100)}% confidence`}
                                  >
                                    <div
                                      className={cn(
                                        'h-full rounded-full',
                                        field.confidence >= 0.9
                                          ? 'bg-green-500'
                                          : field.confidence >= 0.7
                                          ? 'bg-amber-500'
                                          : 'bg-red-500'
                                      )}
                                      style={{ width: `${field.confidence * 100}%` }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => setEditingField(field.field)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    <Edit3 className="w-3 h-3 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-green-600">
                        {selectedFile.extractedData?.fields.filter((f) => f.confidence >= 0.9).length}
                      </span>
                      {' '}high confidence •
                      <span className="font-medium text-amber-600 ml-1">
                        {selectedFile.extractedData?.fields.filter((f) => f.confidence < 0.9 && f.confidence >= 0.7).length}
                      </span>
                      {' '}needs review
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-secondary btn-sm">
                        <RefreshCw className="w-4 h-4" />
                        Re-extract
                      </button>
                      <button
                        onClick={handleApplyToProforma}
                        className="btn btn-primary btn-sm"
                      >
                        Apply to Proforma
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
