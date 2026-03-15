'use client'

import { REVENUE_EPISODES } from '../mock-data'
import { DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

const COLORS = ['#14b8a6', '#6366f1', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">{label}</p>
      <p className="text-surface-600 dark:text-surface-400">
        Revenue: <span className="font-bold text-surface-800 dark:text-white">${payload[0]?.value?.toLocaleString()}</span>
      </p>
      <p className="text-emerald-600 dark:text-emerald-400">
        vs SNF-only: +${((payload[0]?.value - 42000)).toLocaleString()}
      </p>
    </div>
  )
}

const singleServiceAvg = (REVENUE_EPISODES[0].revenue + REVENUE_EPISODES[1].revenue + REVENUE_EPISODES[2].revenue) / 3

export function RevenuePerEpisodeWidget() {
  const fullEpisode = REVENUE_EPISODES[REVENUE_EPISODES.length - 1]
  const snfOnly = REVENUE_EPISODES[0]
  const uplift = ((fullEpisode.revenue - snfOnly.revenue) / snfOnly.revenue * 100).toFixed(0)

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Revenue Per Full Episode</h3>
          <p className="text-xs text-surface-500 mt-0.5">Combined vs single-service integration economics</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{uplift}% uplift</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">SNF Only</p>
          <p className="text-lg font-bold text-surface-700 dark:text-surface-300">${(snfOnly.revenue / 1000).toFixed(0)}K</p>
        </div>
        <div className="text-center border-x border-surface-100 dark:border-surface-700">
          <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">Average Single</p>
          <p className="text-lg font-bold text-surface-700 dark:text-surface-300">${(singleServiceAvg / 1000).toFixed(0)}K</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">Full Episode</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${(fullEpisode.revenue / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={REVENUE_EPISODES} margin={{ top: 5, right: 5, bottom: 20, left: -15 }}>
          <XAxis
            dataKey="service"
            tick={{ fontSize: 9, fill: 'var(--color-surface-500, #6b7280)' }}
            axisLine={false}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--color-surface-500, #6b7280)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v / 1000}K`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <ReferenceLine
            y={snfOnly.revenue}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{ value: 'SNF-only baseline', position: 'insideTopRight', fontSize: 8, fill: '#f97316' }}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {REVENUE_EPISODES.map((entry, i) => (
              <Cell key={entry.service} fill={COLORS[i % COLORS.length]} opacity={entry.service === 'Full Episode' ? 1 : 0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Integration premium */}
      <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
        <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="flex-1 text-xs">
          <span className="text-surface-700 dark:text-surface-300">Full-episode integration captures </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">${((fullEpisode.revenue - snfOnly.revenue) / 1000).toFixed(0)}K more</span>
          <span className="text-surface-500"> per patient vs. SNF-only service</span>
        </div>
      </div>
    </div>
  )
}
