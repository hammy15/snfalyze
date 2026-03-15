'use client'

import { cn } from '@/lib/utils'
import { THERAPY_MIX } from '../mock-data'
import { AlertTriangle, CheckCircle2, ArrowRight, Zap, DollarSign } from 'lucide-react'

// Census thresholds
const SWITCH_TO_INHOUSE = 25 // census >= 25, currently contract → should switch to in-house
const SWITCH_TO_CONTRACT = 18 // census < 18, currently in-house → should switch to contract

interface OptAction {
  action: 'switch-to-inhouse' | 'switch-to-contract' | 'optimize' | 'ok'
  label: string
  impact: string
  urgency: 'high' | 'medium' | 'low'
}

function getAction(f: typeof THERAPY_MIX[0]): OptAction {
  const isMainlyContract = f.inHouse < 30
  const isMainlyInhouse = f.inHouse > 60

  if (f.census >= SWITCH_TO_INHOUSE && isMainlyContract) {
    const annualRevImpact = Math.round(f.census * 0.6 * 365 * (305 * 0.09) / 1000)
    return {
      action: 'switch-to-inhouse',
      label: 'Switch to In-House',
      impact: `+$${annualRevImpact}K/yr RPD premium`,
      urgency: 'high',
    }
  }
  if (f.census < SWITCH_TO_CONTRACT && isMainlyInhouse) {
    const annualCostSave = Math.round(f.census * 0.5 * 60 * 250 * (1.88 - 1.42) / 1000)
    return {
      action: 'switch-to-contract',
      label: 'Switch to Contract',
      impact: `-$${annualCostSave}K/yr cost savings`,
      urgency: 'medium',
    }
  }
  if (f.pct > 0 && f.pct < 60 && f.census >= SWITCH_TO_INHOUSE) {
    return {
      action: 'optimize',
      label: 'Increase IH Mix',
      impact: 'Expand in-house to PT/OT leads',
      urgency: 'medium',
    }
  }
  return { action: 'ok', label: 'Optimal', impact: 'No action required', urgency: 'low' }
}

const ACTION_STYLES: Record<string, { bg: string; border: string; badge: string; icon: React.ReactNode }> = {
  'switch-to-inhouse': {
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700',
    icon: <Zap className="w-4 h-4 text-teal-500 flex-shrink-0" />,
  },
  'switch-to-contract': {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  },
  optimize: {
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-800',
    badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700',
    icon: <ArrowRight className="w-4 h-4 text-sky-500 flex-shrink-0" />,
  },
  ok: {
    bg: 'bg-surface-50 dark:bg-surface-800/30',
    border: 'border-surface-100 dark:border-surface-700',
    badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  },
}

export function TherapyMixOptWidget() {
  const facilitiesWithActions = THERAPY_MIX.map(f => ({ ...f, opt: getAction(f) }))
  const highUrgency = facilitiesWithActions.filter(f => f.opt.urgency === 'high').length
  const totalRevImpact = facilitiesWithActions
    .filter(f => f.opt.action === 'switch-to-inhouse')
    .reduce((s, f) => {
      const annualRevImpact = Math.round(f.census * 0.6 * 365 * (305 * 0.09) / 1000)
      return s + annualRevImpact
    }, 0)

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Therapy Mix Optimization Alerts</h3>
          <p className="text-xs text-surface-500 mt-0.5">Which facilities should switch model + projected revenue impact</p>
        </div>
        {highUrgency > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <Zap className="w-3 h-3 text-teal-500" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
              {highUrgency} switch to IH
            </span>
          </div>
        )}
      </div>

      {/* Impact summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3">
          <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">Total Revenue Opportunity</p>
          <p className="text-xl font-bold text-teal-600 dark:text-teal-400">${totalRevImpact}K<span className="text-sm font-normal text-surface-500">/yr</span></p>
          <p className="text-[9px] text-surface-500 mt-0.5">if all IH switches are executed</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 rounded-xl p-3">
          <div className="grid grid-cols-3 gap-1 text-center">
            {[
              { label: 'Switch IH', count: facilitiesWithActions.filter(f => f.opt.action === 'switch-to-inhouse').length, color: 'text-teal-600 dark:text-teal-400' },
              { label: 'Switch Ctrl', count: facilitiesWithActions.filter(f => f.opt.action === 'switch-to-contract').length, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Optimal', count: facilitiesWithActions.filter(f => f.opt.action === 'ok').length, color: 'text-emerald-600 dark:text-emerald-400' },
            ].map(s => (
              <div key={s.label}>
                <p className={cn('text-lg font-bold', s.color)}>{s.count}</p>
                <p className="text-[8px] text-surface-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threshold guide */}
      <div className="flex gap-3 text-[10px] text-surface-500 mb-4 px-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <span>Census ≥25 + contract → switch to IH</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Census &lt;18 + IH → switch to contract</span>
        </div>
      </div>

      {/* Facility list */}
      <div className="space-y-2">
        {facilitiesWithActions
          .sort((a, b) => (a.opt.urgency === 'high' ? -1 : b.opt.urgency === 'high' ? 1 : 0))
          .map(f => {
            const styles = ACTION_STYLES[f.opt.action]
            const isTarget = f.facility.includes('target')

            return (
              <div key={f.facility} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                styles.bg, styles.border,
                isTarget && 'ring-1 ring-sky-300 dark:ring-sky-700'
              )}>
                {styles.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-surface-700 dark:text-surface-300 truncate">{f.facility}</p>
                    {isTarget && <span className="text-[8px] font-bold text-sky-500 border border-sky-300 dark:border-sky-700 rounded px-1">TARGET</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-surface-500">
                    <span>Census {f.census}</span>
                    <span>·</span>
                    <span>{f.inHouse}% IH</span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-500 font-medium">{f.opt.impact}</span>
                  </div>
                </div>
                <span className={cn('text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0', styles.badge)}>
                  {f.opt.label}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
