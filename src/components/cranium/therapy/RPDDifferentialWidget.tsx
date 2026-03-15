'use client'

import { cn } from '@/lib/utils'
import { RPD_DATA } from '../mock-data'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts'

const PREMIUM_TARGET = { min: 8, max: 12 }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1 truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => p.value > 0 && (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-surface-500">{p.name}</span>
          <span style={{ color: p.fill }}>${p.value}/day</span>
        </div>
      ))}
    </div>
  )
}

export function RPDDifferentialWidget() {
  const avgPremium = RPD_DATA.filter(d => d.premium > 0).reduce((s, d) => s + d.premium, 0) /
    RPD_DATA.filter(d => d.premium > 0).length

  const chartData = RPD_DATA.map(d => ({
    name: d.facility.split(' ')[0],
    inHouseRPD: d.inHouseRPD,
    contractRPD: d.contractRPD,
    premium: d.premium,
    isTarget: d.facility.includes('target'),
  })).filter(d => d.contractRPD > 0)

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">RPD Differential</h3>
          <p className="text-xs text-surface-500 mt-0.5">Revenue per patient day premium: in-house vs. contract · target 8–12%</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            avg +{avgPremium.toFixed(1)}% premium
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-surface-500 uppercase mb-1">Target Range</p>
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{PREMIUM_TARGET.min}–{PREMIUM_TARGET.max}%</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-surface-500 uppercase mb-1">Portfolio Avg</p>
          <p className={cn('text-lg font-bold', avgPremium >= PREMIUM_TARGET.min && avgPremium <= PREMIUM_TARGET.max
            ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
            +{avgPremium.toFixed(1)}%
          </p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-surface-500 uppercase mb-1">Target Gain</p>
          <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
            +${((305 * 0.10) * 365 / 1000).toFixed(0)}K/yr
          </p>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div className="mb-4">
        <p className="text-[10px] text-surface-500 uppercase font-medium mb-2">RPD by Facility (In-House vs. Contract)</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} barGap={2} margin={{ top: 5, right: 5, bottom: 20, left: -10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
              angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
              domain={[250, 350]} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="inHouseRPD" name="In-House RPD" radius={[2, 2, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.inHouseRPD > 0 ? '#14b8a6' : 'transparent'} />
              ))}
            </Bar>
            <Bar dataKey="contractRPD" name="Contract RPD" radius={[2, 2, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isTarget ? '#0ea5e9' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Premium table */}
      <div className="space-y-1.5">
        {RPD_DATA.filter(d => d.contractRPD > 0).map(d => {
          const inTarget = d.premium >= PREMIUM_TARGET.min && d.premium <= PREMIUM_TARGET.max
          const isTarget = d.facility.includes('target')

          return (
            <div key={d.facility} className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl border',
              isTarget ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900' :
                'bg-surface-50 dark:bg-surface-800/30 border-surface-100 dark:border-surface-700'
            )}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-300 truncate">{d.facility}</p>
                <p className="text-[9px] text-surface-500 mt-0.5">
                  {d.inHouseRPD > 0 ? `IH $${d.inHouseRPD}` : 'No IH'} · Contract $${d.contractRPD}
                </p>
              </div>
              {d.premium > 0 ? (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className={cn('text-sm font-bold', inTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                    +{d.premium}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400">Opportunity</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
