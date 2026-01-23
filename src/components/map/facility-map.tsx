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
  onFacilityClick?: (facility: MapFacility) => void;
}

// Asset type colors
const ASSET_COLORS = {
  SNF: '#1E40AF', // Blue
  ALF: '#059669', // Green (Cascadia green)
  ILF: '#7C3AED', // Purple
};

export function FacilityMap({
  facilities,
  showSNF,
  showALF,
  showILF,
  showCascadia,
  showPotential,
  onFacilityClick,
}: FacilityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add new markers
      filteredFacilities.forEach((facility) => {
        const color = ASSET_COLORS[facility.assetType];
        const borderStyle = facility.isCascadia ? '3px solid #FFD700' : '2px solid white';
        const size = facility.isCascadia ? 32 : 28;

        const icon = L.divIcon({
          className: 'custom-marker',
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
  }, [filteredFacilities, isLoaded, onFacilityClick]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.SNF }}
          />
          <span className="text-sm text-gray-700">Skilled Nursing (SNF)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.ALF }}
          />
          <span className="text-sm text-gray-700">Assisted Living (ALF)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: ASSET_COLORS.ILF }}
          />
          <span className="text-sm text-gray-700">Independent Living (ILF)</span>
        </div>

        <div className="border-t border-gray-200 my-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-yellow-400 bg-gray-400" />
            <span className="text-sm text-gray-700">Cascadia Owned</span>
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
  onToggleSNF: () => void;
  onToggleALF: () => void;
  onToggleILF: () => void;
  onToggleCascadia: () => void;
  onTogglePotential: () => void;
  facilityCounts: {
    snf: number;
    alf: number;
    ilf: number;
    cascadia: number;
    potential: number;
  };
}

export function MapFilters({
  showSNF,
  showALF,
  showILF,
  showCascadia,
  showPotential,
  onToggleSNF,
  onToggleALF,
  onToggleILF,
  onToggleCascadia,
  onTogglePotential,
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
              className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
            />
            <span className="w-3 h-3 rounded-full border-2 border-yellow-400 bg-gray-300" />
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
      </div>
    </div>
  );
}
