"use client"

import { Card } from "@/components/ui/card"
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis } from "recharts"
import type { AncillaryRevenueData } from "../snf-alf-data"

interface Props { data: AncillaryRevenueData }

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
const CAT_COLORS = ["#14b8a6", "#6366f1", "#f97316", "#f59e0b"]

export function AncillaryRevenuePerUnit({ data }: Props) {
  const momColor = data.momChange >= 0 ? "text-emerald-500" : "text-rose-500"
  const chartData = data.trend.map((v, i) => ({ month: MONTHS[i], revenue: v }))
  const totalCategory = data.categories.reduce((s, c) => s + c.revenue, 0)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Ancillary Revenue / Unit</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-800 dark:text-surface-100">${data.perUnit}</span>
            <span className="text-surface-400 text-sm mb-1.5">/ unit</span>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${momColor}`}>
            {data.momChange >= 0 ? "+" : ""}{data.momChange.toFixed(1)}% MoM
          </p>
        </div>
      </div>

      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="ancFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`$${v}/unit`, "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#14b8a6" fill="url(#ancFill)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">By Category</p>
        {data.categories.map((cat, i) => {
          const pct = (cat.revenue / totalCategory) * 100
          return (
            <div key={cat.name} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-600 dark:text-surface-300">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-800 dark:text-surface-100">${cat.revenue.toLocaleString()}</span>
                  <span className="text-[10px] text-surface-400 w-8 text-right">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
