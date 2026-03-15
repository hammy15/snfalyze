"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

const READMIT_RATE    = 14.2   // %
const BENCHMARK_RATE  = 11.0   // industry benchmark
const EPISODES_TOTAL  = 148
const READMITS        = Math.round((READMIT_RATE / 100) * EPISODES_TOTAL)
const REVENUE_PER_READMIT_IMPACT = -485  // avg revenue lost per readmission

const byDiagnosis = [
  { dx: "CHF",     rate: 22.1, benchmark: 16.0, episodes: 28, color: "#f43f5e" },
  { dx: "COPD",    rate: 18.4, benchmark: 14.0, episodes: 21, color: "#f59e0b" },
  { dx: "Wound",   rate: 11.2, benchmark: 12.0, episodes: 35, color: "#10b981" },
  { dx: "Ortho",   rate:  8.7, benchmark: 10.0, episodes: 42, color: "#10b981" },
  { dx: "Neuro",   rate: 15.3, benchmark: 13.0, episodes: 22, color: "#f59e0b" },
]

function getStatus(rate: number, benchmark: number) {
  if (rate <= benchmark * 0.9) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Below Benchmark" }
  if (rate <= benchmark * 1.1) return { text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "At Benchmark" }
  return                        { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "Above Benchmark" }
}

export function ReadmissionRateWidget() {
  const st = getStatus(READMIT_RATE, BENCHMARK_RATE)
  const totalImpact = READMITS * Math.abs(REVENUE_PER_READMIT_IMPACT)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">30-Day Readmission Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.text}`}>{READMIT_RATE}%</span>
            <span className="text-surface-400 text-sm mb-1.5">readmit rate</span>
          </div>
          <p className="text-xs text-surface-400">
            Benchmark: <span className="text-amber-400">{BENCHMARK_RATE}%</span>
            {" · "}Gap: <span className="text-rose-400">+{(READMIT_RATE - BENCHMARK_RATE).toFixed(1)}%</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.text} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* By-diagnosis chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byDiagnosis} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="dx" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[0, 28]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, n: string) => [`${v}%`, n === "rate" ? "Readmit Rate" : "Benchmark"]}
            />
            <ReferenceLine y={BENCHMARK_RATE} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1} />
            <Bar dataKey="benchmark" fill="rgba(148,163,184,0.2)" radius={[2, 2, 0, 0]} name="benchmark" />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="rate">
              {byDiagnosis.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue impact */}
      <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
        <div className="flex justify-between text-xs">
          <span className="text-rose-400 font-semibold">Revenue Impact (Readmissions)</span>
          <span className="text-rose-400 font-bold">-${totalImpact.toLocaleString()}/mo</span>
        </div>
        <p className="text-xs text-surface-400 mt-0.5">
          {READMITS} readmissions × ${Math.abs(REVENUE_PER_READMIT_IMPACT)}/event avg
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {byDiagnosis.slice(0, 3).map(d => (
          <div key={d.dx} className={`rounded-xl p-2 text-center ${d.rate > d.benchmark ? "bg-rose-500/10 border border-rose-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
            <p className="text-xs text-surface-400">{d.dx}</p>
            <p className={`text-sm font-bold ${d.rate > d.benchmark ? "text-rose-400" : "text-emerald-400"}`}>{d.rate}%</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
