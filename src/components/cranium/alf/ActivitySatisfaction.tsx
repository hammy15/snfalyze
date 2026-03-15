"use client"

import { Card } from "@/components/ui/card"
import type { ActivitySatisfactionData } from "../snf-alf-data"

interface Props { data: ActivitySatisfactionData }

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-7 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export function ActivitySatisfaction({ data }: Props) {
  const overallColor = data.overallScore >= 85 ? "text-emerald-500" : data.overallScore >= 75 ? "text-amber-500" : "text-rose-500"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Activity Satisfaction</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${overallColor}`}>{data.overallScore}</span>
            <span className="text-surface-400 text-sm mb-1.5">/ 100 overall</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Top Activities</p>
          </div>
          <div className="space-y-2">
            {data.top3.map((a) => (
              <div key={a.name} className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-200">{a.name}</span>
                  <span className="text-[10px] text-surface-400">{a.participationRate}% participation</span>
                </div>
                <ScoreBar score={a.satisfactionScore} color="#10b981" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Needs Improvement</p>
          </div>
          <div className="space-y-2">
            {data.bottom3.map((a) => (
              <div key={a.name} className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-200">{a.name}</span>
                  <span className="text-[10px] text-surface-400">{a.participationRate}% participation</span>
                </div>
                <ScoreBar score={a.satisfactionScore} color="#f43f5e" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
