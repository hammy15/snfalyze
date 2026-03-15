"use client"

import { Card } from "@/components/ui/card"
import type { HPPDByShiftData } from "../snf-alf-data"

interface Props { data: HPPDByShiftData }

function shiftColor(actual: number, target: number) {
  const ratio = actual / target
  if (ratio >= 0.97) return { bar: "bg-emerald-500", text: "text-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" }
  if (ratio >= 0.88) return { bar: "bg-amber-500", text: "text-amber-500", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" }
  return { bar: "bg-rose-500", text: "text-rose-500", badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" }
}

function totalColor(total: number, benchmark: number) {
  if (total >= benchmark) return "text-emerald-500"
  if (total >= benchmark * 0.95) return "text-amber-500"
  return "text-rose-500"
}

const SHIFTS = [
  { label: "Morning", icon: "🌅", key: "morning" as const },
  { label: "Afternoon", icon: "☀️", key: "afternoon" as const },
  { label: "Night", icon: "🌙", key: "night" as const },
]

export function HPPDByShift({ data }: Props) {
  const tc = totalColor(data.total, data.benchmark)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">HPPD by Shift</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${tc}`}>{data.total.toFixed(2)}</span>
            <span className="text-surface-400 text-sm mb-1.5">HPPD total</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-surface-500">{data.benchmark.toFixed(1)}</span>
          <p className="text-xs text-surface-400">benchmark</p>
        </div>
      </div>

      {/* Benchmark bar */}
      <div className="relative h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-700 ${totalColor(data.total, data.benchmark) === 'text-emerald-500' ? 'bg-emerald-500' : totalColor(data.total, data.benchmark) === 'text-amber-500' ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min((data.total / (data.benchmark * 1.2)) * 100, 100)}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-surface-500/60"
          style={{ left: `${(data.benchmark / (data.benchmark * 1.2)) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {SHIFTS.map(({ label, icon, key }) => {
          const shift = data[key]
          const c = shiftColor(shift.actual, shift.target)
          const pct = Math.min((shift.actual / shift.target) * 100, 110)
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-600 dark:text-surface-300">{icon} {label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${c.text}`}>{shift.actual.toFixed(2)}</span>
                  <span className="text-xs text-surface-400">/ {shift.target.toFixed(1)}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${c.badge}`}>
                    {((shift.actual / shift.target) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 text-[10px] pt-1 border-t border-surface-200 dark:border-surface-700">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥97% target</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 88–96%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> &lt;88%</span>
      </div>
    </Card>
  )
}
