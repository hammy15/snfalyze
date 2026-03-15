"use client"

import { Card } from "@/components/ui/card"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts"

const groups = [
  { group: "MS HHRG",    code: "C1",  episodes: 48, revenue: 2840, prev: 45, color: "#6366f1" },
  { group: "Neuro/Stroke",code: "N1", episodes: 32, revenue: 3120, prev: 35, color: "#14b8a6" },
  { group: "Wounds",     code: "W1",  episodes: 27, revenue: 2650, prev: 25, color: "#f59e0b" },
  { group: "Behavioral", code: "B1",  episodes: 18, revenue: 2420, prev: 19, color: "#a78bfa" },
  { group: "Complex Med",code: "M1",  episodes: 14, revenue: 3580, prev: 12, color: "#f43f5e" },
  { group: "Other",      code: "—",   episodes:  9, revenue: 2100, prev: 10, color: "#64748b" },
]

const total = groups.reduce((s, g) => s + g.episodes, 0)

export function EpisodeMixPDGMWidget() {
  const avgRevenue = Math.round(groups.reduce((s, g) => s + g.revenue * g.episodes, 0) / total)
  const pieData = groups.map(g => ({ name: g.group, value: g.episodes, color: g.color }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Episode Mix — PDGM</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 dark:text-surface-50">{total}</span>
            <span className="text-surface-400 text-sm mb-1.5">episodes MTD</span>
          </div>
          <p className="text-xs text-emerald-400">Avg Revenue: ${avgRevenue.toLocaleString()}/episode</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          +3 MoM
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Pie */}
        <div className="h-[110px] w-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="none">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 10, borderRadius: 6, background: "#1e293b", border: "none", color: "#f1f5f9" }}
                formatter={(v: number) => [`${v} episodes (${Math.round((v / total) * 100)}%)`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Group list */}
        <div className="flex-1 space-y-1.5">
          {groups.slice(0, 5).map((g) => {
            const pct = Math.round((g.episodes / total) * 100)
            const mom = g.episodes - g.prev
            return (
              <div key={g.group} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                <span className="text-xs text-surface-500 dark:text-surface-400 flex-1 truncate">{g.group}</span>
                <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 w-6 text-right">{pct}%</span>
                <span className={`text-xs w-7 text-right font-medium ${mom > 0 ? "text-emerald-400" : mom < 0 ? "text-rose-400" : "text-surface-400"}`}>
                  {mom > 0 ? `+${mom}` : mom}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue by group */}
      <div className="space-y-1.5 border-t border-surface-100 dark:border-surface-700 pt-3">
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Revenue by Group</p>
        {groups.slice(0, 4).map((g) => (
          <div key={g.group} className="flex items-center gap-2">
            <span className="text-xs text-surface-500 w-24">{g.group}</span>
            <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(g.revenue / 4000) * 100}%`, background: g.color }} />
            </div>
            <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 w-14 text-right">
              ${g.revenue.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
