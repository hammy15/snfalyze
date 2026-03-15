"use client"

import { Card } from "@/components/ui/card"
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts"

const metrics = [
  { label: "Family Followup",       value: 78, target: 85, unit: "%",  icon: "📞" },
  { label: "Volunteer Engagement",  value: 65, target: 75, unit: "%",  icon: "🤝" },
  { label: "Post-Loss Satisfaction",value: 84, target: 80, unit: "/100", icon: "⭐" },
]

const radarData = [
  { metric: "Followup", score: 78, target: 85 },
  { metric: "Volunteer", score: 65, target: 75 },
  { metric: "Satisfaction", score: 84, target: 80 },
  { metric: "Timeliness", score: 72, target: 80 },
  { metric: "Grief Support", score: 88, target: 85 },
]

function getStatus(value: number, target: number) {
  const ratio = value / target
  if (ratio >= 0.97) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
  if (ratio >= 0.88) return { text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20" }
  return               { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/20" }
}

export function BereavementQualityWidget() {
  const overallPct = Math.round(metrics.reduce((s, m) => s + (m.value / m.target) * 100, 0) / metrics.length)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Bereavement Quality</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-teal-500">{overallPct}%</span>
            <span className="text-surface-400 text-sm mb-1.5">vs target</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${overallPct >= 90 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-amber-500 bg-amber-500/10 border-amber-500/30"} border`}>
          {overallPct >= 90 ? "On Track" : "Needs Improvement"}
        </span>
      </div>

      {/* Radar Chart */}
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
            <PolarGrid stroke="rgba(148,163,184,0.15)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Radar name="Score"  dataKey="score"  stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.2} />
            <Radar name="Target" dataKey="target" stroke="#f59e0b" fill="none" strokeDasharray="4 2" />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 6, background: "#1e293b", border: "none", color: "#f1f5f9" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric rows */}
      <div className="space-y-2.5">
        {metrics.map((m) => {
          const st = getStatus(m.value, m.target)
          const pct = Math.min((m.value / m.target) * 100, 100)
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{m.icon}</span>
                  <span className="text-xs text-surface-500">{m.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-surface-400">Target: {m.target}{m.unit}</span>
                  <span className={`font-bold ${st.text}`}>{m.value}{m.unit}</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: m.value >= m.target ? "#10b981" : m.value / m.target >= 0.88 ? "#f59e0b" : "#f43f5e" }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
