'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Building2,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface Document {
  id: string;
  filename: string;
  type?: string;
  confirmedType?: boolean;
  facilityId?: string;
  folderId?: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  type: string;
  documentIds: string[];
}

const FOLDER_TYPES = [
  { id: 'financial', name: 'Financial Statements', icon: '📊' },
  { id: 'census', name: 'Census & Operations', icon: '📋' },
  { id: 'survey', name: 'Survey Reports', icon: '📝' },
  { id: 'legal', name: 'Legal & Lease', icon: '⚖️' },
  { id: 'other', name: 'Other Documents', icon: '📁' },
];

const DOCUMENT_TYPES = [
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'rent_roll', label: 'Rent Roll' },
  { value: 'census_report', label: 'Census Report' },
  { value: 'staffing_report', label: 'Staffing Report' },
  { value: 'survey_report', label: 'Survey Report' },
  { value: 'cost_report', label: 'Cost Report' },
  { value: 'om_package', label: 'OM Package' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'other', label: 'Other' },
];

interface DocumentOrganizationProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function DocumentOrganization({ stageData, onUpdate, dealId }: DocumentOrganizationProps) {
  const [documents, setDocuments] = useState<Document[]>(
    stageData.documentOrganization?.documents || []
  );
  const [folders, setFolders] = useState<DocumentFolder[]>(
    stageData.documentOrganization?.folders ||
      FOLDER_TYPES.map((f) => ({ id: f.id, name: f.name, type: f.id, documentIds: [] }))
  );
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const facilities = stageData.facilityIdentification?.facilities || [];

  // Sync to parent
  useEffect(() => {
    onUpdate({
      documentOrganization: {
        documents,
        folders,
      },
    });
  }, [documents, folders, onUpdate]);

  // Handle file upload
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!dealId) return;

      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('dealId', dealId);

          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          if (data.success) {
            const newDoc: Document = {
              id: data.data.id,
              filename: file.name,
              type: data.data.type,
              confirmedType: false,
            };
            setDocuments((prev) => [...prev, newDoc]);

            // Auto-assign to folder based on type
            if (data.data.type) {
              const folderType = getDefaultFolderForType(data.data.type);
              assignToFolder(newDoc.id, folderType);
            }
          }
        }
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [dealId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
  });

  // Get default folder for document type
  const getDefaultFolderForType = (type: string): string => {
    const mapping: Record<string, string> = {
      financial_statement: 'financial',
      rent_roll: 'financial',
      census_report: 'census',
      staffing_report: 'census',
      survey_report: 'survey',
      cost_report: 'financial',
      lease_agreement: 'legal',
      om_package: 'other',
      appraisal: 'other',
      environmental: 'other',
      other: 'other',
    };
    return mapping[type] || 'other';
  };

  // Assign document to folder
  const assignToFolder = (docId: string, folderId: string) => {
    setFolders((prev) =>
      prev.map((folder) => ({
        ...folder,
        documentIds:
          folder.id === folderId
            ? [...folder.documentIds.filter((id) => id !== docId), docId]
            : folder.documentIds.filter((id) => id !== docId),
      }))
    );
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, folderId } : doc))
    );
  };

  // Update document type
  const updateDocumentType = (docId: string, type: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, type, confirmedType: true } : doc
      )
    );
  };

  // Assign document to facility
  const assignToFacility = (docId: string, facilityId: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, facilityId: facilityId || undefined } : doc
      )
    );
  };

  // Remove document
  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setFolders((prev) =>
      prev.map((folder) => ({
        ...folder,
        documentIds: folder.documentIds.filter((id) => id !== docId),
      }))
    );
  };

  // Get unorganized documents
  const unorganizedDocs = documents.filter(
    (doc) => !folders.some((f) => f.documentIds.includes(doc.id))
  );

  const confirmedCount = documents.filter((d) => d.confirmedType).length;

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-400'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto text-surface-400 mb-3" />
        {uploading ? (
          <p className="text-surface-600 dark:text-surface-400">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-primary-600 dark:text-primary-400 font-medium">
            Drop files here
          </p>
        ) : (
          <>
            <p className="text-surface-600 dark:text-surface-400">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-surface-500 mt-1">
              PDF, Excel (.xlsx, .xls), CSV
            </p>
          </>
        )}
      </div>

      {/* Progress summary */}
      <div className="flex items-center justify-between p-4 bg-surface-100 dark:bg-surface-800 rounded-xl">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary-500" />
          <span className="font-medium">{documents.length} documents uploaded</span>
        </div>
        <Badge variant={confirmedCount === documents.length ? 'default' : 'secondary'}>
          {confirmedCount} types confirmed
        </Badge>
      </div>

      {/* Folders and documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Folder list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-medium text-sm text-surface-500 uppercase tracking-wide">
            Folders
          </h3>
          {folders.map((folder) => {
            const folderConfig = FOLDER_TYPES.find((f) => f.id === folder.type);
            const docCount = folder.documentIds.length;
            const isSelected = selectedFolder === folder.id;

            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(isSelected ? null : folder.id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors',
                  isSelected
                    ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-500'
                    : 'bg-surface-100 dark:bg-surface-800 border border-transparent hover:border-surface-300 dark:hover:border-surface-600'
                )}
              >
                {isSelected ? (
                  <FolderOpen className="w-5 h-5 text-primary-500" />
                ) : (
                  <Folder className="w-5 h-5 text-surface-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-surface-500">
                    {docCount} {docCount === 1 ? 'document' : 'documents'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Documents in selected folder or unorganized */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm text-surface-500 uppercase tracking-wide">
            {selectedFolder
              ? `Documents in ${folders.find((f) => f.id === selectedFolder)?.name}`
              : 'Unorganized Documents'}
          </h3>

          {(selectedFolder
            ? documents.filter((d) =>
                folders
                  .find((f) => f.id === selectedFolder)
                  ?.documentIds.includes(d.id)
              )
            : unorganizedDocs
          ).length === 0 ? (
            <Card variant="flat" className="text-center py-8">
              <p className="text-surface-500">
                {selectedFolder
                  ? 'No documents in this folder'
                  : 'All documents organized'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(selectedFolder
                ? documents.filter((d) =>
                    folders
                      .find((f) => f.id === selectedFolder)
                      ?.documentIds.includes(d.id)
                  )
                : unorganizedDocs
              ).map((doc) => (
                <Card key={doc.id} variant="flat" className="p-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-surface-400 mt-1 cursor-grab" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-surface-400" />
                        <span className="font-medium truncate">{doc.filename}</span>
                        {doc.confirmedType ? (
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {/* Document type */}
                        <Select
                          value={doc.type || ''}
                          onValueChange={(value) => updateDocumentType(doc.id, value)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="Document type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Folder assignment */}
                        <Select
                          value={doc.folderId || ''}
                          onValueChange={(value) => assignToFolder(doc.id, value)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="Assign to folder" />
                          </SelectTrigger>
                          <SelectContent>
                            {folders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Facility assignment */}
                        {facilities.length > 1 && (
                          <Select
                            value={doc.facilityId || ''}
                            onValueChange={(value) => assignToFacility(doc.id, value)}
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue placeholder="Facility (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All facilities</SelectItem>
                              {facilities.map((f) => (
                                <SelectItem key={f.slot} value={f.name || `Facility ${f.slot}`}>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {f.name || `Facility ${f.slot}`}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-surface-400 hover:text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {documents.length > 0 && confirmedCount === documents.length && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All {documents.length} documents organized and types confirmed. Ready for extraction.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
