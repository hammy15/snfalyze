"use client"

import { Card } from "@/components/ui/card"
import type { SurveyReadinessData } from "../snf-alf-data"

interface Props { data: SurveyReadinessData }

const SEVERITY_CONFIG = {
  high: { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-500" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500" },
  low: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500" },
}

function scoreColor(score: number) {
  if (score >= 80) return { stroke: "#10b981", text: "text-emerald-500", label: "Survey Ready" }
  if (score >= 60) return { stroke: "#f59e0b", text: "text-amber-500", label: "Needs Attention" }
  return { stroke: "#f43f5e", text: "text-rose-500", label: "High Risk" }
}

function ScoreGauge({ score }: { score: number }) {
  const c = scoreColor(score)
  const r = 42
  const circumference = Math.PI * r
  const arc = (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width={110} height={66} viewBox="0 0 110 66">
        <path d="M 10 60 A 45 45 0 0 1 100 60" fill="none" stroke="currentColor" strokeWidth={10} className="text-surface-100 dark:text-surface-800" strokeLinecap="round" />
        <path
          d="M 10 60 A 45 45 0 0 1 100 60"
          fill="none"
          stroke={c.stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute bottom-0 text-center pb-0.5">
        <p className={`text-2xl font-bold ${c.text}`}>{score}</p>
        <p className="text-[9px] text-surface-400 uppercase tracking-wider">/100</p>
      </div>
    </div>
  )
}

export function SurveyReadiness({ data }: Props) {
  const c = scoreColor(data.score)
  const daysColor = data.daysSinceLast > 365 ? "text-rose-500" : data.daysSinceLast > 270 ? "text-amber-500" : "text-emerald-500"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Survey Readiness</p>
          <p className={`text-sm font-semibold mt-1 ${c.text}`}>{c.label}</p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold ${daysColor}`}>{data.daysSinceLast}d</span>
          <p className="text-[10px] text-surface-400">since last survey</p>
        </div>
      </div>

      <div className="flex justify-center">
        <ScoreGauge score={data.score} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Top Risks</p>
        {data.risks.map((risk, i) => {
          const s = SEVERITY_CONFIG[risk.severity]
          return (
            <div key={i} className={`rounded-xl p-3 border ${s.bg} ${s.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className={`text-xs font-semibold ${s.color}`}>{risk.area}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${s.color} ${s.bg} ${s.border}`}>
                  {risk.severity}
                </span>
              </div>
              <p className="text-[10px] text-surface-500 dark:text-surface-400 leading-relaxed">{risk.detail}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
