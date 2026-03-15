"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { MoveinVelocityData } from "../snf-alf-data"

interface Props { data: MoveinVelocityData }

export function MoveinVelocity({ data }: Props) {
  const diff = data.totalThisMonth - data.totalLastMonth
  const diffColor = diff > 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-surface-400"

  const chartData = data.sources.map(s => ({
    source: s.source.replace("Referral — ", "Ref. ").replace("Hospital ", "Hosp. "),
    "This Month": s.thisMonth,
    "Last Month": s.lastMonth,
  }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Move-in Velocity</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-800 dark:text-surface-100">{data.totalThisMonth}</span>
            <span className="text-surface-400 text-sm mb-1.5">MTD</span>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${diffColor}`}>
            {diff >= 0 ? "+" : ""}{diff} vs last month ({data.totalLastMonth})
          </p>
        </div>
      </div>

      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
            <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
            />
            <Bar dataKey="Last Month" fill="#94a3b8" radius={[3, 3, 0, 0]} opacity={0.5} />
            <Bar dataKey="This Month" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => {
                const delta = entry["This Month"] - entry["Last Month"]
                return <Cell key={i} fill={delta > 0 ? "#10b981" : delta < 0 ? "#f43f5e" : "#14b8a6"} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-surface-200 dark:border-surface-700">
        {data.sources.map(s => {
          const delta = s.thisMonth - s.lastMonth
          const dc = delta > 0 ? "text-emerald-500" : delta < 0 ? "text-rose-500" : "text-surface-400"
          return (
            <div key={s.source} className="flex items-center justify-between">
              <span className="text-xs text-surface-600 dark:text-surface-300 truncate flex-1">{s.source}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-surface-400">{s.lastMonth}</span>
                <span className="text-xs text-surface-300">→</span>
                <span className="text-xs font-bold text-surface-800 dark:text-surface-100">{s.thisMonth}</span>
                <span className={`text-[10px] font-semibold ${dc} w-6 text-right`}>
                  {delta >= 0 ? "+" : ""}{delta}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
