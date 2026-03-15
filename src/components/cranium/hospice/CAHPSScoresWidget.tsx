"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

const scores = [
  { domain: "Communication",    score: 84.2, benchmark: 82.0 },
  { domain: "Symptom Mgmt",     score: 78.6, benchmark: 80.5 },
  { domain: "Spiritual Support",score: 76.1, benchmark: 75.3 },
  { domain: "Family Support",   score: 81.3, benchmark: 79.0 },
]

function getScoreColor(score: number, benchmark: number) {
  const diff = score - benchmark
  if (diff >= 1)    return "#10b981"
  if (diff >= -1)   return "#f59e0b"
  return                   "#f43f5e"
}


export function CAHPSScoresWidget() {
  const aboveBenchmark = scores.filter(s => s.score >= s.benchmark).length
  const overallAvg = scores.reduce((s, d) => s + d.score, 0) / scores.length

  const chartData = scores.map(s => ({
    ...s,
    shortName: s.domain.split(" ")[0],
    color: getScoreColor(s.score, s.benchmark),
  }))

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">CAHPS Scores</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 dark:text-surface-50">
              {overallAvg.toFixed(1)}
            </span>
            <span className="text-surface-400 text-sm mb-1.5">avg score</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          {aboveBenchmark}/4 above benchmark
        </span>
      </div>

      {/* Score bars */}
      <div className="space-y-3">
        {scores.map((s) => {
          const color = getScoreColor(s.score, s.benchmark)
          const diff = (s.score - s.benchmark).toFixed(1)
          const diffNum = parseFloat(diff)
          return (
            <div key={s.domain}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-500 dark:text-surface-400">{s.domain}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400">BM: {s.benchmark}</span>
                  <span className="text-xs font-bold" style={{ color }}>{s.score}</span>
                  <span className={`text-xs font-medium ${diffNum >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {diffNum >= 0 ? `+${diff}` : diff}
                  </span>
                </div>
              </div>
              <div className="relative h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${s.score}%`, background: color }}
                />
                {/* Benchmark marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-surface-400/60"
                  style={{ left: `${s.benchmark}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="shortName" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[70, 90]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
            />
            <ReferenceLine y={80} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: "Target 80", position: "right", fontSize: 8, fill: "#94a3b8" }} />
            <Bar dataKey="score" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
