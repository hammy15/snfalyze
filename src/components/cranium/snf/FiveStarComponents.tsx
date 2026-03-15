"use client"

import { Card } from "@/components/ui/card"
import type { FiveStarData } from "../snf-alf-data"

interface Props { data: FiveStarData }

function starColor(stars: number) {
  if (stars >= 4) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" }
  if (stars === 3) return { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" }
  return { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30" }
}

function TrendArrow({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <span className="text-emerald-500 text-xs">↑</span>
  if (trend === "down") return <span className="text-rose-500 text-xs">↓</span>
  return <span className="text-surface-400 text-xs">→</span>
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < stars ? "text-amber-400" : "text-surface-200 dark:text-surface-700"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

const CATEGORIES = [
  { key: "staffing" as const, label: "Staffing" },
  { key: "quality" as const, label: "Quality Measures" },
  { key: "survey" as const, label: "Health Inspection" },
  { key: "overall" as const, label: "Overall" },
]

export function FiveStarComponents({ data }: Props) {
  const overallC = starColor(data.overall.stars)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">CMS Five-Star</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-4xl font-bold ${overallC.text}`}>{data.overall.stars}</span>
            <div className="flex flex-col gap-0.5">
              <StarRow stars={data.overall.stars} />
              <span className="text-xs text-surface-400">Overall Rating</span>
            </div>
          </div>
        </div>
        <TrendArrow trend={data.overall.trend} />
      </div>

      <div className="space-y-3">
        {CATEGORIES.map(({ key, label }) => {
          const rating = data[key]
          const c = starColor(rating.stars)
          return (
            <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
              <div className="flex-1">
                <p className="text-xs font-medium text-surface-600 dark:text-surface-300">{label}</p>
                <StarRow stars={rating.stars} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xl font-bold ${c.text}`}>{rating.stars}</span>
                <TrendArrow trend={rating.trend} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 text-[10px] pt-1 border-t border-surface-200 dark:border-surface-700">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 4–5 stars</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 3 stars</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 1–2 stars</span>
      </div>
    </Card>
  )
}
