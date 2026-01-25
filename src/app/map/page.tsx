'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { FacilityMap, MapFacility, MapFilters, MapLegend } from '@/components/map/facility-map';
import { Search, Download, Filter, Building2 } from 'lucide-react';

export default function MapPage() {
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSNF, setShowSNF] = useState(true);
  const [showALF, setShowALF] = useState(true);
  const [showILF, setShowILF] = useState(true);
  const [showCascadia, setShowCascadia] = useState(true);
  const [showPotential, setShowPotential] = useState(true);
  const [showDealLabels, setShowDealLabels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Fetch facilities from API with timeout
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    async function fetchFacilities() {
      try {
        const response = await fetch('/api/facilities', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Transform API data to MapFacility format
            const mapFacilities: MapFacility[] = data.data.map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: f.name as string,
              address: f.address as string || '',
              city: f.city as string || '',
              state: f.state as string || '',
              assetType: f.assetType as 'SNF' | 'ALF' | 'ILF',
              beds: f.licensedBeds as number || 0,
              lat: getLatForState(f.state as string, f.city as string),
              lng: getLngForState(f.state as string, f.city as string),
              isCascadia: true, // All facilities in our DB are Cascadia
              cmsRating: f.cmsRating as number || undefined,
              occupancy: f.occupancy as number || undefined,
            }));
            setFacilities(mapFacilities);
          }
        } else {
          setError('Failed to load facilities');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out. Database may be unavailable.');
        } else {
          console.error('Failed to fetch facilities:', err);
          setError('Failed to connect to server');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Approximate coordinates based on city/state (in production would use geocoding)
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
    };

    const stateCoords = coords[state] || {};
    return stateCoords[city] || stateCoords.default || -115.0;
  }

  // Calculate facility counts
  const facilityCounts = useMemo(() => {
    return {
      snf: facilities.filter((f) => f.assetType === 'SNF').length,
      alf: facilities.filter((f) => f.assetType === 'ALF').length,
      ilf: facilities.filter((f) => f.assetType === 'ILF').length,
      cascadia: facilities.filter((f) => f.isCascadia).length,
      potential: facilities.filter((f) => !f.isCascadia).length,
      deals: facilities.filter((f) => f.dealName).length,
    };
  }, [facilities]);

  // Filter by search
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

  // Stats summary
  const visibleCount = useMemo(() => {
    return filteredFacilities.filter((f) => {
      if (f.assetType === 'SNF' && !showSNF) return false;
      if (f.assetType === 'ALF' && !showALF) return false;
      if (f.assetType === 'ILF' && !showILF) return false;
      if (f.isCascadia && !showCascadia) return false;
      if (!f.isCascadia && !showPotential) return false;
      return true;
    }).length;
  }, [filteredFacilities, showSNF, showALF, showILF, showCascadia, showPotential]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Facility Map"
          description="Geographic view of Cascadia facilities and potential acquisition targets"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-500">Loading facilities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Facility Map"
          description="Geographic view of Cascadia facilities and potential acquisition targets"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Map</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Facility Map"
          description="Geographic view of Cascadia facilities and potential acquisition targets"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities yet</h3>
          <p className="text-sm text-gray-500">
            Facilities will appear here once they are added to the system
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Map"
        description="Geographic view of Cascadia facilities and potential acquisition targets"
      />

      {/* Top controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search facilities, cities, or deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-500">Showing:</span>
            <span className="ml-2 font-semibold text-gray-900">{visibleCount} facilities</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1E40AF' }}></span>
            <span className="text-gray-600">{facilityCounts.snf} SNF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#059669' }}></span>
            <span className="text-gray-600">{facilityCounts.alf} ALF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7C3AED' }}></span>
            <span className="text-gray-600">{facilityCounts.ilf} ILF</span>
          </div>
          <div className="border-l border-gray-300 pl-6 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#166534', border: '2px solid #14B8A6' }}
            ></span>
            <span className="text-gray-500">Cascadia:</span>
            <span className="font-semibold text-teal-600">{facilityCounts.cascadia}</span>
          </div>
          <div>
            <span className="text-gray-500">Potential:</span>
            <span className="ml-2 font-semibold text-gray-900">{facilityCounts.potential}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Filters sidebar */}
        {showFilters && (
          <div className="w-64 flex-shrink-0 space-y-4">
            <MapFilters
              showSNF={showSNF}
              showALF={showALF}
              showILF={showILF}
              showCascadia={showCascadia}
              showPotential={showPotential}
              showDealLabels={showDealLabels}
              onToggleSNF={() => setShowSNF(!showSNF)}
              onToggleALF={() => setShowALF(!showALF)}
              onToggleILF={() => setShowILF(!showILF)}
              onToggleCascadia={() => setShowCascadia(!showCascadia)}
              onTogglePotential={() => setShowPotential(!showPotential)}
              onToggleDealLabels={() => setShowDealLabels(!showDealLabels)}
              facilityCounts={facilityCounts}
            />

            <MapLegend />
          </div>
        )}

        {/* Map container - no overflow clipping to allow popups */}
        <div className="flex-1 relative" style={{ zIndex: 1 }}>
          <div
            className="bg-white border border-gray-200"
            style={{
              borderRadius: '0.5rem',
              overflow: 'visible',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              className="h-[600px] relative"
              style={{
                overflow: 'visible',
                borderRadius: '0.5rem',
              }}
            >
              <FacilityMap
                facilities={filteredFacilities}
                showSNF={showSNF}
                showALF={showALF}
                showILF={showILF}
                showCascadia={showCascadia}
                showPotential={showPotential}
                showDealLabels={showDealLabels}
                onFacilityClick={setSelectedFacility}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected facility detail panel */}
      {selectedFacility && (
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div
            className="h-2"
            style={{
              backgroundColor: selectedFacility.isCascadia
                ? selectedFacility.assetType === 'SNF'
                  ? '#166534'
                  : selectedFacility.assetType === 'ALF'
                  ? '#C2410C'
                  : '#CA8A04'
                : selectedFacility.assetType === 'SNF'
                ? '#1E40AF'
                : selectedFacility.assetType === 'ALF'
                ? '#059669'
                : '#7C3AED',
            }}
          />
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-medium text-gray-500">
                  {selectedFacility.assetType}
                  {selectedFacility.isCascadia && ' • Cascadia Owned'}
                </span>
                <h3 className="font-semibold text-gray-900">{selectedFacility.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedFacility.city}, {selectedFacility.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-500 text-xs">Beds</div>
                <div className="font-semibold">{selectedFacility.beds}</div>
              </div>
              {selectedFacility.cmsRating && (
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 text-xs">CMS Rating</div>
                  <div className="font-semibold">{selectedFacility.cmsRating}/5</div>
                </div>
              )}
              {selectedFacility.occupancy && (
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 text-xs">Occupancy</div>
                  <div className="font-semibold">
                    {(selectedFacility.occupancy * 100).toFixed(0)}%
                  </div>
                </div>
              )}
              {selectedFacility.askingPrice && (
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 text-xs">Asking Price</div>
                  <div className="font-semibold">
                    ${(selectedFacility.askingPrice / 1000000).toFixed(1)}M
                  </div>
                </div>
              )}
            </div>

            {selectedFacility.dealName && (
              <a
                href={`/deals/${selectedFacility.dealId}`}
                className="block w-full text-center py-2 bg-primary-500 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                View Deal: {selectedFacility.dealName}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
