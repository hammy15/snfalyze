"use client"

import { Card } from "@/components/ui/card"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts"

const trendData = [
  { month: "Oct", days: 8,  cost: 7840  },
  { month: "Nov", days: 11, cost: 10780 },
  { month: "Dec", days: 14, cost: 13720 },
  { month: "Jan", days: 9,  cost: 8820  },
  { month: "Feb", days: 12, cost: 11760 },
  { month: "Mar", days: 15, cost: 14700 },
]

const CURRENT_DAYS = 15
const COST_PER_DAY = 980  // avg continuous care cost
const FORECAST_30  = 18   // projected next month

function getStatus(days: number) {
  if (days <= 10)  return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Stable" }
  if (days <= 18)  return { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Elevated" }
  return           { color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High Demand" }
}

export function ContinuousCareDaysWidget() {
  const st = getStatus(CURRENT_DAYS)
  const totalCost = CURRENT_DAYS * COST_PER_DAY
  const forecastCost = FORECAST_30 * COST_PER_DAY

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Continuous Care Days</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.color}`}>{CURRENT_DAYS}</span>
            <span className="text-surface-400 text-sm mb-1.5">days MTD</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.color} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2.5">
          <p className="text-xs text-surface-400">MTD Cost</p>
          <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
            ${totalCost.toLocaleString()}
          </p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-2.5 border border-amber-500/20">
          <p className="text-xs text-surface-400">30-Day Forecast</p>
          <p className="text-sm font-bold text-amber-400">
            {FORECAST_30} days
          </p>
          <p className="text-xs text-surface-400">${forecastCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, n: string) => [
                n === "days" ? `${v} days` : `$${v.toLocaleString()}`,
                n === "days" ? "CC Days" : "Cost"
              ]}
            />
            <Line
              type="monotone" dataKey="days" stroke="#f59e0b"
              strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} name="days"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost breakdown */}
      <div className="border-t border-surface-100 dark:border-surface-700 pt-3">
        <div className="flex justify-between text-xs text-surface-500 mb-2">
          <span>Cost per CC Day</span>
          <span className="font-semibold">${COST_PER_DAY.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-surface-500">
          <span>6-Month Avg</span>
          <span className="font-semibold">
            {Math.round(trendData.reduce((s, d) => s + d.days, 0) / trendData.length)} days/mo
          </span>
        </div>
      </div>
    </Card>
  )
}
