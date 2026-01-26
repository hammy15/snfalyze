'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  FolderOpen,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  Trash2,
  Download,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  FolderPlus,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Grid,
  List,
  Eye,
  Tag,
  Clock,
  History,
  Share2,
  Copy,
  CheckCircle,
  Filter,
  SortAsc,
  SortDesc,
  Star,
  StarOff,
  Lock,
  Unlock,
  Activity,
  HardDrive,
  FileCheck,
  FilePlus,
  Folder,
  ExternalLink,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

interface Deal {
  id: string;
  name: string;
  status: string;
}

interface FileVersion {
  id: string;
  version: number;
  uploadedAt: Date;
  uploadedBy: string;
  size: number;
  note?: string;
}

interface FileTag {
  id: string;
  name: string;
  color: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dealId: string | null;
  dealName: string | null;
  uploadedAt: Date;
  category: string;
  tags: FileTag[];
  versions: FileVersion[];
  starred: boolean;
  shared: boolean;
  summary?: string;
  previewUrl?: string;
}

interface DealFolder {
  id: string;
  name: string;
  files: UploadedFile[];
  expanded: boolean;
  storageUsed: number;
}

interface ActivityItem {
  id: string;
  action: 'upload' | 'download' | 'delete' | 'share' | 'tag' | 'version';
  fileName: string;
  dealName?: string;
  timestamp: Date;
  user: string;
}

// Predefined tags
const availableTags: FileTag[] = [
  { id: '1', name: 'Important', color: '#EF4444' },
  { id: '2', name: 'Review Needed', color: '#F59E0B' },
  { id: '3', name: 'Approved', color: '#10B981' },
  { id: '4', name: 'Draft', color: '#6B7280' },
  { id: '5', name: 'Final', color: '#3B82F6' },
  { id: '6', name: 'Confidential', color: '#8B5CF6' },
];

// Document templates
const documentTemplates = [
  { id: 'loi', name: 'Letter of Intent', icon: FileText, category: 'lease' },
  { id: 'nda', name: 'NDA Template', icon: FileText, category: 'other' },
  { id: 'dd-checklist', name: 'DD Checklist', icon: FileCheck, category: 'other' },
  { id: 'financial-model', name: 'Financial Model', icon: FileSpreadsheet, category: 'pl' },
];

const fileCategories = [
  { id: 'pl', label: 'P&L Statements', icon: FileSpreadsheet },
  { id: 'census', label: 'Census Reports', icon: FileText },
  { id: 'om', label: 'Offering Memorandum', icon: FileText },
  { id: 'lease', label: 'Lease Documents', icon: File },
  { id: 'survey', label: 'Survey Reports', icon: FileText },
  { id: 'photos', label: 'Property Photos', icon: FileImage },
  { id: 'other', label: 'Other Documents', icon: File },
];

export default function RepositoryPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [folders, setFolders] = useState<DealFolder[]>([]);
  const [unassignedFiles, setUnassignedFiles] = useState<UploadedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [newDealName, setNewDealName] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [versionFile, setVersionFile] = useState<UploadedFile | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fetch deals
  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/deals');
        const data = await res.json();
        const dealsList: Deal[] = data.data || [];
        setDeals(dealsList);

        // Create folders for each deal with mock files
        const mockFolders: DealFolder[] = dealsList.map(deal => {
          const files = generateMockFiles(deal.id, deal.name);
          return {
            id: deal.id,
            name: deal.name,
            files,
            expanded: false,
            storageUsed: files.reduce((acc, f) => acc + f.size, 0),
          };
        });

        setFolders(mockFolders);

        // Generate mock activity
        setActivityLog(generateMockActivity(mockFolders));
      } catch (error) {
        console.error('Error fetching deals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  // Generate mock files for a deal
  function generateMockFiles(dealId: string, dealName: string): UploadedFile[] {
    const mockFiles: UploadedFile[] = [
      {
        id: `${dealId}-1`,
        name: `${dealName.split(' ')[0]}_P&L_2024.xlsx`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 245000,
        dealId,
        dealName,
        uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        category: 'pl',
        tags: [availableTags[2]],
        versions: [
          { id: '1', version: 1, uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), uploadedBy: 'John Doe', size: 240000 },
          { id: '2', version: 2, uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), uploadedBy: 'John Doe', size: 245000, note: 'Updated Q4 figures' },
        ],
        starred: true,
        shared: false,
        summary: 'Annual P&L statement with quarterly breakdowns. Shows 12% YoY revenue growth and improved EBITDA margins.',
      },
      {
        id: `${dealId}-2`,
        name: `${dealName.split(' ')[0]}_Census_Q4.pdf`,
        type: 'application/pdf',
        size: 156000,
        dealId,
        dealName,
        uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        category: 'census',
        tags: [availableTags[1]],
        versions: [
          { id: '1', version: 1, uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), uploadedBy: 'Jane Smith', size: 156000 },
        ],
        starred: false,
        shared: true,
        summary: 'Q4 census report showing 92% occupancy rate. Medicare mix at 35%, Medicaid at 45%.',
      },
      {
        id: `${dealId}-3`,
        name: `Offering_Memorandum.pdf`,
        type: 'application/pdf',
        size: 4500000,
        dealId,
        dealName,
        uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        category: 'om',
        tags: [availableTags[5], availableTags[4]],
        versions: [
          { id: '1', version: 1, uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), uploadedBy: 'Broker Team', size: 4200000 },
          { id: '2', version: 2, uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), uploadedBy: 'Broker Team', size: 4500000, note: 'Added market analysis section' },
        ],
        starred: true,
        shared: false,
        summary: 'Comprehensive OM including property overview, financial projections, and market analysis. Asking price: $15M.',
      },
    ];

    return mockFiles;
  }

  function generateMockActivity(folders: DealFolder[]): ActivityItem[] {
    const actions: ActivityItem['action'][] = ['upload', 'download', 'share', 'tag', 'version'];
    const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams'];
    const activities: ActivityItem[] = [];

    folders.forEach(folder => {
      folder.files.forEach(file => {
        activities.push({
          id: `act-${file.id}`,
          action: actions[Math.floor(Math.random() * actions.length)],
          fileName: file.name,
          dealName: folder.name,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          user: users[Math.floor(Math.random() * users.length)],
        });
      });
    });

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }

  // Generate suggested deal name
  const generateSuggestedName = useCallback(() => {
    const suggestions = [
      'Sunrise Manor Acquisition',
      'Valley View Healthcare Portfolio',
      'Midwest Senior Living Group',
      'Coastal Care Centers',
      'Mountain Ridge SNF',
      'Heritage Health Partners',
    ];
    setSuggestedName(suggestions[Math.floor(Math.random() * suggestions.length)]);
  }, []);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadingFiles(Array.from(e.dataTransfer.files));
      setShowUploadModal(true);
      generateSuggestedName();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingFiles(Array.from(e.target.files));
      setShowUploadModal(true);
      generateSuggestedName();
    }
  };

  const handleUpload = () => {
    const newFiles: UploadedFile[] = uploadingFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      size: file.size,
      dealId: selectedDeal || null,
      dealName: selectedDeal ? deals.find(d => d.id === selectedDeal)?.name || null : null,
      uploadedAt: new Date(),
      category: selectedCategory,
      tags: [],
      versions: [{ id: '1', version: 1, uploadedAt: new Date(), uploadedBy: 'You', size: file.size }],
      starred: false,
      shared: false,
      summary: 'AI summary will be generated...',
    }));

    if (selectedDeal) {
      setFolders(prev => prev.map(folder => {
        if (folder.id === selectedDeal) {
          const newStorageUsed = folder.storageUsed + newFiles.reduce((acc, f) => acc + f.size, 0);
          return { ...folder, files: [...folder.files, ...newFiles], storageUsed: newStorageUsed };
        }
        return folder;
      }));
    } else {
      setUnassignedFiles(prev => [...prev, ...newFiles]);
    }

    // Add to activity log
    newFiles.forEach(file => {
      const newActivity: ActivityItem = {
        id: `act-${file.id}`,
        action: 'upload',
        fileName: file.name,
        dealName: file.dealName || undefined,
        timestamp: new Date(),
        user: 'You',
      };
      setActivityLog(prev => [newActivity, ...prev].slice(0, 20));
    });

    setShowUploadModal(false);
    setUploadingFiles([]);
    setSelectedDeal('');
    setSelectedCategory('other');
  };

  const handleCreateDeal = () => {
    const name = newDealName || suggestedName;
    if (!name) return;

    const newDeal: Deal = {
      id: `new-deal-${Date.now()}`,
      name,
      status: 'new',
    };

    setDeals(prev => [...prev, newDeal]);
    setFolders(prev => [...prev, {
      id: newDeal.id,
      name: newDeal.name,
      files: [],
      expanded: true,
      storageUsed: 0,
    }]);

    setShowNewDealModal(false);
    setNewDealName('');
    setSuggestedName('');
  };

  const toggleFolder = (folderId: string) => {
    setFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, expanded: !folder.expanded };
      }
      return folder;
    }));
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllInFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        folder.files.forEach(f => newSet.add(f.id));
        return newSet;
      });
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const toggleStar = (fileId: string) => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      files: folder.files.map(f => f.id === fileId ? { ...f, starred: !f.starred } : f),
    })));
  };

  const toggleShare = (fileId: string) => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      files: folder.files.map(f => f.id === fileId ? { ...f, shared: !f.shared } : f),
    })));
  };

  const addTag = (fileId: string, tag: FileTag) => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      files: folder.files.map(f => {
        if (f.id === fileId && !f.tags.find(t => t.id === tag.id)) {
          return { ...f, tags: [...f.tags, tag] };
        }
        return f;
      }),
    })));
  };

  const removeTag = (fileId: string, tagId: string) => {
    setFolders(prev => prev.map(folder => ({
      ...folder,
      files: folder.files.map(f => f.id === fileId ? { ...f, tags: f.tags.filter(t => t.id !== tagId) } : f),
    })));
  };

  const openPreview = (file: UploadedFile) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  const openVersionHistory = (file: UploadedFile) => {
    setVersionFile(file);
    setShowVersionModal(true);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('spreadsheet') || type.includes('excel')) return FileSpreadsheet;
    if (type.includes('image')) return FileImage;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getActivityIcon = (action: ActivityItem['action']) => {
    switch (action) {
      case 'upload': return FilePlus;
      case 'download': return Download;
      case 'delete': return Trash2;
      case 'share': return Share2;
      case 'tag': return Tag;
      case 'version': return History;
      default: return Activity;
    }
  };

  // Filter and sort files
  const filteredFolders = useMemo(() => {
    return folders
      .filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        folder.files.some(f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.tags.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
      .map(folder => ({
        ...folder,
        files: folder.files
          .filter(f => {
            if (filterCategory !== 'all' && f.category !== filterCategory) return false;
            if (filterTag !== 'all' && !f.tags.some(t => t.id === filterTag)) return false;
            if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          })
          .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
              case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
              case 'date':
                comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
                break;
              case 'size':
                comparison = a.size - b.size;
                break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
          }),
      }));
  }, [folders, searchQuery, filterCategory, filterTag, sortBy, sortOrder]);

  const totalFiles = folders.reduce((acc, folder) => acc + folder.files.length, 0) + unassignedFiles.length;
  const totalStorage = folders.reduce((acc, folder) => acc + folder.storageUsed, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-500">Loading repository...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className={cn(
        'border-r border-surface-200 dark:border-surface-700 transition-all duration-200 flex-shrink-0',
        sidebarCollapsed ? 'w-12' : 'w-56'
      )}>
        <div className="p-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-surface-500 uppercase">Folders</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
          >
            <ChevronRight className={cn('w-4 h-4 text-surface-400 transition-transform', !sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-100px)]">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => toggleFolder(folder.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-800 text-left transition-colors',
                folder.expanded && 'bg-surface-50 dark:bg-surface-800'
              )}
            >
              <Folder className={cn('w-4 h-4 flex-shrink-0', folder.expanded ? 'text-amber-500' : 'text-surface-400')} />
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm text-surface-700 dark:text-surface-300 truncate flex-1">
                    {folder.name}
                  </span>
                  <span className="text-xs text-surface-400">{folder.files.length}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Storage Stats */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-surface-200 dark:border-surface-700">
            <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
              <HardDrive className="w-3.5 h-3.5" />
              Storage Used
            </div>
            <div className="text-sm font-semibold text-surface-900 dark:text-white">
              {formatFileSize(totalStorage)}
            </div>
            <div className="mt-2 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${Math.min((totalStorage / (100 * 1024 * 1024)) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-surface-400 mt-1">of 100 MB</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white">
              Document Repository
            </h1>
            <p className="text-sm text-surface-500">
              {totalFiles} files across {folders.length} deals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={cn(
                'neu-button-sm flex items-center gap-1.5 text-xs',
                showActivity && 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              Activity
            </button>
            <button
              onClick={() => {
                generateSuggestedName();
                setShowNewDealModal(true);
              }}
              className="neu-button-sm flex items-center gap-1.5 text-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Folder
            </button>
            <label className="neu-button-primary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search files, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'neu-button-sm flex items-center gap-1.5 text-xs',
              showFilters && 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
              className="text-xs px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4 text-surface-500" />
              ) : (
                <SortDesc className="w-4 h-4 text-surface-500" />
              )}
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-surface-500">{selectedFiles.size} selected</span>
              <button className="neu-button-sm flex items-center gap-1 text-xs">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button className="neu-button-sm flex items-center gap-1 text-xs text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
              >
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="p-3 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3 flex-wrap bg-surface-50 dark:bg-surface-800/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
              >
                <option value="all">All</option>
                {fileCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500">Tag:</span>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
              >
                <option value="all">All</option>
                {availableTags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterTag('all');
              }}
              className="text-xs text-primary-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-4">
            {/* Files */}
            <div className={cn('flex-1', showActivity && 'pr-4 border-r border-surface-200 dark:border-surface-700')}>
              {/* Templates Section */}
              <div className="mb-4">
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <FileCheck className="w-3.5 h-3.5" />
                  Quick Templates
                </h3>
                <div className="flex flex-wrap gap-2">
                  {documentTemplates.map(template => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 rounded-lg transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-primary-500" />
                        {template.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drop Zone */}
              <div
                className={cn(
                  'mb-4 p-4 border-2 border-dashed rounded-xl transition-colors text-center',
                  dragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-surface-300 dark:border-surface-600'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={cn('w-6 h-6 mx-auto mb-2', dragActive ? 'text-primary-500' : 'text-surface-400')} />
                <p className="text-sm text-surface-500">
                  Drop files here or{' '}
                  <label className="text-primary-500 hover:underline cursor-pointer">
                    browse
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </p>
              </div>

              {/* Folders List/Grid */}
              <div className="space-y-3">
                {filteredFolders.map(folder => (
                  <div key={folder.id} className="neu-card overflow-hidden">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {folder.expanded ? (
                          <ChevronDown className="w-4 h-4 text-surface-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-surface-400" />
                        )}
                        <FolderOpen className="w-5 h-5 text-amber-500" />
                        <span className="font-medium text-surface-900 dark:text-white">
                          {folder.name}
                        </span>
                        <span className="text-xs text-surface-400 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full">
                          {folder.files.length} files
                        </span>
                        <span className="text-xs text-surface-400">
                          {formatFileSize(folder.storageUsed)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInFolder(folder.id);
                          }}
                          className="text-xs text-primary-500 hover:underline"
                        >
                          Select all
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-surface-400" />
                        </button>
                      </div>
                    </button>

                    {folder.expanded && (
                      <div className="border-t border-surface-200 dark:border-surface-700">
                        {folder.files.length === 0 ? (
                          <div className="p-4 text-center text-surface-400">
                            <File className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <p className="text-xs">No files yet</p>
                          </div>
                        ) : viewMode === 'list' ? (
                          <div className="divide-y divide-surface-100 dark:divide-surface-700">
                            {folder.files.map(file => {
                              const FileIcon = getFileIcon(file.type);
                              const isSelected = selectedFiles.has(file.id);
                              return (
                                <div
                                  key={file.id}
                                  className={cn(
                                    'px-4 py-3 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors',
                                    isSelected && 'bg-primary-50 dark:bg-primary-900/10'
                                  )}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleFileSelection(file.id)}
                                      className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                                    />
                                    {file.starred && (
                                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                    )}
                                    <FileIcon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                        {file.name}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-surface-400">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(file.uploadedAt)}</span>
                                        {file.versions.length > 1 && (
                                          <>
                                            <span>•</span>
                                            <span className="text-primary-500">v{file.versions.length}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {/* Tags */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {file.tags.map(tag => (
                                        <span
                                          key={tag.id}
                                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                          style={{ backgroundColor: tag.color }}
                                        >
                                          {tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    {file.shared && (
                                      <Lock className="w-3.5 h-3.5 text-surface-400" />
                                    )}
                                    <button
                                      onClick={() => openPreview(file)}
                                      className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                                      title="Preview"
                                    >
                                      <Eye className="w-4 h-4 text-surface-400" />
                                    </button>
                                    <button
                                      onClick={() => openVersionHistory(file)}
                                      className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                                      title="Version History"
                                    >
                                      <History className="w-4 h-4 text-surface-400" />
                                    </button>
                                    <button
                                      onClick={() => toggleStar(file.id)}
                                      className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                                      title="Star"
                                    >
                                      {file.starred ? (
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                      ) : (
                                        <StarOff className="w-4 h-4 text-surface-400" />
                                      )}
                                    </button>
                                    <button className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
                                      <Download className="w-4 h-4 text-surface-400" />
                                    </button>
                                    <button className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded">
                                      <Trash2 className="w-4 h-4 text-rose-400" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {folder.files.map(file => {
                              const FileIcon = getFileIcon(file.type);
                              const isSelected = selectedFiles.has(file.id);
                              return (
                                <div
                                  key={file.id}
                                  className={cn(
                                    'p-3 rounded-lg border hover:shadow-md transition-all cursor-pointer',
                                    isSelected
                                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                      : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800'
                                  )}
                                  onClick={() => toggleFileSelection(file.id)}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <FileIcon className="w-8 h-8 text-surface-400" />
                                    {file.starred && (
                                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate mb-1">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-surface-400">
                                    {formatFileSize(file.size)}
                                  </p>
                                  {file.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {file.tags.slice(0, 2).map(tag => (
                                        <span
                                          key={tag.id}
                                          className="text-[9px] px-1 py-0.5 rounded-full text-white"
                                          style={{ backgroundColor: tag.color }}
                                        >
                                          {tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Panel */}
            {showActivity && (
              <div className="w-72 flex-shrink-0">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {activityLog.map(activity => {
                    const Icon = getActivityIcon(activity.action);
                    return (
                      <div key={activity.id} className="flex items-start gap-2">
                        <div className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800">
                          <Icon className="w-3.5 h-3.5 text-surface-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-surface-700 dark:text-surface-300">
                            <span className="font-medium">{activity.user}</span>{' '}
                            {activity.action === 'upload' && 'uploaded'}
                            {activity.action === 'download' && 'downloaded'}
                            {activity.action === 'share' && 'shared'}
                            {activity.action === 'tag' && 'tagged'}
                            {activity.action === 'version' && 'updated'}
                          </p>
                          <p className="text-xs text-surface-500 truncate">{activity.fileName}</p>
                          <p className="text-[10px] text-surface-400">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary-500" />
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">
                    {previewFile.name}
                  </h3>
                  <p className="text-xs text-surface-500">
                    {formatFileSize(previewFile.size)} • {formatDate(previewFile.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="neu-button-sm flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button className="neu-button-sm flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                >
                  <X className="w-5 h-5 text-surface-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* AI Summary */}
              <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
                <div className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Summary
                </div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  {previewFile.summary || 'Generating summary...'}
                </p>
              </div>

              {/* Document Info */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-surface-500 uppercase mb-1">Category</h4>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      {fileCategories.find(c => c.id === previewFile.category)?.label || 'Other'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-surface-500 uppercase mb-1">Deal</h4>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      {previewFile.dealName || 'Unassigned'}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-xs font-medium text-surface-500 uppercase mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewFile.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                        <button
                          onClick={() => removeTag(previewFile.id, tag.id)}
                          className="hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="relative group">
                      <button className="text-xs px-2 py-1 border border-dashed border-surface-300 dark:border-surface-600 rounded-full text-surface-500 hover:border-primary-500 hover:text-primary-500">
                        + Add tag
                      </button>
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 hidden group-hover:block z-10">
                        {availableTags.filter(t => !previewFile.tags.find(pt => pt.id === t.id)).map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => addTag(previewFile.id, tag)}
                            className="block w-full text-left px-2 py-1 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                          >
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview placeholder */}
                <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-8 text-center bg-surface-50 dark:bg-surface-800/50">
                  <FileText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm text-surface-500">Document preview would appear here</p>
                  <p className="text-xs text-surface-400 mt-1">PDF, images, and spreadsheets supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && versionFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary-500" />
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">
                    Version History
                  </h3>
                  <p className="text-xs text-surface-500">{versionFile.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {versionFile.versions
                .sort((a, b) => b.version - a.version)
                .map((version, i) => (
                  <div
                    key={version.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      i === 0
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-surface-200 dark:border-surface-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          i === 0
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                        )}>
                          v{version.version}
                        </span>
                        {i === 0 && (
                          <span className="text-xs text-primary-600 dark:text-primary-400">Current</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-primary-500 hover:underline">
                          Download
                        </button>
                        {i !== 0 && (
                          <button className="text-xs text-primary-500 hover:underline">
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-surface-500">
                      <p>Uploaded by {version.uploadedBy}</p>
                      <p>{formatDate(version.uploadedAt)} • {formatFileSize(version.size)}</p>
                      {version.note && (
                        <p className="mt-1 text-surface-700 dark:text-surface-300 italic">"{version.note}"</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                Upload Files
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadingFiles([]);
                }}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Files ({uploadingFiles.length})
                </label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <File className="w-4 h-4 text-surface-400" />
                      <span className="text-surface-600 dark:text-surface-400 truncate">
                        {file.name}
                      </span>
                      <span className="text-surface-400 text-xs">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Assign to Deal
                </label>
                <select
                  value={selectedDeal}
                  onChange={(e) => setSelectedDeal(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                >
                  <option value="">-- Select a deal (optional) --</option>
                  {deals.map(deal => (
                    <option key={deal.id} value={deal.id}>{deal.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Document Category
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fileCategories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors',
                          selectedCategory === category.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                            : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadingFiles([]);
                }}
                className="neu-button"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="neu-button-primary"
              >
                Upload Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                Create Deal Folder
              </h3>
              <button
                onClick={() => {
                  setShowNewDealModal(false);
                  setNewDealName('');
                }}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Deal Name
                </label>
                <input
                  type="text"
                  value={newDealName}
                  onChange={(e) => setNewDealName(e.target.value)}
                  placeholder="Enter deal name..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-white placeholder-surface-400"
                />
              </div>

              <div className="p-3 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suggested Name
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    {suggestedName}
                  </span>
                  <button
                    onClick={() => setNewDealName(suggestedName)}
                    className="text-xs text-primary-500 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Use this
                  </button>
                </div>
                <button
                  onClick={generateSuggestedName}
                  className="text-xs text-surface-500 hover:text-surface-700 mt-2"
                >
                  Generate another suggestion
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewDealModal(false);
                  setNewDealName('');
                }}
                className="neu-button"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={!newDealName && !suggestedName}
                className="neu-button-primary disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
