"use client"

import { Card } from "@/components/ui/card"
import type { CareLevelMigrationData } from "../snf-alf-data"

interface Props { data: CareLevelMigrationData }

const LEVEL_COLORS: Record<string, string> = {
  IL: "#14b8a6",
  AL1: "#6366f1",
  AL2: "#f97316",
  "Memory Care": "#f43f5e",
}

const LEVEL_ORDER = ["IL", "AL1", "AL2", "Memory Care"]

export function CareLevelMigration({ data }: Props) {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Care Level Migration</p>
          <p className="text-xs text-surface-400 mt-0.5">Residents moving to higher acuity (30d)</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-rose-500">{data.netHigherAcuity}</span>
          <p className="text-[10px] text-surface-400">total upgrades</p>
        </div>
      </div>

      {/* Flow visualization */}
      <div className="space-y-3">
        {data.flows.map((flow) => {
          const fromColor = LEVEL_COLORS[flow.from] || "#64748b"
          const toColor = LEVEL_COLORS[flow.to] || "#64748b"
          const fromIdx = LEVEL_ORDER.indexOf(flow.from)
          const toIdx = LEVEL_ORDER.indexOf(flow.to)
          const acuityRise = toIdx - fromIdx

          return (
            <div key={`${flow.from}-${flow.to}`} className={`rounded-xl p-3 border transition-all ${flow.count > 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-surface-50 dark:bg-surface-800/40 border-surface-200 dark:border-surface-700"}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fromColor }} />
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-200">{flow.from}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1 text-surface-400">
                    <div className="h-px flex-1 bg-surface-200 dark:bg-surface-700" />
                    <span className="text-xs">→</span>
                    <div className="h-px flex-1 bg-surface-200 dark:bg-surface-700" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toColor }} />
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-200">{flow.to}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xl font-bold ${flow.count > 0 ? "text-rose-500" : "text-surface-300"}`}>{flow.count}</span>
                  <p className="text-[9px] text-surface-400">residents</p>
                </div>
              </div>
              {acuityRise > 1 && flow.count > 0 && (
                <p className="text-[10px] text-rose-400 mt-1.5 ml-1">⚠ Skipped level — care reassessment needed</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 pt-1 border-t border-surface-200 dark:border-surface-700">
        {LEVEL_ORDER.map(level => (
          <div key={level} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[level] }} />
            <span className="text-[10px] text-surface-400">{level}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
