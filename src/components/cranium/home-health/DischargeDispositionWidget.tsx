"use client"
import React from "react"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts"

const dispositions = [
  { label: "Home Independent", key: "home",    color: "#10b981" },
  { label: "Home w/ Family",   key: "family",  color: "#14b8a6" },
  { label: "ALF",              key: "alf",     color: "#6366f1" },
  { label: "SNF",              key: "snf",     color: "#f59e0b" },
  { label: "Hospital",         key: "hosp",    color: "#f43f5e" },
  { label: "Expired",          key: "expired", color: "#64748b" },
]

const trendData = [
  { month: "Oct", home: 55, family: 18, alf: 8, snf: 9, hosp: 7, expired: 3 },
  { month: "Nov", home: 52, family: 20, alf: 9, snf: 8, hosp: 8, expired: 3 },
  { month: "Dec", home: 50, family: 22, alf: 8, snf: 10, hosp: 7, expired: 3 },
  { month: "Jan", home: 54, family: 19, alf: 7, snf: 9, hosp: 8, expired: 3 },
  { month: "Feb", home: 53, family: 21, alf: 9, snf: 8, hosp: 6, expired: 3 },
  { month: "Mar", home: 56, family: 20, alf: 8, snf: 8, hosp: 5, expired: 3 },
]

const latestMonth = trendData[trendData.length - 1]
const totalLatest = Object.values(latestMonth).filter(v => typeof v === "number").reduce((a, b) => (a as number) + (b as number), 0) as number

export function DischargeDispositionWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Discharge Disposition</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-emerald-500">
              {Math.round(((latestMonth.home + latestMonth.family) / totalLatest) * 100)}%
            </span>
            <span className="text-surface-400 text-sm mb-1.5">to home</span>
          </div>
          <p className="text-xs text-surface-400">
            Hospital rate: <span className="text-rose-400 font-medium">{Math.round((latestMonth.hosp / totalLatest) * 100)}%</span>
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          ↑ Home Rate
        </span>
      </div>

      {/* Stacked bar trend */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
            />
            {dispositions.map(d => (
              <Bar key={d.key} dataKey={d.key} stackId="a" fill={d.color} name={d.label} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current month breakdown */}
      <div className="space-y-2">
        {dispositions.map((d) => {
          const val = latestMonth[d.key as keyof typeof latestMonth] as number
          const pct = Math.round((val / totalLatest) * 100)
          return (
            <div key={d.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-xs text-surface-500 flex-1">{d.label}</span>
              <div className="w-20 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
              </div>
              <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
