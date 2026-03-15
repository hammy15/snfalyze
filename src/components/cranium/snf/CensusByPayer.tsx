"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { CensusByPayerData } from "../snf-alf-data"

const COLORS = ["#14b8a6", "#f97316", "#6366f1", "#f59e0b", "#64748b"]

interface Props { data: CensusByPayerData }

export function CensusByPayer({ data }: Props) {
  const occ = data.occupancyPct
  const occColor = occ >= 90 ? "text-emerald-500" : occ >= 85 ? "text-amber-500" : "text-rose-500"
  const wowColor = data.wowTrend >= 0 ? "text-emerald-500" : "text-rose-500"

  const chartData = data.payers.map((p) => ({ name: p.name, value: p.beds }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Census by Payer</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${occColor}`}>{occ.toFixed(1)}%</span>
            <span className="text-surface-400 text-sm mb-1.5">occupancy</span>
          </div>
          <p className="text-xs text-surface-400">
            {data.occupiedBeds} / {data.totalBeds} beds occupied
          </p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${wowColor}`}>
            {data.wowTrend >= 0 ? "+" : ""}{data.wowTrend.toFixed(1)}%
          </span>
          <p className="text-xs text-surface-400">WoW</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-[110px] h-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
                formatter={(v: number) => [`${v} beds`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-1.5">
          {data.payers.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-surface-600 dark:text-surface-300 flex-1 min-w-0 truncate">{p.name}</span>
              <span className="text-xs font-semibold text-surface-800 dark:text-surface-100">{p.beds}</span>
              <span className="text-xs text-surface-400 w-10 text-right">{p.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-surface-200 dark:border-surface-700">
        {data.payers.slice(0, 3).map((p, i) => (
          <div key={p.name} className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
            <p className="text-[10px] text-surface-400 truncate">{p.name}</p>
            <p className="text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>${p.rpd}/day</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
