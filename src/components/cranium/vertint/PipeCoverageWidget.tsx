'use client'

import { cn } from '@/lib/utils'
import { PIPE_COVERAGE } from '../mock-data'
import { CheckCircle2, XCircle, AlertCircle, MapPin } from 'lucide-react'

const SERVICE_LABELS = ['SNF', 'HH', 'Hospice', 'ALF']
const SERVICE_COLORS = {
  SNF: 'text-teal-600 dark:text-teal-400',
  HH: 'text-indigo-600 dark:text-indigo-400',
  Hospice: 'text-purple-600 dark:text-purple-400',
  ALF: 'text-emerald-600 dark:text-emerald-400',
}

function CoverageCell({ present }: { present: boolean }) {
  return present ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <XCircle className="w-4 h-4 text-rose-400/60 mx-auto" />
  )
}

export function PipeCoverageWidget() {
  const totalRevGap = PIPE_COVERAGE.reduce((s, m) => s + m.revGap, 0)

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Pipe Coverage By Market</h3>
          <p className="text-xs text-surface-500 mt-0.5">Service lines present/missing per market · revenue gap</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            ${(totalRevGap / 1000000).toFixed(1)}M gap
          </span>
        </div>
      </div>

      {/* Coverage grid */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 px-3 py-2.5 bg-surface-50 dark:bg-surface-800 text-[10px] text-surface-500 uppercase font-medium border-b border-surface-200 dark:border-surface-700">
          <span className="col-span-2">Market</span>
          {SERVICE_LABELS.map(s => (
            <span key={s} className={cn('text-center', SERVICE_COLORS[s as keyof typeof SERVICE_COLORS])}>{s}</span>
          ))}
          <span className="text-right">Rev. Gap</span>
        </div>

        {/* Rows */}
        {PIPE_COVERAGE.map((market, i) => {
          const services = [market.snf, market.hh, market.hospice, market.alf]
          const missingCount = services.filter(s => !s).length
          const rowBg = missingCount >= 3 ? 'bg-rose-50/30 dark:bg-rose-950/10' :
            missingCount >= 2 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''

          return (
            <div key={market.market} className={cn(
              'grid grid-cols-6 px-3 py-2.5 items-center',
              i < PIPE_COVERAGE.length - 1 ? 'border-b border-surface-100 dark:border-surface-800' : '',
              rowBg
            )}>
              <div className="col-span-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-surface-400 flex-shrink-0" />
                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{market.market}</span>
                {missingCount > 0 && (
                  <span className="text-[9px] text-rose-500">{missingCount} missing</span>
                )}
              </div>
              {services.map((present, j) => (
                <div key={j} className="text-center">
                  <CoverageCell present={present} />
                </div>
              ))}
              <div className="text-right">
                <span className={cn(
                  'text-xs font-semibold',
                  market.revGap > 3000000 ? 'text-rose-500' :
                    market.revGap > 1500000 ? 'text-amber-500' : 'text-surface-500'
                )}>
                  ${(market.revGap / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Full coverage', count: PIPE_COVERAGE.filter(m => m.snf && m.hh && m.hospice && m.alf).length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '1–2 lines missing', count: PIPE_COVERAGE.filter(m => { const c = [m.snf, m.hh, m.hospice, m.alf].filter(Boolean).length; return c >= 2 && c < 4; }).length, color: 'text-amber-600 dark:text-amber-400' },
          { label: '3+ lines missing', count: PIPE_COVERAGE.filter(m => [m.snf, m.hh, m.hospice, m.alf].filter(Boolean).length < 2).length, color: 'text-rose-600 dark:text-rose-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.count}</p>
            <p className="text-[9px] text-surface-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
