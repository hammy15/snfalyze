'use client'

import { cn } from '@/lib/utils'
import { COST_EFFICIENCY } from '../mock-data'
import { TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

const DISCIPLINE_META = {
  PT: { color: '#14b8a6', light: 'text-teal-600 dark:text-teal-400' },
  OT: { color: '#6366f1', light: 'text-indigo-600 dark:text-indigo-400' },
  SLP: { color: '#f97316', light: 'text-orange-600 dark:text-orange-400' },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-surface-500">{p.name}</span>
          <span style={{ color: p.fill }}>${p.value}/min</span>
        </div>
      ))}
    </div>
  )
}

export function CostEfficiencyWidget() {
  const avgSavingsPct = COST_EFFICIENCY.reduce((s, d) =>
    s + ((d.contractCostPerMin - d.inHouseCostPerMin) / d.contractCostPerMin * 100), 0) / COST_EFFICIENCY.length

  const chartData = COST_EFFICIENCY.flatMap(d => [
    { name: `${d.discipline} IH`, value: d.inHouseCostPerMin, model: 'In-House', discipline: d.discipline },
    { name: `${d.discipline} Contract`, value: d.contractCostPerMin, model: 'Contract', discipline: d.discipline },
  ])

  // For grouped bar chart
  const groupedData = COST_EFFICIENCY.map(d => ({
    discipline: d.discipline,
    inHouse: d.inHouseCostPerMin,
    contract: d.contractCostPerMin,
    savings: d.contractCostPerMin - d.inHouseCostPerMin,
    savingsPct: ((d.contractCostPerMin - d.inHouseCostPerMin) / d.contractCostPerMin * 100).toFixed(1),
  }))

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Cost Efficiency by Discipline</h3>
          <p className="text-xs text-surface-500 mt-0.5">Cost per therapy minute PT/OT/SLP — in-house vs. contract</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <TrendingDown className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            avg -{avgSavingsPct.toFixed(0)}% cost IH
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {groupedData.map(d => (
          <div key={d.discipline} className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3 text-center">
            <p className={cn('text-xs font-bold uppercase mb-2', DISCIPLINE_META[d.discipline as keyof typeof DISCIPLINE_META]?.light)}>
              {d.discipline}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-500">In-House</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">${d.inHouse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Contract</span>
                <span className="text-rose-500 font-semibold">${d.contract}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-surface-100 dark:border-surface-700">
                <span className="text-surface-500">Savings</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{d.savingsPct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-4">
        <p className="text-[10px] text-surface-500 uppercase font-medium mb-2">Cost per Minute by Discipline</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={groupedData} barGap={4} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis dataKey="discipline" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 2.5]}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="inHouse" name="In-House" radius={[3, 3, 0, 0]}>
              {groupedData.map((d, i) => (
                <Cell key={i} fill={DISCIPLINE_META[d.discipline as keyof typeof DISCIPLINE_META]?.color} />
              ))}
            </Bar>
            <Bar dataKey="contract" name="Contract" radius={[3, 3, 0, 0]}>
              {groupedData.map((d, i) => (
                <Cell key={i} fill="#94a3b8" opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Annualized savings estimate */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700">
          <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">Annual savings (100 beds, 60% Medicare)</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">~$180K</p>
          <p className="text-[9px] text-surface-500 mt-0.5">vs. full-contract model</p>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900">
          <p className="text-[10px] text-teal-600 dark:text-teal-500 uppercase font-medium mb-1">Crossover point</p>
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">22–25 beds</p>
          <p className="text-[9px] text-teal-700 dark:text-teal-500 mt-0.5">Medicare/MA census to justify IH</p>
        </div>
      </div>
    </div>
  )
}
