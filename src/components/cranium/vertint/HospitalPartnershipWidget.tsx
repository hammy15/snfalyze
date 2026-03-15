'use client'

import { cn } from '@/lib/utils'
import { HOSPITAL_PARTNERSHIPS } from '../mock-data'
import { Building2, Star, Clock, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function RiskBadge({ score }: { score: number }) {
  const level = score < 25 ? 'low' : score < 50 ? 'medium' : 'high'
  const styles = {
    low: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    medium: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    high: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  }
  return (
    <span className={cn('px-2 py-0.5 text-[9px] font-bold rounded-full border', styles[level])}>
      {score}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg max-w-[160px]">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1 text-[10px] leading-tight">{label}</p>
      <p className="text-surface-600 dark:text-surface-400">Volume: <span className="font-bold text-surface-800 dark:text-white">{payload[0]?.value}/yr</span></p>
    </div>
  )
}

export function HospitalPartnershipWidget() {
  const totalVolume = HOSPITAL_PARTNERSHIPS.reduce((s, h) => s + h.dischargeVol, 0)
  const preferredCount = HOSPITAL_PARTNERSHIPS.filter(h => h.preferredStatus).length
  const avgRisk = Math.round(HOSPITAL_PARTNERSHIPS.reduce((s, h) => s + h.riskScore, 0) / HOSPITAL_PARTNERSHIPS.length)

  const chartData = HOSPITAL_PARTNERSHIPS.map(h => ({
    name: h.name.split(' ').slice(0, 2).join('\n'),
    volume: h.dischargeVol,
    preferred: h.preferredStatus,
    risk: h.riskScore,
  }))

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Hospital Partnership Strength</h3>
          <p className="text-xs text-surface-500 mt-0.5">Discharge volume, preferred status, tenure, risk score</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-surface-800 dark:text-surface-200">{totalVolume.toLocaleString()}</p>
          <p className="text-[10px] text-surface-500">referrals/yr</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Preferred Partners', value: preferredCount, total: HOSPITAL_PARTNERSHIPS.length, color: 'text-teal-600 dark:text-teal-400' },
          { label: 'Avg Risk Score', value: avgRisk, total: 100, color: avgRisk < 30 ? 'text-emerald-600 dark:text-emerald-400' : avgRisk < 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400' },
          { label: 'Avg Tenure (yrs)', value: (HOSPITAL_PARTNERSHIPS.reduce((s, h) => s + h.tenureYears, 0) / HOSPITAL_PARTNERSHIPS.length).toFixed(1), total: null, color: 'text-surface-700 dark:text-surface-300' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3 text-center">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}{stat.total ? `/${stat.total}` : ''}</p>
            <p className="text-[9px] text-surface-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Volume chart */}
      <div className="mb-4">
        <p className="text-[10px] text-surface-500 uppercase font-medium mb-2">Annual Discharge Volume by Partner</p>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={chartData} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v.replace('\n', ' ')} />
            <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.preferred ? '#14b8a6' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Partner table */}
      <div className="space-y-2">
        {HOSPITAL_PARTNERSHIPS.map(h => (
          <div key={h.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-700">
            <Building2 className="w-4 h-4 text-surface-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">{h.name}</p>
                {h.preferredStatus && (
                  <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-surface-500">{h.dischargeVol}/yr</span>
                <span className="text-[9px] text-surface-400">·</span>
                <Clock className="w-2.5 h-2.5 text-surface-400" />
                <span className="text-[9px] text-surface-500">{h.tenureYears}yr</span>
              </div>
            </div>
            <RiskBadge score={h.riskScore} />
          </div>
        ))}
      </div>
    </div>
  )
}
