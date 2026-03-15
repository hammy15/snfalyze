"use client"

import { Card } from "@/components/ui/card"
import type { PayerMixDriftData } from "../snf-alf-data"

interface Props { data: PayerMixDriftData }

const PAYERS = [
  { key: "medicare" as const, label: "Medicare-A", color: "#14b8a6", rpd: 720 },
  { key: "ma" as const, label: "MA", color: "#6366f1", rpd: 480 },
  { key: "medicaid" as const, label: "Medicaid", color: "#f97316", rpd: 195 },
  { key: "privatePay" as const, label: "Private Pay", color: "#f59e0b", rpd: 350 },
]

export function PayerMixDrift({ data }: Props) {
  const rpdColor = data.rpdImpact >= 0 ? "text-emerald-500" : "text-rose-500"
  const rpdBg = data.rpdImpact >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Payer Mix Drift</p>
          <p className="text-xs text-surface-400 mt-0.5">Now vs 90 days ago</p>
        </div>
        <div className={`text-right px-3 py-1.5 rounded-xl border ${rpdBg}`}>
          <p className={`text-sm font-bold ${rpdColor}`}>
            {data.rpdImpact >= 0 ? "+" : ""}{data.rpdImpact < 0 ? "-" : ""}${Math.abs(data.rpdImpact).toLocaleString()}
          </p>
          <p className="text-[10px] text-surface-400">RPD impact/mo</p>
        </div>
      </div>

      <div className="space-y-3">
        {PAYERS.map(({ key, label, color }) => {
          const nowVal = data.now[key]
          const agoVal = data.ago90[key]
          const diff = nowVal - agoVal
          const diffColor = key === "medicaid" ? (diff > 0 ? "text-rose-500" : "text-emerald-500") : (diff > 0 ? "text-emerald-500" : "text-rose-500")
          const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→"

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-surface-600 dark:text-surface-300">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400">{agoVal.toFixed(1)}%</span>
                  <span className={`text-xs font-bold ${diffColor}`}>{arrow}</span>
                  <span className="text-xs font-bold text-surface-800 dark:text-surface-100">{nowVal.toFixed(1)}%</span>
                  <span className={`text-[10px] font-semibold ${diffColor} w-10 text-right`}>
                    {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="absolute h-full rounded-full opacity-40 transition-all duration-700" style={{ width: `${agoVal}%`, backgroundColor: color }} />
                <div className="absolute h-full rounded-full transition-all duration-700" style={{ width: `${nowVal}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 text-[10px] text-surface-400 pt-1 border-t border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-1"><div className="w-8 h-1.5 rounded-full bg-surface-300 opacity-60" /> 90d ago</div>
        <div className="flex items-center gap-1"><div className="w-8 h-1.5 rounded-full bg-primary-500" /> Now</div>
      </div>
    </Card>
  )
}
