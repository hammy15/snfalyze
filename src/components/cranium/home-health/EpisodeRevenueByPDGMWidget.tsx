"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts"

const groups = [
  { group: "MS HHRG",     revenue: 2840, cost: 2190, margin: 650  },
  { group: "Neuro/Stroke",revenue: 3120, cost: 2480, margin: 640  },
  { group: "Wounds",      revenue: 2650, cost: 2070, margin: 580  },
  { group: "Behavioral",  revenue: 2420, cost: 1950, margin: 470  },
  { group: "Complex Med", revenue: 3580, cost: 2860, margin: 720  },
]

const overallMarginPct = Math.round(
  (groups.reduce((s, g) => s + g.margin, 0) / groups.reduce((s, g) => s + g.revenue, 0)) * 100
)

export function EpisodeRevenueByPDGMWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Episode Revenue — PDGM</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-emerald-500">{overallMarginPct}%</span>
            <span className="text-surface-400 text-sm mb-1.5">avg margin</span>
          </div>
          <p className="text-xs text-surface-400">
            Avg Revenue: <span className="text-teal-400 font-medium">
              ${Math.round(groups.reduce((s, g) => s + g.revenue, 0) / groups.length).toLocaleString()}
            </span>
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          All Positive
        </span>
      </div>

      {/* Revenue vs Cost Chart */}
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groups} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="group" tick={{ fontSize: 8, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n === "revenue" ? "Revenue" : n === "cost" ? "Cost" : "Margin"]}
            />
            <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} name="revenue" opacity={0.85} />
            <Bar dataKey="cost"    fill="#f59e0b" radius={[4, 4, 0, 0]} name="cost"    opacity={0.7}  />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Margin table */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 text-xs font-medium text-surface-400 uppercase tracking-wider pb-1 border-b border-surface-100 dark:border-surface-700">
          <span className="col-span-2">Grouping</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Margin</span>
        </div>
        {groups.map((g) => {
          const marginPct = Math.round((g.margin / g.revenue) * 100)
          return (
            <div key={g.group} className="grid grid-cols-4 text-xs">
              <span className="col-span-2 text-surface-500 dark:text-surface-400 truncate">{g.group}</span>
              <span className="text-right text-surface-700 dark:text-surface-200">${g.revenue.toLocaleString()}</span>
              <span className={`text-right font-semibold ${marginPct >= 22 ? "text-emerald-400" : marginPct >= 18 ? "text-amber-400" : "text-rose-400"}`}>
                {marginPct}%
              </span>
            </div>
          )
        })}
      </div>

      <div className="bg-teal-500/10 rounded-xl p-2.5 border border-teal-500/20">
        <p className="text-xs text-teal-400 font-medium">
          Best margin: Complex Med at {Math.round((720/3580)*100)}% · Best revenue: Complex Med ${3580.toLocaleString()}
        </p>
      </div>
    </Card>
  )
}
