"use client"

import { Card } from "@/components/ui/card"

const disciplines = [
  { code: "SN",  name: "Skilled Nursing",   agencyCost: 148, directCost: 92,  trend: +3  },
  { code: "PT",  name: "Physical Therapy",  agencyCost: 165, directCost: 102, trend: -2  },
  { code: "OT",  name: "Occup. Therapy",    agencyCost: 158, directCost: 97,  trend: +1  },
  { code: "SLP", name: "Speech Therapy",    agencyCost: 172, directCost: 108, trend: 0   },
  { code: "HHA", name: "Home Health Aide",  agencyCost:  62, directCost:  38, trend: +4  },
  { code: "MSW", name: "Medical Social Wk", agencyCost: 135, directCost:  82, trend: -1  },
]

function getTrendColor(trend: number) {
  if (trend > 3)  return "text-rose-500"
  if (trend > 0)  return "text-amber-500"
  if (trend < 0)  return "text-emerald-500"
  return           "text-surface-400"
}

const MAX_COST = 200

export function CostPerVisitWidget() {
  const avgAgency = Math.round(disciplines.reduce((s, d) => s + d.agencyCost, 0) / disciplines.length)
  const avgDirect = Math.round(disciplines.reduce((s, d) => s + d.directCost, 0) / disciplines.length)
  const spread = avgAgency - avgDirect

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Cost per Visit — Discipline</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 dark:text-surface-50">${avgAgency}</span>
            <span className="text-surface-400 text-sm mb-1.5">avg agency</span>
          </div>
          <p className="text-xs text-surface-400">
            Avg Direct: <span className="text-emerald-400 font-medium">${avgDirect}</span>
            {" · "}Spread: <span className="text-amber-400 font-medium">${spread}/visit</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-surface-400">vs Direct</p>
          <p className="text-sm font-bold text-amber-400">+{Math.round((spread / avgDirect) * 100)}%</p>
        </div>
      </div>

      {/* Discipline table */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-[40px_1fr_60px_60px_32px] text-xs font-medium text-surface-400 uppercase tracking-wider pb-1.5 border-b border-surface-100 dark:border-surface-700">
          <span>Code</span>
          <span>Discipline</span>
          <span className="text-right">Agency</span>
          <span className="text-right">Direct</span>
          <span className="text-right">MoM</span>
        </div>

        {disciplines.map((d) => {
          const trendColor = getTrendColor(d.trend)
          const spreadPct = Math.round(((d.agencyCost - d.directCost) / d.directCost) * 100)
          return (
            <div key={d.code} className="space-y-1">
              <div className="grid grid-cols-[40px_1fr_60px_60px_32px] text-xs items-center">
                <span className="font-bold text-teal-500 font-mono">{d.code}</span>
                <span className="text-surface-500 dark:text-surface-400 truncate">{d.name}</span>
                <span className="text-right font-semibold text-surface-700 dark:text-surface-200">${d.agencyCost}</span>
                <span className="text-right text-emerald-400 font-medium">${d.directCost}</span>
                <span className={`text-right font-medium ${trendColor}`}>
                  {d.trend > 0 ? `+${d.trend}%` : d.trend < 0 ? `${d.trend}%` : "—"}
                </span>
              </div>
              {/* Dual bar */}
              <div className="grid grid-cols-2 gap-0.5 pl-10 pr-8">
                <div className="h-1 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500/70 rounded-full" style={{ width: `${(d.agencyCost / MAX_COST) * 100}%` }} />
                </div>
                <div className="h-1 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${(d.directCost / MAX_COST) * 100}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 text-xs text-surface-400 pt-1 border-t border-surface-100 dark:border-surface-700">
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-teal-500/70" /><span>Agency</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded-full bg-emerald-500/70" /><span>Direct</span></div>
      </div>
    </Card>
  )
}
