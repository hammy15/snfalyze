"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const TOTAL_ELIGIBLE   = 312   // total eligible residents across facilities
const ENROLLED         = 160
const UNENROLLED       = TOTAL_ELIGIBLE - ENROLLED
const PENETRATION_PCT  = Math.round((ENROLLED / TOTAL_ELIGIBLE) * 100)
const PMPM_AVG         = 1216  // weighted avg PMPM
const REVENUE_UNLOCK   = Math.round(UNENROLLED * PMPM_AVG)

const funnel = [
  { stage: "Total Eligible",   count: 312, color: "#64748b" },
  { stage: "Contacted",        count: 248, color: "#6366f1" },
  { stage: "Interested",       count: 198, color: "#f59e0b" },
  { stage: "In Process",       count: 180, color: "#14b8a6" },
  { stage: "Enrolled",         count: 160, color: "#10b981" },
]

const byFacility = [
  { facility: "Sunrise SNF",  eligible: 92, enrolled: 68, pipeline: 8  },
  { facility: "Valley Care",  eligible: 74, enrolled: 42, pipeline: 5  },
  { facility: "Meadow Ridge", eligible: 85, enrolled: 31, pipeline: 12 },
  { facility: "Harbor View",  eligible: 61, enrolled: 19, pipeline: 15 },
]

export function EnrollmentPipelineWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Enrollment Pipeline</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-amber-400">{UNENROLLED}</span>
            <span className="text-surface-400 text-sm mb-1.5">not enrolled</span>
          </div>
          <p className="text-xs text-surface-400">
            Revenue unlock: <span className="text-emerald-400 font-bold">${(REVENUE_UNLOCK / 1000).toFixed(0)}k/mo</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PENETRATION_PCT >= 60 ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-rose-500 bg-rose-500/10 border-rose-500/30"} border`}>
          {PENETRATION_PCT}% penetration
        </span>
      </div>

      {/* Funnel chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnel} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="stage" tick={{ fontSize: 8, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v} members`]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {funnel.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion rates */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Conversion Funnel</p>
        {funnel.slice(1).map((stage, i) => {
          const prev = funnel[i].count
          const convPct = Math.round((stage.count / prev) * 100)
          return (
            <div key={stage.stage} className="flex items-center gap-2">
              <span className="text-xs text-surface-400 w-2">→</span>
              <span className="text-xs text-surface-500 flex-1">{stage.stage}</span>
              <div className="w-16 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${convPct}%`, background: stage.color }} />
              </div>
              <span className="text-xs font-semibold w-8 text-right" style={{ color: stage.color }}>{convPct}%</span>
            </div>
          )
        })}
      </div>

      {/* Revenue unlock highlight */}
      <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
        <p className="text-xs font-semibold text-emerald-400">
          Revenue unlock if fully enrolled: ${(TOTAL_ELIGIBLE * PMPM_AVG / 1000).toFixed(0)}k/mo
          {" "}(vs current ${(ENROLLED * PMPM_AVG / 1000).toFixed(0)}k/mo)
        </p>
      </div>
    </Card>
  )
}
