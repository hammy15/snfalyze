"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts"

const ACCURACY_PCT     = 87
const AUDITED_EPISODES = 42
const ERRORS           = 5
const AVG_REVENUE_IMPACT_PER_ERROR = 312   // avg $ lost per inaccurate OASIS

const monthlyData = [
  { month: "Oct", accuracy: 89 },
  { month: "Nov", accuracy: 85 },
  { month: "Dec", accuracy: 82 },
  { month: "Jan", accuracy: 86 },
  { month: "Feb", accuracy: 84 },
  { month: "Mar", accuracy: 87 },
]

const errorCategories = [
  { type: "M1033 Hospitalization",  errors: 2, impact: 680 },
  { type: "M1800 Grooming",         errors: 1, impact: 210 },
  { type: "M2200 Therapy Need",     errors: 1, impact: 390 },
  { type: "M0080 Discipline",       errors: 1, impact: 145 },
]

function getStatus(pct: number) {
  if (pct >= 95) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Excellent" }
  if (pct >= 88) return { text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Good" }
  return          { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "Needs Work" }
}

export function OASISAccuracyWidget() {
  const st = getStatus(ACCURACY_PCT)
  const totalImpact = ERRORS * AVG_REVENUE_IMPACT_PER_ERROR

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">OASIS Accuracy</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.text}`}>{ACCURACY_PCT}%</span>
            <span className="text-surface-400 text-sm mb-1.5">accurate</span>
          </div>
          <p className="text-xs text-surface-400">
            {AUDITED_EPISODES} audited · {ERRORS} errors · <span className="text-rose-400 font-medium">-${totalImpact.toLocaleString()} revenue impact</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.text} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* Accuracy trend */}
      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[75, 100]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v}%`, "Accuracy"]}
            />
            <ReferenceLine y={95} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={88} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
            <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.accuracy >= 95 ? "#10b981" : entry.accuracy >= 88 ? "#f59e0b" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Error categories */}
      <div>
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Error Breakdown</p>
        <div className="space-y-1.5">
          {errorCategories.map((e) => (
            <div key={e.type} className="flex items-center justify-between text-xs">
              <span className="text-surface-500 dark:text-surface-400">{e.type}</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">{e.errors}x</span>
                <span className="text-rose-400 font-medium">-${e.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
        <p className="text-xs font-semibold text-rose-400">
          Total Revenue at Risk: ${totalImpact.toLocaleString()} · Annualized: ${(totalImpact * 12).toLocaleString()}
        </p>
      </div>
    </Card>
  )
}
