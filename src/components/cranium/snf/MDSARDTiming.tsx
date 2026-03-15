"use client"

import { Card } from "@/components/ui/card"
import type { MDSARDTimingData } from "../snf-alf-data"

interface Props { data: MDSARDTimingData }

const STATUS_CONFIG = {
  overdue: { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Overdue" },
  due_soon: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Due Soon" },
  on_track: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "On Track" },
}

export function MDSARDTiming({ data }: Props) {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">MDS / ARD Timing</p>
        <p className="text-xs text-surface-400 mt-0.5">Assessments due next 30 days</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-rose-500">{data.overdue}</p>
          <p className="text-[10px] text-rose-500/80 font-medium mt-0.5">Overdue</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{data.dueSoon}</p>
          <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">Due Soon</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">{data.onTrack}</p>
          <p className="text-[10px] text-emerald-500/80 font-medium mt-0.5">On Track</p>
        </div>
      </div>

      {data.overdue > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <span className="text-rose-500 text-sm">⚠</span>
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {data.overdue} ARD{data.overdue > 1 ? "s" : ""} past deadline — risk of F-tag 641
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Upcoming</p>
        {data.assessments.slice(0, 5).map((a) => {
          const s = STATUS_CONFIG[a.status]
          return (
            <div key={a.residentId} className="flex items-center gap-3 py-1.5 border-b border-surface-100 dark:border-surface-800 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">{a.residentName}</p>
                <p className="text-[10px] text-surface-400">{a.assessmentType} — due {a.dueDate}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.color} ${s.bg} ${s.border} flex-shrink-0`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
