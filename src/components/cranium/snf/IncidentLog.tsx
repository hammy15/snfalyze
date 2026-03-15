"use client"

import { Card } from "@/components/ui/card"
import type { IncidentLogData } from "../snf-alf-data"

interface Props { data: IncidentLogData }

const BENCHMARKS = { falls: 2.5, pressureInjuries: 1.0, infections: 3.0 }

function metricColor(val: number, benchmark: number) {
  if (val <= benchmark * 0.8) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" }
  if (val <= benchmark) return { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" }
  return { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30" }
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <span className="text-rose-500 text-base">↑</span>
  if (trend === "down") return <span className="text-emerald-500 text-base">↓</span>
  return <span className="text-surface-400 text-base">→</span>
}

export function IncidentLog({ data }: Props) {
  const metrics = [
    { label: "Falls", key: "falls" as const, icon: "🦺", unit: "per 1k pt-days", benchmark: BENCHMARKS.falls },
    { label: "Pressure Injuries", key: "pressureInjuries" as const, icon: "🩹", unit: "per 1k pt-days", benchmark: BENCHMARKS.pressureInjuries },
    { label: "Infections", key: "infections" as const, icon: "🦠", unit: "per 1k pt-days", benchmark: BENCHMARKS.infections },
  ]

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Incident Log</p>
        <p className="text-xs text-surface-400 mt-0.5">Per 1,000 patient days · This month</p>
      </div>

      <div className="space-y-3">
        {metrics.map(({ label, key, icon, benchmark }) => {
          const metric = data[key]
          const c = metricColor(metric.per1000, benchmark)
          const barPct = Math.min((metric.per1000 / (benchmark * 2)) * 100, 100)
          const barColor = c.text === "text-emerald-500" ? "bg-emerald-500" : c.text === "text-amber-500" ? "bg-amber-500" : "bg-rose-500"

          return (
            <div key={key} className={`rounded-xl p-3 border ${c.bg} ${c.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-semibold text-surface-700 dark:text-surface-200">{label}</span>
                </div>
                <TrendIcon trend={metric.trend} />
              </div>
              <div className="flex items-end justify-between mb-1.5">
                <div>
                  <span className={`text-2xl font-bold ${c.text}`}>{metric.per1000.toFixed(1)}</span>
                  <span className="text-xs text-surface-400 ml-1">/1k pt-days</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-surface-600 dark:text-surface-300">{metric.thisMonth}</p>
                  <p className="text-[10px] text-surface-400">this month</p>
                </div>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${barPct}%` }} />
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Benchmark: {benchmark.toFixed(1)}/1k</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
