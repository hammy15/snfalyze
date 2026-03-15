"use client"

import { Card } from "@/components/ui/card"
import type { WaitlistDepthData } from "../snf-alf-data"

interface Props { data: WaitlistDepthData }

const STATUS_CONFIG = {
  healthy: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Healthy" },
  warning: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Low" },
  critical: { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Critical" },
}

const LEVEL_COLORS: Record<string, string> = {
  IL: "#14b8a6",
  AL1: "#6366f1",
  AL2: "#f97316",
  "Memory Care": "#f43f5e",
}

export function WaitlistDepth({ data }: Props) {
  const criticalCount = data.entries.filter(e => e.status === "critical").length
  const warningCount = data.entries.filter(e => e.status === "warning").length

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Waitlist Depth</p>
          <p className="text-xs text-surface-400 mt-0.5">Alert if avg wait &lt;3 weeks</p>
        </div>
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500">
            {criticalCount} Critical
          </span>
        )}
        {criticalCount === 0 && warningCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500">
            {warningCount} Low
          </span>
        )}
      </div>

      <div className="space-y-3">
        {data.entries.map((entry) => {
          const s = STATUS_CONFIG[entry.status]
          const color = LEVEL_COLORS[entry.careLevel] || "#64748b"
          const barPct = Math.min((entry.avgWaitWeeks / 10) * 100, 100)

          return (
            <div key={entry.careLevel} className={`rounded-xl p-3 border ${s.bg} ${s.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-surface-700 dark:text-surface-200">{entry.careLevel}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color} ${s.bg} ${s.border}`}>
                  {s.label}
                </span>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <span className={`text-2xl font-bold ${s.color}`}>{entry.waitlistCount}</span>
                  <span className="text-xs text-surface-400 ml-1">on waitlist</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-surface-600 dark:text-surface-300">
                    {entry.avgWaitWeeks > 0 ? `${entry.avgWaitWeeks.toFixed(1)}w` : "—"}
                  </span>
                  <span className="text-xs text-surface-400 ml-1">avg wait</span>
                </div>
              </div>
              {entry.avgWaitWeeks > 0 && (
                <div className="mt-2 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, backgroundColor: color }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
