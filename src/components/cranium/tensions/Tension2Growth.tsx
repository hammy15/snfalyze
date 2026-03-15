'use client'

import { cn } from '@/lib/utils'
import { PIPELINE_CAPACITY } from '../mock-data'
import { AlertTriangle, Users, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts'

const CAPACITY_MAX = 100

function UtilBar({ pct }: { pct: number }) {
  const color = pct > 120 ? 'bg-rose-500' : pct > 100 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 150) / 1.5}%` }} />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-300">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Tension2Growth() {
  const isOverCapacity = PIPELINE_CAPACITY.utilizationPct > CAPACITY_MAX

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-950 border border-amber-800">
          <span className="text-xs font-bold text-amber-400">T2</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Growth vs. Staffing Capacity</h3>
          <p className="text-[10px] text-gray-500">Pipeline deals vs. integration capacity + RM bandwidth</p>
        </div>
        {isOverCapacity && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950 border border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400">CAPACITY ALERT</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Top split panel */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Pipeline */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span className="text-[11px] font-semibold text-gray-300 uppercase">Pipeline</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{PIPELINE_CAPACITY.totalPipeline}</div>
            <p className="text-xs text-gray-500 mb-3">total deals</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Active (closing)</span>
                <span className="text-teal-400 font-semibold">{PIPELINE_CAPACITY.activeDeals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Near-term (sourced)</span>
                <span className="text-amber-400 font-semibold">{PIPELINE_CAPACITY.nearTermPipeline}</span>
              </div>
            </div>
          </div>

          {/* Right: Capacity */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-semibold text-gray-300 uppercase">Capacity</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{PIPELINE_CAPACITY.maxCapacity}</div>
            <p className="text-xs text-gray-500 mb-3">max deals supported</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Regional Mgrs</span>
                <span className="text-white font-semibold">{PIPELINE_CAPACITY.rmCount} FTE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deals per RM</span>
                <span className="text-white font-semibold">{PIPELINE_CAPACITY.dealsPerRM}×</span>
              </div>
            </div>
          </div>
        </div>

        {/* Utilization bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 font-medium">Overall Utilization</span>
            <span className={cn('text-sm font-bold', PIPELINE_CAPACITY.utilizationPct > 120 ? 'text-rose-400' : PIPELINE_CAPACITY.utilizationPct > 100 ? 'text-amber-400' : 'text-emerald-400')}>
              {PIPELINE_CAPACITY.utilizationPct}%
            </span>
          </div>
          <UtilBar pct={PIPELINE_CAPACITY.utilizationPct} />
          <div className="flex justify-between text-[9px] text-gray-600 mt-1">
            <span>0%</span>
            <span className="text-emerald-700">100% capacity</span>
            <span className="text-rose-700">150%</span>
          </div>
        </div>

        {/* Regional breakdown chart */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-medium mb-2">By Region</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={PIPELINE_CAPACITY.regions} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <ReferenceLine y={4} stroke="#374151" strokeDasharray="4 4" label={{ value: 'max/RM', position: 'right', fill: '#4b5563', fontSize: 9 }} />
              <Bar dataKey="activeDeals" name="Active Deals" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="capacity" name="Capacity" fill="#374151" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CIL Recommendation */}
        <div className="px-3 py-2.5 rounded-lg border border-rose-900 bg-rose-950/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-rose-400">CIL: Proceed-with-conditions</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Pipeline at {PIPELINE_CAPACITY.utilizationPct}% of integration capacity. Pause new sourcing in Mountain and Southwest regions until Pacific NW closes or hire one additional Regional Manager. CIL policy: do not allow pipeline to exceed 130% capacity without explicit approval.
          </p>
        </div>
      </div>
    </div>
  )
}
