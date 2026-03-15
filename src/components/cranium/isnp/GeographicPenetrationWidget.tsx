"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const counties = [
  { county: "King County",     eligible: 98,  enrolled: 68,  state: "WA", opportunity: "moderate" },
  { county: "Pierce County",   eligible: 74,  enrolled: 42,  state: "WA", opportunity: "moderate" },
  { county: "Snohomish Co.",   eligible: 62,  enrolled: 31,  state: "WA", opportunity: "high"     },
  { county: "Kitsap County",   eligible: 45,  enrolled: 12,  state: "WA", opportunity: "high"     },
  { county: "Thurston Co.",    eligible: 33,  enrolled: 7,   state: "WA", opportunity: "high"     },
]

function getPenetrationColor(pct: number) {
  if (pct >= 75) return "#10b981"
  if (pct >= 55) return "#f59e0b"
  return "#f43f5e"
}

function getOpportunityBadge(opp: string) {
  if (opp === "high")     return { text: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High Opportunity" }
  if (opp === "moderate") return { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  label: "Moderate" }
  return                   { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Saturated" }
}

const chartData = counties.map(c => ({
  ...c,
  pct: Math.round((c.enrolled / c.eligible) * 100),
  gap: c.eligible - c.enrolled,
}))

const TOTAL_ELIGIBLE = counties.reduce((s, c) => s + c.eligible, 0)
const TOTAL_ENROLLED = counties.reduce((s, c) => s + c.enrolled, 0)
const OVERALL_PCT    = Math.round((TOTAL_ENROLLED / TOTAL_ELIGIBLE) * 100)
const TOTAL_GAP      = TOTAL_ELIGIBLE - TOTAL_ENROLLED
const PMPM           = 1216
const REVENUE_UNLOCK = TOTAL_GAP * PMPM

export function GeographicPenetrationWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Geographic Penetration</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-amber-400">{OVERALL_PCT}%</span>
            <span className="text-surface-400 text-sm mb-1.5">overall penetration</span>
          </div>
          <p className="text-xs text-surface-400">
            {TOTAL_GAP} unenrolled eligible ·{" "}
            <span className="text-emerald-400 font-medium">
              ${(REVENUE_UNLOCK / 1000).toFixed(0)}k/mo unlock
            </span>
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/30">
          {counties.filter(c => c.opportunity === "high").length} counties — high opp
        </span>
      </div>

      {/* Penetration chart */}
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="county" tick={{ fontSize: 8, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v}%`, "Penetration"]}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getPenetrationColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* County table */}
      <div className="space-y-2">
        {counties.map((c) => {
          const pct = Math.round((c.enrolled / c.eligible) * 100)
          const color = getPenetrationColor(pct)
          const opp = getOpportunityBadge(c.opportunity)
          const revUnlock = (c.eligible - c.enrolled) * PMPM
          return (
            <div key={c.county} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-surface-500 dark:text-surface-400 flex-1">{c.county}</span>
              <div className="w-14 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{pct}%</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${opp.text} ${opp.bg} border ${opp.border} w-20 text-center`}>
                ${(revUnlock / 1000).toFixed(0)}k gap
              </span>
            </div>
          )
        })}
      </div>

      {/* Top opportunities */}
      <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
        <p className="text-xs font-semibold text-emerald-400 mb-1">Top Opportunity Counties</p>
        {counties
          .filter(c => c.opportunity === "high")
          .sort((a, b) => (b.eligible - b.enrolled) - (a.eligible - a.enrolled))
          .map(c => (
            <p key={c.county} className="text-xs text-surface-400">
              {c.county}: {c.eligible - c.enrolled} unenrolled · ${((c.eligible - c.enrolled) * PMPM / 1000).toFixed(0)}k/mo
            </p>
          ))
        }
      </div>
    </Card>
  )
}
