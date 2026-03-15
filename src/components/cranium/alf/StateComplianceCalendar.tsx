"use client"

import { Card } from "@/components/ui/card"
import type { StateComplianceData } from "../snf-alf-data"

interface Props { data: StateComplianceData }

const STATUS_CONFIG = {
  overdue: { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: "🔴", label: "OVERDUE" },
  due_soon: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "🟡", label: "DUE SOON" },
  upcoming: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "🟢", label: "UPCOMING" },
}

export function StateComplianceCalendar({ data }: Props) {
  const next = data.nextDeadline
  const nextS = STATUS_CONFIG[next.status]

  const overdueCount = [next, ...data.upcoming].filter(i => i.status === "overdue").length
  const dueSoonCount = [next, ...data.upcoming].filter(i => i.status === "due_soon").length

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">State Compliance Calendar</p>
          <p className="text-xs text-surface-400 mt-0.5">{data.state} regulatory deadlines</p>
        </div>
        <div className="flex gap-1">
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500">
              {overdueCount} Overdue
            </span>
          )}
          {dueSoonCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500">
              {dueSoonCount} Due Soon
            </span>
          )}
        </div>
      </div>

      {/* Next deadline — prominent */}
      <div className={`rounded-2xl p-4 border-2 ${nextS.bg} ${nextS.border}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{nextS.icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${nextS.color}`}>{nextS.label} · Next Deadline</span>
        </div>
        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 leading-snug mb-2">{next.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-500">{next.deadline}</span>
          <div className="text-right">
            <span className={`text-2xl font-bold ${nextS.color}`}>
              {next.daysUntil < 0 ? `${Math.abs(next.daysUntil)}d ago` : `${next.daysUntil}d`}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Upcoming</p>
        {data.upcoming.map((item, i) => {
          const s = STATUS_CONFIG[item.status]
          return (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${s.bg} ${s.border}`}>
              <span className="text-sm">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-200 truncate">{item.description}</p>
                <p className="text-[10px] text-surface-400">{item.deadline}</p>
              </div>
              <span className={`text-xs font-bold ${s.color} flex-shrink-0`}>
                {item.daysUntil < 0 ? `${Math.abs(item.daysUntil)}d ago` : `${item.daysUntil}d`}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
