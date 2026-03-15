"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const GIP_PCT = 4.2   // % of total days — CMS limit is ~20% revenue
const COST_PER_DAY = 820
const REVENUE_PER_DAY = 980
const DAYS_THIS_MONTH = 53

const MEDICARE_LIMIT_PCT = 20.0

function getStatus(pct: number) {
  if (pct <= 5)   return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Well-Managed" }
  if (pct <= 12)  return { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Monitor" }
  return           { color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High Utilization" }
}

const pieData = [
  { name: "GIP Days",    value: GIP_PCT,                  color: "#6366f1" },
  { name: "Routine Care",value: 100 - GIP_PCT,             color: "#e2e8f0" },
]

export function GIPUtilizationWidget() {
  const st = getStatus(GIP_PCT)
  const margin = REVENUE_PER_DAY - COST_PER_DAY
  const marginPct = ((margin / REVENUE_PER_DAY) * 100).toFixed(1)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">GIP Utilization</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.color}`}>{GIP_PCT}%</span>
            <span className="text-surface-400 text-sm mb-1.5">of total days</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.color} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="h-[90px] w-[90px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={28} outerRadius={42}
                startAngle={90} endAngle={-270}
                dataKey="value" stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 10, borderRadius: 6, background: "#1e293b", border: "none", color: "#f1f5f9" }}
                formatter={(v: number) => [`${v.toFixed(1)}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats column */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">GIP Days (MTD)</span>
            <span className="font-semibold text-indigo-400">{DAYS_THIS_MONTH}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Cost / Day</span>
            <span className="font-semibold text-surface-700 dark:text-surface-200">${COST_PER_DAY.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Revenue / Day</span>
            <span className="font-semibold text-emerald-400">${REVENUE_PER_DAY.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Margin</span>
            <span className="font-semibold text-emerald-400">${margin} ({marginPct}%)</span>
          </div>
        </div>
      </div>

      {/* CMS Revenue Limit Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-surface-400">CMS Revenue Limit</span>
          <span className="text-surface-400">{GIP_PCT}% of {MEDICARE_LIMIT_PCT}% limit</span>
        </div>
        <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(GIP_PCT / MEDICARE_LIMIT_PCT) * 100}%` }}
          />
        </div>
        <p className="text-xs text-emerald-400 mt-1">
          {(MEDICARE_LIMIT_PCT - GIP_PCT).toFixed(1)}% headroom remaining before CMS review
        </p>
      </div>
    </Card>
  )
}
