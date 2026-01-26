'use client';

import { useMemo, useState, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  ComposableMap,
  Geographies,
  Geography,
  Annotation,
} from 'react-simple-maps';

// US States TopoJSON - using a reliable CDN source
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// State FIPS codes to abbreviations mapping
const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

// State names for tooltips
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

interface StateData {
  state: string;
  value: number;
  label?: string;
}

interface USMapChartProps {
  data: StateData[];
  colorScale?: [string, string];
  onStateClick?: (state: string) => void;
  selectedState?: string;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function USMapChartInner({
  data,
  colorScale = ['#99F6E4', '#0D9488'], // Turquoise Hammy design
  onStateClick,
  selectedState,
  className,
}: USMapChartProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  const dataMap = useMemo(() => {
    return new Map(data.map((d) => [d.state, d]));
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  const getColor = (value: number) => {
    if (value === 0) return '#E2E8F0'; // Empty state color
    const ratio = value / maxValue;
    const [r1, g1, b1] = hexToRgb(colorScale[0]);
    const [r2, g2, b2] = hexToRgb(colorScale[1]);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hoveredStateData = hoveredState ? dataMap.get(hoveredState) : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-900',
        'shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.6)]',
        'dark:shadow-[4px_4px_8px_rgba(0,0,0,0.25),-4px_-4px_8px_rgba(255,255,255,0.03)]',
        'border border-surface-200/50 dark:border-surface-700/50',
        'p-4',
        className
      )}
    >
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000,
        }}
        style={{
          width: '100%',
          height: 'auto',
          minHeight: '280px',
        }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fipsCode = geo.id;
              const stateAbbr = FIPS_TO_STATE[fipsCode] || '';
              const stateData = dataMap.get(stateAbbr);
              const value = stateData?.value || 0;
              const isSelected = stateAbbr === selectedState;
              const isHovered = stateAbbr === hoveredState;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(value)}
                  stroke={isSelected ? '#14B8A6' : isHovered ? '#2DD4BF' : '#64748B'}
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                  style={{
                    default: {
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    },
                    hover: {
                      fill: value > 0 ? getColor(Math.min(value * 1.2, maxValue)) : '#CBD5E1',
                      stroke: '#14B8A6',
                      strokeWidth: 1.5,
                      outline: 'none',
                      cursor: onStateClick ? 'pointer' : 'default',
                    },
                    pressed: {
                      fill: '#0D9488',
                      outline: 'none',
                    },
                  }}
                  onMouseEnter={() => {
                    setHoveredState(stateAbbr);
                    const stateName = STATE_NAMES[stateAbbr] || stateAbbr;
                    const displayValue = stateData?.label || (value > 0 ? `${value} deals` : 'No deals');
                    setTooltipContent(`${stateName}: ${displayValue}`);
                  }}
                  onMouseLeave={() => {
                    setHoveredState(null);
                    setTooltipContent('');
                  }}
                  onClick={() => {
                    if (onStateClick && stateAbbr) {
                      onStateClick(stateAbbr);
                    }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {hoveredState && tooltipContent && (
        <div className="absolute top-4 left-4 bg-surface-900/95 dark:bg-surface-100/95 text-white dark:text-surface-900 px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none z-10">
          <span className="text-teal-400 dark:text-teal-600 font-semibold">
            {hoveredState}
          </span>
          <span className="mx-2 opacity-50">•</span>
          <span>{hoveredStateData?.label || (hoveredStateData?.value ? `${hoveredStateData.value} deals` : 'No deals')}</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 text-xs text-surface-600 dark:text-surface-400 bg-white/95 dark:bg-surface-800/95 px-3 py-2 rounded-lg shadow-md border border-surface-200/50 dark:border-surface-700/50">
        <span className="font-medium text-surface-700 dark:text-surface-300">Deals:</span>
        <span>Low</span>
        <div
          className="w-20 h-2.5 rounded-full"
          style={{
            background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})`,
          }}
        />
        <span>High</span>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const USMapChart = memo(USMapChartInner);
export default USMapChart;
