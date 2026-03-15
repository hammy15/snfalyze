'use client'

import { cn } from '@/lib/utils'
import { THERAPY_OUTCOMES } from '../mock-data'
import { Activity, TrendingUp, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const isReadmit = label === '30-Day Readmit'
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
            <span className="text-surface-500">{p.name}</span>
          </span>
          <span style={{ color: p.fill }}>{p.value}%{isReadmit ? ' readmit' : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function TherapyOutcomesWidget() {
  const avgInHouseWin = THERAPY_OUTCOMES.reduce((s, m) => {
    const isReadmit = m.metric === '30-Day Readmit'
    return s + (isReadmit ? m.contract - m.inHouse : m.inHouse - m.contract)
  }, 0) / THERAPY_OUTCOMES.length

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Therapy Outcomes by Model</h3>
          <p className="text-xs text-surface-500 mt-0.5">Discharge improvement% — in-house vs. contract delivery</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
          <Award className="w-3 h-3 text-teal-500" />
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
            IH +{avgInHouseWin.toFixed(1)}pp avg
          </span>
        </div>
      </div>

      {/* Grouped chart */}
      <div className="mb-5">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart
            data={THERAPY_OUTCOMES}
            barGap={2}
            margin={{ top: 5, right: 5, bottom: 30, left: -20 }}
          >
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="inHouse" name="In-House" fill="#14b8a6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="contract" name="Contract" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="benchmark" name="Benchmark" fill="#f59e0b" radius={[3, 3, 0, 0]} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric cards */}
      <div className="space-y-2">
        {THERAPY_OUTCOMES.map(m => {
          const isReadmit = m.metric === '30-Day Readmit'
          const ihWins = isReadmit ? m.inHouse < m.contract : m.inHouse > m.contract
          const delta = isReadmit ? m.contract - m.inHouse : m.inHouse - m.contract
          const ihVsBench = isReadmit ? m.benchmark - m.inHouse : m.inHouse - m.benchmark

          return (
            <div key={m.metric} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
              ihWins
                ? 'bg-teal-50 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900'
                : 'bg-surface-50 dark:bg-surface-800/30 border-surface-100 dark:border-surface-700'
            )}>
              <Activity className={cn('w-4 h-4 flex-shrink-0', ihWins ? 'text-teal-500' : 'text-surface-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{m.metric}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-surface-500">
                  <span className="text-teal-600 dark:text-teal-400">IH {m.inHouse}%</span>
                  <span>·</span>
                  <span>Contract {m.contract}%</span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400">Benchmark {m.benchmark}%</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={cn(
                  'text-sm font-bold',
                  delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                )}>
                  {delta > 0 ? '+' : ''}{delta}pp
                </div>
                <div className={cn('text-[9px]', ihVsBench > 0 ? 'text-teal-500' : 'text-surface-400')}>
                  vs benchmark {ihVsBench > 0 ? '+' : ''}{ihVsBench}pp
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary insight */}
      <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900">
        <TrendingUp className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-teal-700 dark:text-teal-400 leading-relaxed">
          In-house therapy outperforms contract on all 4 outcome metrics. The 30-day readmission differential of {THERAPY_OUTCOMES.find(m => m.metric === '30-Day Readmit')?.contract! - THERAPY_OUTCOMES.find(m => m.metric === '30-Day Readmit')?.inHouse!}pp translates directly to improved CMS star ratings and reduced penalty risk.
        </p>
      </div>
    </div>
  )
}
