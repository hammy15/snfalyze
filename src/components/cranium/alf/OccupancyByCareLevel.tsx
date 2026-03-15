"use client"
import React from "react"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { ALFOccupancyData } from "../snf-alf-data"

interface Props { data: ALFOccupancyData }

const LEVELS = [
  { key: "il" as const, label: "IL", color: "#14b8a6" },
  { key: "al1" as const, label: "AL1", color: "#6366f1" },
  { key: "al2" as const, label: "AL2", color: "#f97316" },
  { key: "memoryCare" as const, label: "Memory Care", color: "#f43f5e" },
]

export function OccupancyByCareLevel({ data }: Props) {
  const occ = data.totalOccupancy
  const occColor = occ >= 92 ? "text-emerald-500" : occ >= 85 ? "text-amber-500" : "text-rose-500"

  const chartData = LEVELS.map(({ key, label, color }) => ({
    name: label,
    value: data[key].occupied,
    color,
  }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Occupancy by Care Level</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${occColor}`}>{occ.toFixed(1)}%</span>
            <span className="text-surface-400 text-sm mb-1.5">overall</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-[110px] h-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
                formatter={(v: number) => [`${v} units`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {LEVELS.map(({ key, label, color }) => {
            const lvl = data[key]
            const lvlColor = lvl.pct >= 92 ? "text-emerald-500" : lvl.pct >= 80 ? "text-amber-500" : "text-rose-500"
            return (
              <div key={key} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-surface-600 dark:text-surface-300">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-surface-400">{lvl.occupied}/{lvl.units}</span>
                    <span className={`text-xs font-bold ${lvlColor}`}>{lvl.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lvl.pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
