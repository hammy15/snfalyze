'use client'

import { cn } from '@/lib/utils'
import { THERAPY_MIX } from '../mock-data'
import { Users, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
const BREAKEVEN_CENSUS = 25

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1 text-[10px] truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-surface-500">{p.name}</span>
          <span style={{ color: p.fill }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function InHouseVsContractWidget() {
  const inhouseCount = THERAPY_MIX.filter(f => f.pct >= BREAKEVEN_CENSUS).length
  const contractCount = THERAPY_MIX.filter(f => f.pct < BREAKEVEN_CENSUS).length

  const chartData = THERAPY_MIX.map(f => ({
    name: f.facility.split(' ')[0],
    inHouse: f.inHouse,
    contract: f.contract,
    census: f.census,
    aboveBreakeven: f.census >= BREAKEVEN_CENSUS,
    isTarget: f.facility.includes('target'),
  }))

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">In-House vs. Contract Mix</h3>
          <p className="text-xs text-surface-500 mt-0.5">% in-house vs. contract per facility PT/OT/SLP · breakeven at 25+ Medicare/MA</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <CheckCircle2 className="w-3 h-3 text-teal-500" />
            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400">{inhouseCount} in-house</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
            <Users className="w-3 h-3 text-surface-500" />
            <span className="text-[9px] font-bold text-surface-600 dark:text-surface-400">{contractCount} contract</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-5">
        <p className="text-[10px] text-surface-500 uppercase font-medium mb-2">In-House % by Facility</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
              angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
              domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <ReferenceLine
              y={50}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Breakeven', position: 'insideTopRight', fontSize: 8, fill: '#d97706' }}
            />
            <Bar dataKey="inHouse" name="In-House %" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isTarget ? '#0ea5e9' : d.aboveBreakeven ? '#14b8a6' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Facility rows */}
      <div className="space-y-2">
        {THERAPY_MIX.map(f => {
          const isTarget = f.facility.includes('target')
          const aboveBreakeven = f.census >= BREAKEVEN_CENSUS

          return (
            <div key={f.facility} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
              isTarget ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800' :
                aboveBreakeven ? 'bg-teal-50 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900' :
                  'bg-surface-50 dark:bg-surface-800/30 border-surface-100 dark:border-surface-700'
            )}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-300 truncate">{f.facility}</p>
                <div className="flex items-center gap-2 mt-1">
                  {/* In-house bar */}
                  <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', aboveBreakeven ? 'bg-teal-500' : isTarget ? 'bg-sky-500' : 'bg-surface-400')}
                      style={{ width: `${f.inHouse}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <div className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  {f.inHouse}% <span className="text-surface-400 font-normal">IH</span>
                </div>
                <div className="text-[9px] text-surface-500">census {f.census}</div>
              </div>
              {isTarget && (
                <span className="text-[8px] font-bold text-sky-500 border border-sky-300 dark:border-sky-700 rounded px-1.5 py-0.5 flex-shrink-0">TARGET</span>
              )}
              {!isTarget && aboveBreakeven && (
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
              )}
              {!isTarget && !aboveBreakeven && f.census < 18 && (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
