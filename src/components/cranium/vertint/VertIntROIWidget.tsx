'use client'

import { VERTINT_ROI } from '../mock-data'
import { TrendingUp, DollarSign, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, CartesianGrid } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const fmt = (v: number | null) => v === null ? '—' : v < 0 ? `-$${Math.abs(v / 1000).toFixed(0)}K` : `$${(v / 1000).toFixed(0)}K`
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">Month {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.stroke }} />
            <span className="text-surface-500">{p.name}</span>
          </span>
          <span style={{ color: p.stroke }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const breakEvenSiloed = VERTINT_ROI.find(p => p.siloed >= 0)?.month ?? 0
const breakEvenInteg = VERTINT_ROI.find(p => p.integrated >= 0)?.month ?? 0
const breakEvenAdded = VERTINT_ROI.find(p => p.addedServiceLine >= 0)?.month ?? 0

const month12Siloed = VERTINT_ROI[VERTINT_ROI.length - 1]?.siloed ?? 0
const month12Integ = VERTINT_ROI[VERTINT_ROI.length - 1]?.integrated ?? 0
const month12Added = VERTINT_ROI[VERTINT_ROI.length - 1]?.addedServiceLine ?? 0

export function VertIntROIWidget() {
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Vert-Int ROI Projection</h3>
          <p className="text-xs text-surface-500 mt-0.5">Revenue per patient: siloed vs. integrated vs. add service line (12-month)</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
          <TrendingUp className="w-3 h-3 text-teal-500" />
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
            +${((month12Added - month12Siloed) / 1000).toFixed(0)}K uplift
          </span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Siloed (12mo)', value: month12Siloed, color: 'text-surface-600 dark:text-surface-400', breakeven: 'Month 1' },
          { label: 'Integrated (12mo)', value: month12Integ, color: 'text-teal-600 dark:text-teal-400', breakeven: `Mo ${breakEvenInteg}` },
          { label: 'Add Service Line', value: month12Added, color: 'text-emerald-600 dark:text-emerald-400', breakeven: `Mo ${breakEvenAdded}` },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3">
            <p className={`text-lg font-bold ${stat.color}`}>
              ${(stat.value / 1000).toFixed(0)}K
            </p>
            <p className="text-[9px] text-surface-500 mt-0.5">{stat.label}</p>
            <p className="text-[9px] text-surface-400 mt-1">Breakeven: {stat.breakeven}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={VERTINT_ROI} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-border-opacity, rgba(148,163,184,0.1))" opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `Mo ${v}`}
              interval={1}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v < 0 ? `-$${Math.abs(v / 1000).toFixed(0)}K` : `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
            <Line dataKey="siloed" name="Siloed" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line dataKey="integrated" name="Integrated" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
            <Line dataKey="addedServiceLine" name="Add Service Line" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-surface-500 pt-3 border-t border-surface-100 dark:border-surface-700">
        {[
          { label: 'Siloed', color: '#94a3b8', dash: false },
          { label: 'Integrated', color: '#14b8a6', dash: false },
          { label: 'Add Service Line', color: '#10b981', dash: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{
              background: l.color,
              backgroundImage: l.dash ? `repeating-linear-gradient(90deg, ${l.color} 0, ${l.color} 4px, transparent 4px, transparent 6px)` : undefined
            }} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Zap className="w-3 h-3" />
          <span className="font-semibold">Adding a service line beats integration by Mo {breakEvenAdded > breakEvenInteg ? breakEvenAdded - breakEvenInteg : 0}</span>
        </div>
      </div>
    </div>
  )
}
