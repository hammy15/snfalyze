import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Deal, Document, UploadedFile } from '@/types';

interface DealsState {
  // Current deal being worked on
  currentDealId: string | null;
  setCurrentDealId: (id: string | null) => void;

  // Uploaded files (before persisted)
  uploadedFiles: UploadedFile[];
  addUploadedFiles: (files: UploadedFile[]) => void;
  updateUploadedFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  // Deal draft (form data before submission)
  dealDraft: Partial<Deal>;
  updateDealDraft: (updates: Partial<Deal>) => void;
  clearDealDraft: () => void;

  // Analysis state
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
  analysisProgress: number;
  setAnalysisProgress: (value: number) => void;

  // Filter state
  filters: {
    status: string;
    assetType: string;
    search: string;
  };
  setFilters: (filters: Partial<DealsState['filters']>) => void;
}

export const useDealsStore = create<DealsState>()(
  persist(
    (set, get) => ({
      // Current deal
      currentDealId: null,
      setCurrentDealId: (id) => set({ currentDealId: id }),

      // Uploaded files
      uploadedFiles: [],
      addUploadedFiles: (files) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, ...files],
        })),
      updateUploadedFile: (id, updates) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),
      removeUploadedFile: (id) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
        })),
      clearUploadedFiles: () => set({ uploadedFiles: [] }),

      // Deal draft
      dealDraft: {},
      updateDealDraft: (updates) =>
        set((state) => ({
          dealDraft: { ...state.dealDraft, ...updates },
        })),
      clearDealDraft: () => set({ dealDraft: {} }),

      // Analysis state
      isAnalyzing: false,
      setIsAnalyzing: (value) => set({ isAnalyzing: value }),
      analysisProgress: 0,
      setAnalysisProgress: (value) => set({ analysisProgress: value }),

      // Filters
      filters: {
        status: 'All',
        assetType: 'All',
        search: '',
      },
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
    }),
    {
      name: 'snfalyze-deals',
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);

// Partners store
interface PartnersState {
  selectedPartnerId: string | null;
  setSelectedPartnerId: (id: string | null) => void;
  filters: {
    type: string;
    search: string;
  };
  setFilters: (filters: Partial<PartnersState['filters']>) => void;
}

export const usePartnersStore = create<PartnersState>((set) => ({
  selectedPartnerId: null,
  setSelectedPartnerId: (id) => set({ selectedPartnerId: id }),
  filters: {
    type: 'All',
    search: '',
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
}));

// Portfolio store
interface PortfolioState {
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  sortBy: string;
  setSortBy: (field: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  viewMode: 'table',
  setViewMode: (mode) => set({ viewMode: mode }),
  sortBy: 'value',
  setSortBy: (field) => set({ sortBy: field }),
  sortOrder: 'desc',
  setSortOrder: (order) => set({ sortOrder: order }),
}));
