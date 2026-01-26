'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  Download,
  Filter,
  Building2,
  MapPin,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

// Dynamically import map component to avoid SSR issues with Leaflet
const FacilityMapComponent = dynamic(
  () => import('@/components/map/facility-map').then((mod) => mod.FacilityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-surface-100 dark:bg-surface-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-surface-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface MapFacility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  beds: number;
  lat: number;
  lng: number;
  isCascadia: boolean;
  cmsRating?: number;
  occupancy?: number;
  dealId?: string;
  dealName?: string;
  askingPrice?: number;
}

export default function MapPage() {
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSNF, setShowSNF] = useState(true);
  const [showALF, setShowALF] = useState(true);
  const [showILF, setShowILF] = useState(true);
  const [showHOSPICE, setShowHOSPICE] = useState(true);
  const [showCascadia, setShowCascadia] = useState(true);
  const [showPotential, setShowPotential] = useState(true);
  const [showDealLabels, setShowDealLabels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/facilities');

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const mapFacilities: MapFacility[] = data.data.map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: f.name as string,
              address: f.address as string || '',
              city: f.city as string || '',
              state: f.state as string || '',
              assetType: f.assetType as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
              beds: f.licensedBeds as number || 0,
              lat: getLatForState(f.state as string, f.city as string),
              lng: getLngForState(f.state as string, f.city as string),
              isCascadia: true,
              cmsRating: f.cmsRating as number || undefined,
              occupancy: f.occupancy as number || undefined,
            }));
            setFacilities(mapFacilities);
          }
        } else {
          setError('Failed to load facilities');
        }
      } catch (err) {
        console.error('Failed to fetch facilities:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  function getLatForState(state: string, city: string): number {
    const coords: Record<string, Record<string, number>> = {
      ID: {
        Orofino: 46.4766, 'Coeur d\'Alene': 47.6777, Bellevue: 43.4635, Grangeville: 45.9260,
        Lewiston: 46.4165, 'Idaho Falls': 43.4917, Silverton: 47.2893, Moscow: 46.7324,
        Boise: 43.6150, Nampa: 43.5407, Caldwell: 43.6629, Kellogg: 47.5377,
        Weiser: 44.2510, 'Twin Falls': 42.5558, Emmett: 43.8735, Payette: 44.0782,
        default: 44.0682
      },
      MT: { Libby: 48.3883, Eureka: 48.8797, Helena: 46.5958, default: 47.0527 },
      OR: {
        'Wood Village': 45.5335, Brookings: 42.0526, Eugene: 44.0521, Gresham: 45.4987,
        Portland: 45.5152, default: 43.8041
      },
      WA: {
        'Battle Ground': 45.7807, Colville: 48.5471, Bellingham: 48.7519, Snohomish: 47.9129,
        'Spokane Valley': 47.6733, Blaine: 48.9937, Vancouver: 45.6387, Clarkston: 46.4165,
        Colfax: 46.8799, default: 47.7511
      },
      AZ: { 'Sun City': 33.5978, Phoenix: 33.4484, default: 34.0489 },
      CA: { 'San Diego': 32.7157, 'Los Angeles': 34.0522, 'San Francisco': 37.7749, 'La Jolla': 32.8328, default: 36.7783 },
    };
    const stateCoords = coords[state] || {};
    return stateCoords[city] || stateCoords.default || 45.0;
  }

  function getLngForState(state: string, city: string): number {
    const coords: Record<string, Record<string, number>> = {
      ID: {
        Orofino: -116.2551, 'Coeur d\'Alene': -116.7805, Bellevue: -114.2611, Grangeville: -116.1224,
        Lewiston: -117.0177, 'Idaho Falls': -112.0339, Silverton: -115.9952, Moscow: -117.0002,
        Boise: -116.2023, Nampa: -116.5635, Caldwell: -116.6874, Kellogg: -116.1213,
        Weiser: -116.9693, 'Twin Falls': -114.4609, Emmett: -116.4996, Payette: -116.9340,
        default: -114.7420
      },
      MT: { Libby: -115.5561, Eureka: -115.0533, Helena: -112.0391, default: -109.6333 },
      OR: {
        'Wood Village': -122.4179, Brookings: -124.2839, Eugene: -123.0868, Gresham: -122.4310,
        Portland: -122.6784, default: -120.5542
      },
      WA: {
        'Battle Ground': -122.5343, Colville: -117.9053, Bellingham: -122.4781, Snohomish: -122.0982,
        'Spokane Valley': -117.2394, Blaine: -122.7468, Vancouver: -122.6615, Clarkston: -117.0455,
        Colfax: -117.3636, default: -120.7401
      },
      AZ: { 'Sun City': -112.2716, Phoenix: -112.0740, default: -111.0937 },
      CA: { 'San Diego': -117.1611, 'Los Angeles': -118.2437, 'San Francisco': -122.4194, 'La Jolla': -117.2713, default: -119.4179 },
    };
    const stateCoords = coords[state] || {};
    return stateCoords[city] || stateCoords.default || -115.0;
  }

  const facilityCounts = useMemo(() => {
    return {
      snf: facilities.filter((f) => f.assetType === 'SNF').length,
      alf: facilities.filter((f) => f.assetType === 'ALF').length,
      ilf: facilities.filter((f) => f.assetType === 'ILF').length,
      hospice: facilities.filter((f) => f.assetType === 'HOSPICE').length,
      cascadia: facilities.filter((f) => f.isCascadia).length,
      potential: facilities.filter((f) => !f.isCascadia).length,
      deals: facilities.filter((f) => f.dealName).length,
    };
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities;
    const query = searchQuery.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.dealName?.toLowerCase().includes(query)
    );
  }, [facilities, searchQuery]);

  const visibleCount = useMemo(() => {
    return filteredFacilities.filter((f) => {
      if (f.assetType === 'SNF' && !showSNF) return false;
      if (f.assetType === 'ALF' && !showALF) return false;
      if (f.assetType === 'ILF' && !showILF) return false;
      if (f.assetType === 'HOSPICE' && !showHOSPICE) return false;
      if (f.isCascadia && !showCascadia) return false;
      if (!f.isCascadia && !showPotential) return false;
      return true;
    }).length;
  }, [filteredFacilities, showSNF, showALF, showILF, showHOSPICE, showCascadia, showPotential]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Facility Map</h1>
            <p className="text-sm text-surface-500 mt-0.5">Geographic view of facilities</p>
          </div>
        </div>
        <div className="neu-card h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-surface-500">Loading facilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Facility Map</h1>
            <p className="text-sm text-surface-500 mt-0.5">Geographic view of facilities</p>
          </div>
        </div>
        <div className="neu-card h-[600px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-1">Something went wrong</h3>
            <p className="text-sm text-surface-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="neu-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Facility Map</h1>
          <p className="text-sm text-surface-500 mt-0.5">Geographic view of facilities and acquisition targets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'neu-button px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2',
              showFilters && 'bg-primary-500 text-white'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="neu-button px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats & Search - Compact inline bar */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          {/* Compact stats */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="text-surface-500">Showing <strong className="text-surface-900 dark:text-surface-100">{visibleCount}</strong></span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-surface-600 dark:text-surface-400">{facilityCounts.snf} SNF</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="text-surface-600 dark:text-surface-400">{facilityCounts.alf} ALF</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span className="text-surface-600 dark:text-surface-400">{facilityCounts.ilf} ILF</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-surface-600 dark:text-surface-400">{facilityCounts.hospice} Hospice</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4">
        {/* Filters sidebar - Compact */}
        {showFilters && (
          <div className="w-56 flex-shrink-0 space-y-3">
            <div className="neu-card p-3">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Asset Type</h4>
              <div className="space-y-1.5">
                {[
                  { key: 'snf', label: 'SNF', color: '#1E40AF', checked: showSNF, toggle: () => setShowSNF(!showSNF), count: facilityCounts.snf },
                  { key: 'alf', label: 'ALF', color: '#059669', checked: showALF, toggle: () => setShowALF(!showALF), count: facilityCounts.alf },
                  { key: 'ilf', label: 'ILF', color: '#7C3AED', checked: showILF, toggle: () => setShowILF(!showILF), count: facilityCounts.ilf },
                  { key: 'hospice', label: 'Hospice', color: '#F59E0B', checked: showHOSPICE, toggle: () => setShowHOSPICE(!showHOSPICE), count: facilityCounts.hospice },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={item.toggle}
                      className="w-3.5 h-3.5 rounded border-surface-300 text-primary-600"
                    />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 text-surface-700 dark:text-surface-300">{item.label}</span>
                    <span className="text-xs text-surface-400">{item.count}</span>
                  </label>
                ))}
              </div>

              <div className="border-t border-surface-200 dark:border-surface-700 mt-3 pt-3">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Ownership</h4>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={showCascadia}
                      onChange={() => setShowCascadia(!showCascadia)}
                      className="w-3.5 h-3.5 rounded border-surface-300 text-primary-600"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-700 ring-2 ring-primary-500" />
                    <span className="flex-1 text-surface-700 dark:text-surface-300">Cascadia</span>
                    <span className="text-xs text-surface-400">{facilityCounts.cascadia}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={showPotential}
                      onChange={() => setShowPotential(!showPotential)}
                      className="w-3.5 h-3.5 rounded border-surface-300 text-primary-600"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-surface-400" />
                    <span className="flex-1 text-surface-700 dark:text-surface-300">Potential</span>
                    <span className="text-xs text-surface-400">{facilityCounts.potential}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Legend - Compact */}
            <div className="neu-card p-3">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Legend</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-600" />
                  <span className="text-surface-600 dark:text-surface-400">Potential Deal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-700 ring-2 ring-primary-500" />
                  <span className="text-surface-600 dark:text-surface-400">Cascadia Owned</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map container */}
        <div className="flex-1">
          <div className="neu-card overflow-hidden" style={{ height: '600px' }}>
            <FacilityMapComponent
              facilities={filteredFacilities}
              showSNF={showSNF}
              showALF={showALF}
              showILF={showILF}
              showHOSPICE={showHOSPICE}
              showCascadia={showCascadia}
              showPotential={showPotential}
              showDealLabels={showDealLabels}
              onFacilityClick={setSelectedFacility}
            />
          </div>
        </div>
      </div>

      {/* Selected facility popup */}
      {selectedFacility && (
        <div className="fixed bottom-4 right-4 w-72 neu-card overflow-hidden z-50 shadow-xl">
          <div
            className="h-1.5"
            style={{
              backgroundColor: selectedFacility.assetType === 'SNF' ? '#1E40AF' : selectedFacility.assetType === 'ALF' ? '#059669' : selectedFacility.assetType === 'HOSPICE' ? '#F59E0B' : '#7C3AED',
            }}
          />
          <div className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-surface-500">{selectedFacility.assetType}</span>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-sm">{selectedFacility.name}</h3>
                <p className="text-xs text-surface-500">{selectedFacility.city}, {selectedFacility.state}</p>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded"
              >
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-50 dark:bg-surface-800 rounded p-1.5">
                <div className="text-surface-500">Beds</div>
                <div className="font-semibold text-surface-900 dark:text-surface-100">{selectedFacility.beds}</div>
              </div>
              {selectedFacility.cmsRating && (
                <div className="bg-surface-50 dark:bg-surface-800 rounded p-1.5">
                  <div className="text-surface-500">CMS</div>
                  <div className="font-semibold text-surface-900 dark:text-surface-100">{selectedFacility.cmsRating}/5</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
