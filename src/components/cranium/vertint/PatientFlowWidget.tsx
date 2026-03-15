'use client'

import { cn } from '@/lib/utils'
import { PATIENT_FLOW } from '../mock-data'
import { ArrowRight, TrendingDown, DollarSign } from 'lucide-react'

const NODE_COLOR = {
  snf: 'bg-teal-500',
  hh: 'bg-indigo-500',
  hospice: 'bg-purple-500',
  alf: 'bg-emerald-500',
  leakage: 'bg-rose-500/20 border border-rose-700',
}

function FlowNode({ label, count, color, pct }: { label: string; count: number; color: string; pct?: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('rounded-xl px-4 py-2.5 min-w-[90px] text-center', color)}>
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="text-lg font-bold text-white">{count.toLocaleString()}</p>
        {pct !== undefined && (
          <p className="text-[9px] text-white/70">{pct}% conversion</p>
        )}
      </div>
    </div>
  )
}

function LeakageNode({ count, dollars }: { count: number; dollars: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-[8px] text-rose-500 font-medium">↓ leaked</div>
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg px-3 py-1.5 text-center">
        <p className="text-xs font-bold text-rose-400">{count.toLocaleString()}</p>
        <p className="text-[9px] text-rose-600">${(dollars / 1000000).toFixed(1)}M lost</p>
      </div>
    </div>
  )
}

export function PatientFlowWidget() {
  const totalPatients = PATIENT_FLOW.snfDischarges
  const hhConvPct = Math.round((PATIENT_FLOW.hhConversions / totalPatients) * 100)
  const hospConvPct = Math.round((PATIENT_FLOW.hospiceConversions / PATIENT_FLOW.hhConversions) * 100)
  const alfConvPct = Math.round((PATIENT_FLOW.alfConversions / PATIENT_FLOW.hospiceConversions) * 100)

  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Patient Flow Across Lines</h3>
          <p className="text-xs text-surface-500 mt-0.5">SNF discharges → HH → Hospice → ALF conversion funnel</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
          <TrendingDown className="w-3 h-3 text-rose-500" />
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{PATIENT_FLOW.leakageRate}% leakage</span>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="flex items-start justify-between gap-2 mb-6 overflow-x-auto pb-2">
        {/* SNF */}
        <FlowNode label="SNF" count={PATIENT_FLOW.snfDischarges} color="bg-teal-600 dark:bg-teal-700" />

        <div className="flex flex-col items-center gap-1 pt-4">
          <ArrowRight className="w-4 h-4 text-surface-400" />
          <LeakageNode count={PATIENT_FLOW.hhLeakage} dollars={PATIENT_FLOW.revenueLost * 0.55} />
        </div>

        {/* HH */}
        <FlowNode label="HH" count={PATIENT_FLOW.hhConversions} color="bg-indigo-600 dark:bg-indigo-700" pct={hhConvPct} />

        <div className="flex flex-col items-center gap-1 pt-4">
          <ArrowRight className="w-4 h-4 text-surface-400" />
          <LeakageNode count={PATIENT_FLOW.hospiceLeakage} dollars={PATIENT_FLOW.revenueLost * 0.3} />
        </div>

        {/* Hospice */}
        <FlowNode label="Hospice" count={PATIENT_FLOW.hospiceConversions} color="bg-purple-600 dark:bg-purple-700" pct={hospConvPct} />

        <div className="flex flex-col items-center gap-1 pt-4">
          <ArrowRight className="w-4 h-4 text-surface-400" />
          <LeakageNode count={PATIENT_FLOW.hospiceConversions - PATIENT_FLOW.alfConversions} dollars={PATIENT_FLOW.revenueLost * 0.15} />
        </div>

        {/* ALF */}
        <FlowNode label="ALF" count={PATIENT_FLOW.alfConversions} color="bg-emerald-600 dark:bg-emerald-700" pct={alfConvPct} />
      </div>

      {/* Revenue captured vs lost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Revenue Captured</span>
          </div>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            ${(PATIENT_FLOW.revenueCapured / 1000000).toFixed(1)}M
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
            {Math.round((PATIENT_FLOW.revenueCapured / (PATIENT_FLOW.revenueCapured + PATIENT_FLOW.revenueLost)) * 100)}% of total opportunity
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold uppercase">Revenue Lost</span>
          </div>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300">
            ${(PATIENT_FLOW.revenueLost / 1000000).toFixed(1)}M
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-500 mt-0.5">
            to competitor HH + Hospice
          </p>
        </div>
      </div>
    </div>
  )
}
