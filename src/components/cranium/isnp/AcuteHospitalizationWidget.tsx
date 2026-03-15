"use client"

import { Card } from "@/components/ui/card"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts"

const RATE_PER_1000   = 182    // per 1000 member months
const BENCHMARK       = 145    // I-SNP benchmark
const TOTAL_MEMBERS   = 160
const MEMBER_MONTHS   = 160    // current month

const trendData = [
  { month: "Oct", rate: 195 },
  { month: "Nov", rate: 188 },
  { month: "Dec", rate: 202 },
  { month: "Jan", rate: 178 },
  { month: "Feb", rate: 175 },
  { month: "Mar", rate: 182 },
]

const costDrivers = [
  { dx: "CHF Exacerbation",      pct: 28, cost: 18400 },
  { dx: "UTI / Sepsis",          pct: 22, cost: 14200 },
  { dx: "COPD Exacerbation",     pct: 18, cost: 11600 },
  { dx: "Fall / Fracture",       pct: 15, cost: 22800 },
  { dx: "Pneumonia",             pct: 10, cost: 12900 },
  { dx: "Other",                 pct:  7, cost:  9100 },
]

function getStatus(rate: number, benchmark: number) {
  if (rate <= benchmark)           return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Below Benchmark" }
  if (rate <= benchmark * 1.15)    return { text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Elevated" }
  return                            { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High — Act Now" }
}

export function AcuteHospitalizationWidget() {
  const st = getStatus(RATE_PER_1000, BENCHMARK)
  const gap = RATE_PER_1000 - BENCHMARK
  const estimated_admits = Math.round((RATE_PER_1000 / 1000) * MEMBER_MONTHS)
  const totalCost = costDrivers.reduce((s, d) => s + d.cost, 0)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Acute Hospitalization Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.text}`}>{RATE_PER_1000}</span>
            <span className="text-surface-400 text-sm mb-1.5">per 1,000 MM</span>
          </div>
          <p className="text-xs text-surface-400">
            Benchmark: <span className="text-amber-400 font-medium">{BENCHMARK}</span>
            {" · Gap: "}
            <span className="text-rose-400 font-medium">+{gap} / 1,000</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.text} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* Trend */}
      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[130, 215]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v} per 1,000 MM`, "Rate"]}
            />
            <ReferenceLine y={BENCHMARK} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1} label={{ value: "BM", position: "right", fontSize: 8, fill: "#10b981" }} />
            <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-xs text-surface-400">Est. Admits</p>
          <p className="text-sm font-bold text-amber-400">{estimated_admits}/mo</p>
        </div>
        <div className="bg-rose-500/10 rounded-xl p-2 text-center border border-rose-500/20">
          <p className="text-xs text-surface-400">Total Cost</p>
          <p className="text-sm font-bold text-rose-400">${(totalCost / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-xs text-surface-400">Trend</p>
          <p className="text-sm font-bold text-emerald-400">↓ Improving</p>
        </div>
      </div>

      {/* Cost drivers */}
      <div>
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Primary Cost Drivers</p>
        <div className="space-y-1.5">
          {costDrivers.slice(0, 4).map((d) => (
            <div key={d.dx} className="flex items-center gap-2">
              <span className="text-xs text-surface-500 flex-1">{d.dx}</span>
              <div className="w-16 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500/70 rounded-full" style={{ width: `${d.pct * 2}%` }} />
              </div>
              <span className="text-xs text-rose-400 font-medium w-16 text-right">${(d.cost / 1000).toFixed(1)}k</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
