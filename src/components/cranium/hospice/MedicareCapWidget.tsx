"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const CAP_LIMIT = 33_494     // FY2024 Medicare hospice cap per patient
const ENROLLED  = 42
const AVG_COST  = 25_200     // avg reimbursement per enrolled patient YTD
const UTILIZED  = 31_820     // projected total per patient for cap year
const CAP_PCT   = Math.round((UTILIZED / CAP_LIMIT) * 100)

const CAP_YEAR_END_DAYS = 214   // days until Nov 1 cap year end
const PROJECTED_OVERAGE  = 0    // currently no overage projected

const pieData = [
  { name: "Utilized",   value: CAP_PCT,       color: CAP_PCT >= 90 ? "#f43f5e" : CAP_PCT >= 80 ? "#f59e0b" : "#14b8a6" },
  { name: "Remaining",  value: 100 - CAP_PCT, color: "#e2e8f0" },
]

function getStatus(pct: number) {
  if (pct >= 90) return { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "Critical" }
  if (pct >= 80) return { text: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  label: "Warning" }
  return          { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "On Track" }
}

export function MedicareCapWidget() {
  const st = getStatus(CAP_PCT)
  const headroom = CAP_LIMIT - UTILIZED
  const headroomPct = ((headroom / CAP_LIMIT) * 100).toFixed(1)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Medicare Cap Position</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.text}`}>{CAP_PCT}%</span>
            <span className="text-surface-400 text-sm mb-1.5">cap utilized</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.text} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Donut gauge */}
        <div className="relative h-[100px] w-[100px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={32} outerRadius={46}
                startAngle={90} endAngle={-270}
                dataKey="value" stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${st.text}`}>{CAP_PCT}%</span>
            <span className="text-xs text-surface-400">cap</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Cap Limit</span>
            <span className="font-semibold text-surface-700 dark:text-surface-200">${CAP_LIMIT.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Projected / Patient</span>
            <span className={`font-semibold ${st.text}`}>${UTILIZED.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Headroom</span>
            <span className="font-semibold text-emerald-400">${headroom.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-400">Cap Year End</span>
            <span className="font-semibold text-surface-700 dark:text-surface-200">Nov 1 ({CAP_YEAR_END_DAYS}d)</span>
          </div>
        </div>
      </div>

      {/* Warning bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-surface-400">Utilization Progress</span>
          <span className={`font-medium ${CAP_PCT >= 80 ? "text-amber-400" : "text-surface-400"}`}>
            {CAP_PCT >= 80 ? "⚠ Warning threshold reached" : `${headroomPct}% headroom`}
          </span>
        </div>
        <div className="relative h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${CAP_PCT}%`, background: pieData[0].color }}
          />
          {/* 80% warning marker */}
          <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: "80%" }} />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-surface-400">0%</span>
          <span className="text-amber-400">80% warn</span>
          <span className="text-rose-400">100% cap</span>
        </div>
      </div>

      {PROJECTED_OVERAGE > 0 && (
        <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/30">
          <p className="text-xs font-semibold text-rose-400">
            ⚠ Projected Overage: ${PROJECTED_OVERAGE.toLocaleString()}
          </p>
        </div>
      )}

      {PROJECTED_OVERAGE === 0 && (
        <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30">
          <p className="text-xs font-semibold text-emerald-400">
            ✓ No overage projected — {CAP_YEAR_END_DAYS} days to cap year end
          </p>
        </div>
      )}
    </Card>
  )
}
