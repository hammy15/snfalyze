'use client'

import { cn } from '@/lib/utils'
import { REFERRAL_LEAKAGE } from '../mock-data'
import { TrendingDown, ArrowRight, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

function fmt(n: number) {
  return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1 text-[10px] truncate max-w-[140px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-surface-500">{p.name}</span>
          <span style={{ color: p.fill }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function ReferralLeakageWidget() {
  const totalLeakage = REFERRAL_LEAKAGE.reduce((s, f) => s + f.total, 0)
  const chartData = REFERRAL_LEAKAGE.map(f => ({
    name: f.facility.split(' ')[0] + (f.facility.includes('target') ? ' (T)' : ''),
    hhLeakage: f.snfHhLeakage,
    hospiceLeakage: f.hhHospiceLeakage,
    total: f.total,
    isTarget: f.facility.includes('target'),
  }))

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Referral Leakage By Line</h3>
          <p className="text-xs text-surface-500 mt-0.5">SNF → competitor HH + HH → competitor hospice, dollar value</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{fmt(totalLeakage)}</p>
          <p className="text-[10px] text-surface-500">total annual leakage</p>
        </div>
      </div>

      {/* Leakage flow labels */}
      <div className="flex items-center gap-2 mb-4 text-[10px] text-surface-500">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-rose-500" />
          <span>SNF → competitor HH</span>
        </div>
        <span>&middot;</span>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-orange-500" />
          <span>HH → competitor hospice</span>
        </div>
        <span className="ml-auto text-[9px] text-surface-400">(T) = target acquisition</span>
      </div>

      {/* Stacked bar chart */}
      <div className="mb-5">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: -10 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmt(v)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="hhLeakage" name="SNF→HH leakage" stackId="a" radius={[0, 0, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isTarget ? '#dc2626' : '#f87171'} />
              ))}
            </Bar>
            <Bar dataKey="hospiceLeakage" name="HH→Hospice leakage" stackId="a" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isTarget ? '#ea580c' : '#fb923c'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail rows */}
      <div className="space-y-2">
        {REFERRAL_LEAKAGE.map(f => {
          const isTarget = f.facility.includes('target')
          return (
            <div key={f.facility} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
              isTarget
                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                : 'bg-surface-50 dark:bg-surface-800/30 border-surface-100 dark:border-surface-700'
            )}>
              <TrendingDown className={cn('w-4 h-4 flex-shrink-0', isTarget ? 'text-rose-500' : 'text-surface-400')} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate', isTarget ? 'text-rose-700 dark:text-rose-300' : 'text-surface-700 dark:text-surface-300')}>
                  {f.facility}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-[9px] text-surface-500">
                  <span className="text-rose-500">{fmt(f.snfHhLeakage)} to HH competitors</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                  <span className="text-orange-500">{fmt(f.hhHospiceLeakage)} to hospice</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn('text-sm font-bold', isTarget ? 'text-rose-600 dark:text-rose-400' : 'text-surface-600 dark:text-surface-400')}>
                  {fmt(f.total)}
                </p>
                <p className="text-[9px] text-surface-400">total loss</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
