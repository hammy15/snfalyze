"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"

const facilities = [
  { name: "Sunrise SNF",    enrolled: 68, capacity: 85, pipeline: 8,  color: "#14b8a6" },
  { name: "Valley Care",    enrolled: 42, capacity: 60, pipeline: 5,  color: "#6366f1" },
  { name: "Meadow Ridge",   enrolled: 31, capacity: 50, pipeline: 12, color: "#f59e0b" },
  { name: "Harbor View",    enrolled: 19, capacity: 40, pipeline: 15, color: "#f43f5e" },
]

const TOTAL_ENROLLED  = facilities.reduce((s, f) => s + f.enrolled, 0)
const TOTAL_CAPACITY  = facilities.reduce((s, f) => s + f.capacity, 0)
const TOTAL_PIPELINE  = facilities.reduce((s, f) => s + f.pipeline, 0)
const FILL_RATE       = Math.round((TOTAL_ENROLLED / TOTAL_CAPACITY) * 100)

function getCapacityColor(enrolled: number, capacity: number) {
  const pct = (enrolled / capacity) * 100
  if (pct >= 85) return "#10b981"
  if (pct >= 65) return "#f59e0b"
  return "#f43f5e"
}

export function EnrolledMemberCountWidget() {
  const chartData = facilities.map(f => ({
    ...f,
    utilColor: getCapacityColor(f.enrolled, f.capacity),
  }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Enrolled Member Count</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-teal-500">{TOTAL_ENROLLED}</span>
            <span className="text-surface-400 text-sm mb-1.5">enrolled</span>
          </div>
          <p className="text-xs text-surface-400">
            {FILL_RATE}% capacity fill · <span className="text-amber-400 font-medium">{TOTAL_PIPELINE} in pipeline</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${FILL_RATE >= 80 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-amber-500 bg-amber-500/10 border-amber-500/30"} border`}>
          {FILL_RATE}% fill rate
        </span>
      </div>

      {/* By-facility chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, n: string) => [v, n === "enrolled" ? "Enrolled" : "Capacity"]}
            />
            <Bar dataKey="capacity" fill="rgba(148,163,184,0.2)" radius={[4, 4, 0, 0]} name="capacity" />
            <Bar dataKey="enrolled" radius={[4, 4, 0, 0]} name="enrolled">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.utilColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Facility table */}
      <div className="space-y-2">
        {facilities.map((f) => {
          const fillPct = Math.round((f.enrolled / f.capacity) * 100)
          const capColor = getCapacityColor(f.enrolled, f.capacity)
          return (
            <div key={f.name} className="flex items-center gap-3">
              <span className="text-xs text-surface-500 flex-1 truncate">{f.name}</span>
              <div className="w-16 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: capColor }} />
              </div>
              <span className="text-xs font-semibold w-12 text-right" style={{ color: capColor }}>
                {f.enrolled}/{f.capacity}
              </span>
              {f.pipeline > 0 && (
                <span className="text-xs text-amber-400 w-10 text-right">+{f.pipeline}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-teal-500/10 rounded-xl p-2.5 text-center border border-teal-500/20">
          <p className="text-xs text-surface-400">Total Capacity</p>
          <p className="text-sm font-bold text-teal-400">{TOTAL_CAPACITY}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-2.5 text-center border border-amber-500/20">
          <p className="text-xs text-surface-400">Pipeline</p>
          <p className="text-sm font-bold text-amber-400">+{TOTAL_PIPELINE}</p>
        </div>
      </div>
    </Card>
  )
}
