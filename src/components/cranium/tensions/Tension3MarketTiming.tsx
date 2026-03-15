'use client'

import { cn } from '@/lib/utils'
import { ACTIVE_DEALS, HELD_ASSETS } from '../mock-data'
import { MapPin, AlertTriangle } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, ZAxis, Label
} from 'recharts'

const activeData = ACTIVE_DEALS.map(d => ({
  x: d.marketOpportunityScore,
  y: d.buildingConditionRisk,
  z: d.beds,
  name: d.shortName,
  type: 'active',
  id: d.id,
}))

const heldData = HELD_ASSETS.slice(0, 5).map(d => ({
  x: d.marketOpportunityScore,
  y: d.buildingConditionRisk,
  z: d.beds,
  name: d.name.split(' ').slice(0, 2).join(' '),
  type: 'held',
  id: d.id,
}))

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const isActive = payload.type === 'active'
  const isFlagged = payload.x >= 6 && payload.y >= 5

  const fill = isActive
    ? isFlagged ? '#f97316' : '#14b8a6'
    : '#6b7280'
  const stroke = isFlagged ? '#ef4444' : 'transparent'

  return (
    <g>
      <circle cx={cx} cy={cy} r={isActive ? 7 : 5} fill={fill} stroke={stroke} strokeWidth={2} />
      {isActive && (
        <text x={cx} y={cy - 11} textAnchor="middle" fill="#e5e7eb" fontSize={9} fontWeight="600">
          {payload.name.split(' ')[0]}
        </text>
      )}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const isFlagged = d.x >= 6 && d.y >= 5
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs max-w-[180px]">
      <p className="font-semibold text-white mb-1">{d.name}</p>
      <div className="space-y-0.5 text-gray-400">
        <p>Market opportunity: <span className="text-teal-400">{d.x}/10</span></p>
        <p>Building risk: <span className="text-orange-400">{d.y}/10</span></p>
        <p>Beds: {d.z}</p>
        {isFlagged && <p className="text-rose-400 font-semibold mt-1">⚠ Deal structure mitigation required</p>}
      </div>
    </div>
  )
}

const QUADRANT_LABELS = [
  { x: 2.5, y: 8.5, label: 'PASS', color: '#6b7280' },
  { x: 8.0, y: 8.5, label: 'MITIGATE', color: '#ef4444' },
  { x: 2.5, y: 1.5, label: 'HOLD', color: '#6b7280' },
  { x: 8.0, y: 1.5, label: 'IDEAL', color: '#10b981' },
]

export function Tension3MarketTiming() {
  const flaggedDeals = activeData.filter(d => d.x >= 6 && d.y >= 5)

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-950 border border-orange-800">
          <span className="text-xs font-bold text-orange-400">T3</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Market Timing vs. Building Condition</h3>
          <p className="text-[10px] text-gray-500">Quadrant: market opportunity vs. condition risk</p>
        </div>
        {flaggedDeals.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-950 border border-orange-800">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-bold text-orange-400">{flaggedDeals.length} FLAGGED</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span>Active deal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Active — flagged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <span>Held asset</span>
          </div>
        </div>

        {/* Quadrant chart */}
        <div className="relative">
          {/* Quadrant background labels */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 px-10 py-2" style={{ paddingBottom: '24px' }}>
              <div className="flex items-start justify-start pt-1 pl-1">
                <span className="text-[9px] font-bold text-gray-700 uppercase">PASS</span>
              </div>
              <div className="flex items-start justify-end pt-1 pr-1">
                <span className="text-[9px] font-bold text-rose-900 uppercase">MITIGATE ⚠</span>
              </div>
              <div className="flex items-end justify-start pb-1 pl-1">
                <span className="text-[9px] font-bold text-gray-700 uppercase">HOLD</span>
              </div>
              <div className="flex items-end justify-end pb-1 pr-1">
                <span className="text-[9px] font-bold text-emerald-900 uppercase">IDEAL ★</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 10]}
                tick={{ fill: '#6b7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Market Opportunity →', position: 'insideBottom', offset: -12, fill: '#4b5563', fontSize: 9 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 10]}
                tick={{ fill: '#6b7280', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Condition Risk →', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9 }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 160]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#374151' }} />
              <ReferenceLine x={5.5} stroke="#374151" strokeDasharray="4 4" />
              <ReferenceLine y={5.5} stroke="#374151" strokeDasharray="4 4" />
              <Scatter
                data={activeData}
                shape={<CustomDot />}
              />
              <Scatter
                data={heldData}
                shape={<CustomDot />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Flagged deals detail */}
        {flaggedDeals.map(d => (
          <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-950/20 border border-orange-900/40">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <div className="flex-1 text-xs">
              <span className="text-orange-400 font-semibold">{d.name}</span>
              <span className="text-gray-500 ml-2">condition risk {d.y}/10 · market {d.x}/10</span>
            </div>
            <span className="text-[9px] font-bold text-orange-400 border border-orange-800 rounded px-1.5 py-0.5">MITIGATE</span>
          </div>
        ))}

        {/* CIL Recommendation */}
        <div className="px-3 py-2.5 rounded-lg border border-amber-900 bg-amber-950/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-amber-400">CIL: Proceed-with-conditions (Nevada ALF)</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Nevada ALF sits in top-right quadrant (condition risk 7.8/10, market 6.8/10). Recommend master lease structure or seller-carry note to cap renovation exposure. Market opportunity does not justify uncapped building risk at current pricing.
          </p>
        </div>
      </div>
    </div>
  )
}
