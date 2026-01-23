'use client';

import { useEffect, useState, useRef } from 'react';

export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface MapFacility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  assetType: AssetType;
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

interface FacilityMapProps {
  facilities: MapFacility[];
  showSNF: boolean;
  showALF: boolean;
  showILF: boolean;
  showCascadia: boolean;
  showPotential: boolean;
  showDealLabels?: boolean;
  onFacilityClick?: (facility: MapFacility) => void;
}

// Asset type colors for potential deals (non-Cascadia)
const ASSET_COLORS = {
  SNF: '#1E40AF', // Blue
  ALF: '#059669', // Green
  ILF: '#7C3AED', // Purple
};

// Cascadia-specific colors (smaller markers with turquoise ring)
const CASCADIA_COLORS = {
  SNF: '#166534', // Dark Green
  ALF: '#C2410C', // Dark Orange
  ILF: '#CA8A04', // Dark Yellow
};

const TURQUOISE_RING = '#14B8A6'; // Turquoise for Cascadia ring

export function FacilityMap({
  facilities,
  showSNF,
  showALF,
  showILF,
  showCascadia,
  showPotential,
  showDealLabels = false,
  onFacilityClick,
}: FacilityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const labelsRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter facilities based on toggles
  const filteredFacilities = facilities.filter((f) => {
    if (f.assetType === 'SNF' && !showSNF) return false;
    if (f.assetType === 'ALF' && !showALF) return false;
    if (f.assetType === 'ILF' && !showILF) return false;
    if (f.isCascadia && !showCascadia) return false;
    if (!f.isCascadia && !showPotential) return false;
    return true;
  });

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Only create map once
      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current!, {
        center: [39.8283, -98.5795], // US center
        zoom: 4,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      setIsLoaded(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;

      // Clear existing markers and labels
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      labelsRef.current.forEach((label) => label.remove());
      labelsRef.current = [];

      // Add new markers
      filteredFacilities.forEach((facility) => {
        // Use different colors and sizes for Cascadia vs potential deals
        const isCascadia = facility.isCascadia;
        const color = isCascadia
          ? CASCADIA_COLORS[facility.assetType]
          : ASSET_COLORS[facility.assetType];

        // Cascadia markers are smaller circles with turquoise ring
        // Potential deals are larger pin markers
        const size = isCascadia ? 16 : 28;
        const borderStyle = isCascadia
          ? `3px solid ${TURQUOISE_RING}`
          : '2px solid white';

        const icon = isCascadia
          ? L.divIcon({
              className: 'custom-marker cascadia-marker',
              html: `
                <div style="
                  background-color: ${color};
                  width: ${size}px;
                  height: ${size}px;
                  border-radius: 50%;
                  border: ${borderStyle};
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>
              `,
              iconSize: [size + 6, size + 6],
              iconAnchor: [(size + 6) / 2, (size + 6) / 2],
              popupAnchor: [0, -(size + 6) / 2],
            })
          : L.divIcon({
              className: 'custom-marker deal-marker',
              html: `
                <div style="
                  background-color: ${color};
                  width: ${size}px;
                  height: ${size}px;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  border: ${borderStyle};
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <span style="
                    transform: rotate(45deg);
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                  ">${facility.assetType[0]}</span>
                </div>
              `,
              iconSize: [size, size],
              iconAnchor: [size / 2, size],
              popupAnchor: [0, -size],
            });

        const marker = L.marker([facility.lat, facility.lng], { icon }).addTo(
          mapInstanceRef.current
        );

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></span>
              <span style="font-size: 12px; font-weight: 500; color: #6b7280;">
                ${facility.assetType}${facility.isCascadia ? ' • Cascadia' : ''}
              </span>
            </div>
            <h3 style="font-weight: 600; color: #111827; margin-bottom: 4px;">${facility.name}</h3>
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">
              ${facility.city}, ${facility.state}
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <div>
                <span style="color: #6b7280;">Beds:</span>
                <span style="margin-left: 4px; font-weight: 500;">${facility.beds}</span>
              </div>
              ${
                facility.cmsRating
                  ? `<div>
                      <span style="color: #6b7280;">CMS:</span>
                      <span style="margin-left: 4px; font-weight: 500;">${facility.cmsRating}/5</span>
                    </div>`
                  : ''
              }
              ${
                facility.occupancy
                  ? `<div>
                      <span style="color: #6b7280;">Occ:</span>
                      <span style="margin-left: 4px; font-weight: 500;">${(facility.occupancy * 100).toFixed(0)}%</span>
                    </div>`
                  : ''
              }
              ${
                facility.askingPrice
                  ? `<div>
                      <span style="color: #6b7280;">Ask:</span>
                      <span style="margin-left: 4px; font-weight: 500;">$${(facility.askingPrice / 1000000).toFixed(1)}M</span>
                    </div>`
                  : ''
              }
            </div>
            ${
              facility.dealName
                ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    <span style="font-size: 12px; color: #6b7280;">Deal:</span>
                    <span style="margin-left: 4px; font-size: 12px; font-weight: 500; color: #2563eb;">${facility.dealName}</span>
                  </div>`
                : ''
            }
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onFacilityClick?.(facility);
        });

        markersRef.current.push(marker);

        // Add deal label if showDealLabels is enabled and facility has a deal name
        if (showDealLabels && facility.dealName && !facility.isCascadia) {
          const labelIcon = L.divIcon({
            className: 'deal-label-icon',
            html: `<div class="deal-label">${facility.dealName}</div>`,
            iconSize: [100, 20],
            iconAnchor: [50, -5],
          });

          const label = L.marker([facility.lat, facility.lng], {
            icon: labelIcon,
            interactive: false,
            zIndexOffset: 1000,
          }).addTo(mapInstanceRef.current);

          labelsRef.current.push(label);
        }
      });

      // Fit bounds if we have markers
      if (filteredFacilities.length > 0) {
        const bounds = L.latLngBounds(
          filteredFacilities.map((f) => [f.lat, f.lng] as [number, number])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    updateMarkers();
  }, [filteredFacilities, isLoaded, onFacilityClick, showDealLabels]);

  return (
    <div className="relative w-full h-full" style={{ overflow: 'visible' }}>
      {/* CSS to fix popup z-index and marker styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container {
          z-index: 1;
          overflow: visible !important;
        }
        .leaflet-map-pane {
          z-index: 1;
        }
        .leaflet-pane {
          z-index: 400;
        }
        .leaflet-tile-pane {
          z-index: 200;
        }
        .leaflet-overlay-pane {
          z-index: 400;
        }
        .leaflet-shadow-pane {
          z-index: 500;
        }
        .leaflet-marker-pane {
          z-index: 600;
        }
        .leaflet-tooltip-pane {
          z-index: 650;
        }
        .leaflet-popup-pane {
          z-index: 700 !important;
          overflow: visible !important;
        }
        .leaflet-popup {
          z-index: 1000 !important;
          position: absolute !important;
        }
        .leaflet-popup-content-wrapper {
          z-index: 1000 !important;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }
        .leaflet-popup-tip-container {
          z-index: 1000 !important;
        }
        .leaflet-control {
          z-index: 800;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .cascadia-marker {
          z-index: 100 !important;
        }
        .deal-marker {
          z-index: 200 !important;
        }
        .deal-label {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
      `}} />
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '500px', overflow: 'visible' }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cascadia-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Legend component
export function MapLegend() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend</h4>

      <div className="space-y-3">
        {/* Potential Deals Section */}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Potential Deals
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ASSET_COLORS.SNF }}
              />
              <span className="text-sm text-gray-700">SNF</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ASSET_COLORS.ALF }}
              />
              <span className="text-sm text-gray-700">ALF</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ASSET_COLORS.ILF }}
              />
              <span className="text-sm text-gray-700">ILF</span>
            </div>
          </div>
        </div>

        {/* Cascadia Section */}
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Cascadia Owned
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CASCADIA_COLORS.SNF,
                  border: `2px solid ${TURQUOISE_RING}`,
                }}
              />
              <span className="text-sm text-gray-700">SNF</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CASCADIA_COLORS.ALF,
                  border: `2px solid ${TURQUOISE_RING}`,
                }}
              />
              <span className="text-sm text-gray-700">ALF</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CASCADIA_COLORS.ILF,
                  border: `2px solid ${TURQUOISE_RING}`,
                }}
              />
              <span className="text-sm text-gray-700">ILF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter controls component
interface MapFiltersProps {
  showSNF: boolean;
  showALF: boolean;
  showILF: boolean;
  showCascadia: boolean;
  showPotential: boolean;
  showDealLabels?: boolean;
  onToggleSNF: () => void;
  onToggleALF: () => void;
  onToggleILF: () => void;
  onToggleCascadia: () => void;
  onTogglePotential: () => void;
  onToggleDealLabels?: () => void;
  facilityCounts: {
    snf: number;
    alf: number;
    ilf: number;
    cascadia: number;
    potential: number;
    deals?: number;
  };
}

export function MapFilters({
  showSNF,
  showALF,
  showILF,
  showCascadia,
  showPotential,
  showDealLabels = false,
  onToggleSNF,
  onToggleALF,
  onToggleILF,
  onToggleCascadia,
  onTogglePotential,
  onToggleDealLabels,
  facilityCounts,
}: MapFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Filters</h4>

      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Asset Type
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showSNF}
            onChange={onToggleSNF}
            className="w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.SNF }}
          />
          <span className="text-sm text-gray-700 flex-1">SNF</span>
          <span className="text-xs text-gray-400">{facilityCounts.snf}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showALF}
            onChange={onToggleALF}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.ALF }}
          />
          <span className="text-sm text-gray-700 flex-1">ALF</span>
          <span className="text-xs text-gray-400">{facilityCounts.alf}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showILF}
            onChange={onToggleILF}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.ILF }}
          />
          <span className="text-sm text-gray-700 flex-1">ILF</span>
          <span className="text-xs text-gray-400">{facilityCounts.ilf}</span>
        </label>

        <div className="border-t border-gray-200 my-3 pt-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Ownership
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showCascadia}
              onChange={onToggleCascadia}
              className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
            />
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CASCADIA_COLORS.SNF, border: `2px solid ${TURQUOISE_RING}` }}
            />
            <span className="text-sm text-gray-700 flex-1">Cascadia Owned</span>
            <span className="text-xs text-gray-400">{facilityCounts.cascadia}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={showPotential}
              onChange={onTogglePotential}
              className="w-4 h-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
            />
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-700 flex-1">Potential Deals</span>
            <span className="text-xs text-gray-400">{facilityCounts.potential}</span>
          </label>
        </div>

        {/* Display Options */}
        {onToggleDealLabels && (
          <div className="border-t border-gray-200 my-3 pt-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Display
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showDealLabels}
                onChange={onToggleDealLabels}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <svg
                className="w-3 h-3 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <span className="text-sm text-gray-700 flex-1">Show Deal Names</span>
              {facilityCounts.deals !== undefined && (
                <span className="text-xs text-gray-400">{facilityCounts.deals}</span>
              )}
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
