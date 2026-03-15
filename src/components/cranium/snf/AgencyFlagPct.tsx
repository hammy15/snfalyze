"use client"

import { Card } from "@/components/ui/card"
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts"
import type { AgencyFlagData } from "../snf-alf-data"

interface Props { data: AgencyFlagData }

const WEEKS = ["W–5", "W–4", "W–3", "W–2", "W–1", "Now"]

function getStatus(pct: number) {
  if (pct < 10) return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", fill: "#10b981", label: "Healthy", gradId: "agFill_green" }
  if (pct <= 20) return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", fill: "#f59e0b", label: "Monitor", gradId: "agFill_amber" }
  return { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", fill: "#f43f5e", label: "Elevated", gradId: "agFill_rose" }
}

export function AgencyFlagPct({ data }: Props) {
  const st = getStatus(data.agencyHoursPct)
  const chartData = data.trend.map((v, i) => ({ week: WEEKS[i], pct: v }))
  const wowColor = data.weeklyChange > 0 ? "text-rose-500" : data.weeklyChange < 0 ? "text-emerald-500" : "text-surface-400"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Agency Hours %</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-5xl font-bold ${st.color}`}>{data.agencyHoursPct.toFixed(1)}%</span>
          </div>
          <p className={`text-xs font-medium ${wowColor} mt-0.5`}>
            {data.weeklyChange >= 0 ? "+" : ""}{data.weeklyChange.toFixed(1)}% WoW
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color} ${st.bg} ${st.border}`}>
          {st.label}
        </span>
      </div>

      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={st.gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={st.fill} stopOpacity={0.3} />
                <stop offset="95%" stopColor={st.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Agency %"]}
            />
            <Area type="monotone" dataKey="pct" stroke={st.fill} fill={`url(#${st.gradId})`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-surface-200 dark:border-surface-700 text-center">
        <div className="bg-emerald-500/10 rounded-xl p-2">
          <p className="text-[10px] text-surface-400">Green</p>
          <p className="text-xs font-bold text-emerald-500">&lt;10%</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-2">
          <p className="text-[10px] text-surface-400">Yellow</p>
          <p className="text-xs font-bold text-amber-500">10–20%</p>
        </div>
        <div className="bg-rose-500/10 rounded-xl p-2">
          <p className="text-[10px] text-surface-400">Red</p>
          <p className="text-xs font-bold text-rose-500">&gt;20%</p>
        </div>
      </div>
    </Card>
  )
}
