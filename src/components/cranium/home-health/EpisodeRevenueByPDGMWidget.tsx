"use client"
import { Card } from "@/components/ui/card"

const groups = [
  { group: "MS HHRG",      revenue: 2840, margin: 650 },
  { group: "Neuro/Stroke", revenue: 3120, margin: 640 },
  { group: "Wounds",       revenue: 2650, margin: 580 },
  { group: "Behavioral",   revenue: 2420, margin: 470 },
  { group: "Complex Med",  revenue: 3580, margin: 720 },
]

export function EpisodeRevenueByPDGMWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Episode Revenue — PDGM</p>
          <p className="text-2xl font-bold text-surface-900 mt-0.5">$14,610 avg</p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">23.4% margin</span>
      </div>
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.group} className="flex items-center justify-between text-sm">
            <span className="text-surface-600 w-28 truncate">{g.group}</span>
            <div className="flex-1 mx-3 bg-surface-100 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: String(Math.round((g.revenue/3580)*100)) + "%"}} />
            </div>
            <span className="font-semibold text-surface-800 w-14 text-right">${g.revenue.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}