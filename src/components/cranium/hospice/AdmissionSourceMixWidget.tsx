"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const data = [
  { source: "Hospital",     current: 18, prev: 16, color: "#6366f1" },
  { source: "SNF",          current: 12, prev: 14, color: "#14b8a6" },
  { source: "Nursing Home", current:  7, prev:  6, color: "#f59e0b" },
  { source: "Community",    current:  5, prev:  5, color: "#22c55e" },
]

const total = data.reduce((s, d) => s + d.current, 0)

export function AdmissionSourceMixWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Admission Source Mix</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">{total}</span>
            <span className="text-surface-400 text-sm mb-1">admissions / mo</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          +3 MoM
        </span>
      </div>

      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, name: string) => [v, name === "current" ? "This Month" : "Last Month"]}
            />
            <Bar dataKey="prev" fill="rgba(148,163,184,0.2)" radius={[4, 4, 0, 0]} name="prev" />
            <Bar dataKey="current" radius={[4, 4, 0, 0]} name="current">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((d) => {
          const pct = Math.round((d.current / total) * 100)
          const mom = d.current - d.prev
          return (
            <div key={d.source} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-xs text-surface-500 dark:text-surface-400 w-24">{d.source}</span>
              <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
              </div>
              <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 w-8 text-right">{pct}%</span>
              <span className={`text-xs font-medium w-8 text-right ${mom > 0 ? "text-emerald-500" : mom < 0 ? "text-rose-500" : "text-surface-400"}`}>
                {mom > 0 ? `+${mom}` : mom}
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-indigo-500/10 rounded-xl p-2 text-center border border-indigo-500/20">
          <p className="text-xs text-surface-400">Hospital Referral</p>
          <p className="text-sm font-bold text-indigo-400">43%</p>
          <p className="text-xs text-emerald-400">↑ +2% MoM</p>
        </div>
        <div className="bg-teal-500/10 rounded-xl p-2 text-center border border-teal-500/20">
          <p className="text-xs text-surface-400">SNF Referral</p>
          <p className="text-sm font-bold text-teal-400">29%</p>
          <p className="text-xs text-rose-400">↓ -5% MoM</p>
        </div>
      </div>
    </Card>
  )
}
