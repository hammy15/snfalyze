"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

// Distribution of episodes by visit count band
const distribution = [
  { band: "<7",    count: 4,  risk: "safety",   color: "#f43f5e" },
  { band: "7-11",  count: 12, risk: "low",       color: "#f59e0b" },
  { band: "12-18", count: 58, risk: "optimal",   color: "#10b981" },
  { band: "19-24", count: 28, risk: "moderate",  color: "#f59e0b" },
  { band: ">25",   count: 9,  risk: "overuse",   color: "#f43f5e" },
]

const AVG_VISITS = 16.3
const TOTAL_EPISODES = distribution.reduce((s, d) => s + d.count, 0)

export function VisitUtilizationWidget() {
  const safetyRisk = distribution.find(d => d.band === "<7")!.count
  const overuse    = distribution.find(d => d.band === ">25")!.count
  const optimal    = distribution.find(d => d.band === "12-18")!.count
  const optimalPct = Math.round((optimal / TOTAL_EPISODES) * 100)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Visit Utilization</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-emerald-500">{AVG_VISITS}</span>
            <span className="text-surface-400 text-sm mb-1.5">avg visits/episode</span>
          </div>
          <p className="text-xs text-emerald-400">Optimal range: 12-18 visits</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          {optimalPct}% optimal
        </span>
      </div>

      {/* Distribution Chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="band" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v} episodes`, "Count"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk flags */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-rose-500/10 rounded-xl p-2.5 border border-rose-500/20">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-semibold text-rose-400">Safety Risk</span>
          </div>
          <p className="text-xl font-bold text-rose-500">{safetyRisk}</p>
          <p className="text-xs text-surface-400">episodes &lt;7 visits</p>
        </div>
        <div className="bg-rose-500/10 rounded-xl p-2.5 border border-rose-500/20">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-semibold text-rose-400">Case Selection</span>
          </div>
          <p className="text-xl font-bold text-rose-500">{overuse}</p>
          <p className="text-xs text-surface-400">episodes &gt;25 visits</p>
        </div>
      </div>

      <div className="flex justify-between text-xs text-surface-400 bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/20">
        <span className="text-emerald-400 font-medium">✓ Optimal (12-18 visits)</span>
        <span className="text-emerald-400 font-bold">{optimal} episodes ({optimalPct}%)</span>
      </div>
    </Card>
  )
}
