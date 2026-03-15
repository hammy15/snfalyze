"use client"

import { Card } from "@/components/ui/card"
import type { PDPMAccuracyData } from "../snf-alf-data"

interface Props { data: PDPMAccuracyData }

const COMPONENTS = [
  { key: "pt", label: "PT", color: "#14b8a6", max: 0.5 },
  { key: "ot", label: "OT", color: "#f97316", max: 0.45 },
  { key: "slp", label: "SLP", color: "#6366f1", max: 0.2 },
  { key: "nursing", label: "Nursing", color: "#f59e0b", max: 1.0 },
  { key: "nta", label: "NTA", color: "#ec4899", max: 0.3 },
] as const

export function PDPMAccuracy({ data }: Props) {
  const captureColor = data.captureRate >= 95 ? "text-emerald-500" : data.captureRate >= 90 ? "text-amber-500" : "text-rose-500"
  const riskColor = data.revenueAtRisk < 5000 ? "text-emerald-500" : data.revenueAtRisk < 15000 ? "text-amber-500" : "text-rose-500"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">PDPM Accuracy</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${captureColor}`}>{data.captureRate.toFixed(1)}%</span>
            <span className="text-surface-400 text-sm mb-1.5">capture</span>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${riskColor}`}>${data.revenueAtRisk.toLocaleString()}</p>
          <p className="text-[10px] text-surface-400">revenue at risk</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-3 text-center">
          <p className="text-[10px] text-surface-400 mb-1">Actual CMI</p>
          <p className="text-xl font-bold text-surface-800 dark:text-surface-100">{data.actualCMI.toFixed(2)}</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-3 text-center">
          <p className="text-[10px] text-surface-400 mb-1">Expected CMI</p>
          <p className="text-xl font-bold text-surface-500">{data.expectedCMI.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Component Breakdown</p>
        {COMPONENTS.map(({ key, label, color, max }) => {
          const val = data.components[key]
          const pct = Math.min((val / max) * 100, 100)
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-600 dark:text-surface-300">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>{val.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
