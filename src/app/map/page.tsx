'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { FacilityMap, MapFacility, MapFilters, MapLegend } from '@/components/map/facility-map';
import { Search, Download, Filter } from 'lucide-react';

// Sample facility data - in production this would come from the database/API
const SAMPLE_FACILITIES: MapFacility[] = [
  // Cascadia-owned facilities
  {
    id: 'c1',
    name: 'Cascadia Gardens SNF',
    address: '123 Healthcare Way',
    city: 'Seattle',
    state: 'WA',
    assetType: 'SNF',
    beds: 120,
    lat: 47.6062,
    lng: -122.3321,
    isCascadia: true,
    cmsRating: 4,
    occupancy: 0.88,
  },
  {
    id: 'c2',
    name: 'Cascadia Meadows ALF',
    address: '456 Senior Lane',
    city: 'Portland',
    state: 'OR',
    assetType: 'ALF',
    beds: 85,
    lat: 45.5152,
    lng: -122.6784,
    isCascadia: true,
    cmsRating: 5,
    occupancy: 0.92,
  },
  {
    id: 'c3',
    name: 'Cascadia Pines ILF',
    address: '789 Independence Blvd',
    city: 'Boise',
    state: 'ID',
    assetType: 'ILF',
    beds: 150,
    lat: 43.615,
    lng: -116.2023,
    isCascadia: true,
    occupancy: 0.95,
  },
  {
    id: 'c4',
    name: 'Cascadia Valley SNF',
    address: '321 Care Circle',
    city: 'Spokane',
    state: 'WA',
    assetType: 'SNF',
    beds: 100,
    lat: 47.6588,
    lng: -117.426,
    isCascadia: true,
    cmsRating: 3,
    occupancy: 0.82,
  },
  {
    id: 'c5',
    name: 'Cascadia Springs ALF',
    address: '555 Wellness Dr',
    city: 'Eugene',
    state: 'OR',
    assetType: 'ALF',
    beds: 65,
    lat: 44.0521,
    lng: -123.0868,
    isCascadia: true,
    cmsRating: 4,
    occupancy: 0.89,
  },

  // Potential acquisition targets
  {
    id: 'p1',
    name: 'Sunrise Senior Care',
    address: '100 Elder Ave',
    city: 'Sacramento',
    state: 'CA',
    assetType: 'SNF',
    beds: 140,
    lat: 38.5816,
    lng: -121.4944,
    isCascadia: false,
    cmsRating: 3,
    occupancy: 0.78,
    dealId: 'd1',
    dealName: 'Sunrise Portfolio',
    askingPrice: 18500000,
  },
  {
    id: 'p2',
    name: 'Golden Years ALF',
    address: '200 Retirement Rd',
    city: 'San Francisco',
    state: 'CA',
    assetType: 'ALF',
    beds: 90,
    lat: 37.7749,
    lng: -122.4194,
    isCascadia: false,
    cmsRating: 4,
    occupancy: 0.85,
    dealId: 'd2',
    dealName: 'Bay Area ALF',
    askingPrice: 22000000,
  },
  {
    id: 'p3',
    name: 'Mountain View ILF',
    address: '300 Vista Way',
    city: 'Denver',
    state: 'CO',
    assetType: 'ILF',
    beds: 200,
    lat: 39.7392,
    lng: -104.9903,
    isCascadia: false,
    occupancy: 0.91,
    dealId: 'd3',
    dealName: 'Colorado ILF',
    askingPrice: 35000000,
  },
  {
    id: 'p4',
    name: 'Desert Palms SNF',
    address: '400 Oasis Blvd',
    city: 'Phoenix',
    state: 'AZ',
    assetType: 'SNF',
    beds: 110,
    lat: 33.4484,
    lng: -112.074,
    isCascadia: false,
    cmsRating: 2,
    occupancy: 0.72,
    dealId: 'd4',
    dealName: 'Arizona SNF',
    askingPrice: 12000000,
  },
  {
    id: 'p5',
    name: 'Pacific Breeze ALF',
    address: '500 Coast Highway',
    city: 'San Diego',
    state: 'CA',
    assetType: 'ALF',
    beds: 75,
    lat: 32.7157,
    lng: -117.1611,
    isCascadia: false,
    cmsRating: 5,
    occupancy: 0.94,
    dealId: 'd5',
    dealName: 'SoCal ALF Premium',
    askingPrice: 28000000,
  },
  {
    id: 'p6',
    name: 'Lakeside Manor SNF',
    address: '600 Lake Dr',
    city: 'Salt Lake City',
    state: 'UT',
    assetType: 'SNF',
    beds: 95,
    lat: 40.7608,
    lng: -111.891,
    isCascadia: false,
    cmsRating: 3,
    occupancy: 0.8,
    dealId: 'd6',
    dealName: 'Utah Healthcare',
    askingPrice: 14500000,
  },
  {
    id: 'p7',
    name: 'Emerald City ILF',
    address: '700 Green St',
    city: 'Tacoma',
    state: 'WA',
    assetType: 'ILF',
    beds: 180,
    lat: 47.2529,
    lng: -122.4443,
    isCascadia: false,
    occupancy: 0.88,
    dealId: 'd7',
    dealName: 'Puget Sound ILF',
    askingPrice: 32000000,
  },
  {
    id: 'p8',
    name: 'Valley Care SNF',
    address: '800 Valley Rd',
    city: 'Fresno',
    state: 'CA',
    assetType: 'SNF',
    beds: 130,
    lat: 36.7378,
    lng: -119.7871,
    isCascadia: false,
    cmsRating: 2,
    occupancy: 0.68,
    dealId: 'd8',
    dealName: 'Central CA SNF',
    askingPrice: 11000000,
  },
  {
    id: 'p9',
    name: 'Redwood ALF',
    address: '900 Forest Lane',
    city: 'Oakland',
    state: 'CA',
    assetType: 'ALF',
    beds: 70,
    lat: 37.8044,
    lng: -122.2712,
    isCascadia: false,
    cmsRating: 4,
    occupancy: 0.86,
    dealName: 'East Bay ALF',
    askingPrice: 19000000,
  },
  {
    id: 'p10',
    name: 'Cascade View SNF',
    address: '1000 Mountain Way',
    city: 'Bend',
    state: 'OR',
    assetType: 'SNF',
    beds: 85,
    lat: 44.0582,
    lng: -121.3153,
    isCascadia: false,
    cmsRating: 4,
    occupancy: 0.84,
    dealName: 'Central Oregon SNF',
    askingPrice: 13500000,
  },
  {
    id: 'p11',
    name: 'Silver Lake ILF',
    address: '1100 Silver Blvd',
    city: 'Las Vegas',
    state: 'NV',
    assetType: 'ILF',
    beds: 220,
    lat: 36.1699,
    lng: -115.1398,
    isCascadia: false,
    occupancy: 0.92,
    dealName: 'Vegas Retirement',
    askingPrice: 42000000,
  },
  {
    id: 'p12',
    name: 'Harbor Health SNF',
    address: '1200 Harbor Dr',
    city: 'Long Beach',
    state: 'CA',
    assetType: 'SNF',
    beds: 150,
    lat: 33.77,
    lng: -118.1937,
    isCascadia: false,
    cmsRating: 3,
    occupancy: 0.76,
    dealName: 'LA Harbor SNF',
    askingPrice: 21000000,
  },
];

export default function MapPage() {
  const [showSNF, setShowSNF] = useState(true);
  const [showALF, setShowALF] = useState(true);
  const [showILF, setShowILF] = useState(true);
  const [showCascadia, setShowCascadia] = useState(true);
  const [showPotential, setShowPotential] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Calculate facility counts
  const facilityCounts = useMemo(() => {
    return {
      snf: SAMPLE_FACILITIES.filter((f) => f.assetType === 'SNF').length,
      alf: SAMPLE_FACILITIES.filter((f) => f.assetType === 'ALF').length,
      ilf: SAMPLE_FACILITIES.filter((f) => f.assetType === 'ILF').length,
      cascadia: SAMPLE_FACILITIES.filter((f) => f.isCascadia).length,
      potential: SAMPLE_FACILITIES.filter((f) => !f.isCascadia).length,
    };
  }, []);

  // Filter by search
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_FACILITIES;

    const query = searchQuery.toLowerCase();
    return SAMPLE_FACILITIES.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.dealName?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cascadia-green focus:border-cascadia-green"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-cascadia-green text-white border-cascadia-green'
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
            <span className="w-3 h-3 rounded-full bg-blue-700"></span>
            <span className="text-gray-600">{facilityCounts.snf} SNF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-600"></span>
            <span className="text-gray-600">{facilityCounts.alf} ALF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            <span className="text-gray-600">{facilityCounts.ilf} ILF</span>
          </div>
          <div className="border-l border-gray-300 pl-6">
            <span className="text-gray-500">Cascadia:</span>
            <span className="ml-2 font-semibold text-cascadia-green">{facilityCounts.cascadia}</span>
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
              onToggleSNF={() => setShowSNF(!showSNF)}
              onToggleALF={() => setShowALF(!showALF)}
              onToggleILF={() => setShowILF(!showILF)}
              onToggleCascadia={() => setShowCascadia(!showCascadia)}
              onTogglePotential={() => setShowPotential(!showPotential)}
              facilityCounts={facilityCounts}
            />

            <MapLegend />
          </div>
        )}

        {/* Map container */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-[600px]">
              <FacilityMap
                facilities={filteredFacilities}
                showSNF={showSNF}
                showALF={showALF}
                showILF={showILF}
                showCascadia={showCascadia}
                showPotential={showPotential}
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
              backgroundColor:
                selectedFacility.assetType === 'SNF'
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
                className="block w-full text-center py-2 bg-cascadia-green text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
