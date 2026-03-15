"use client"

import { Card } from "@/components/ui/card"

const roles = [
  { role: "RN",           avgTenure: 28, turnoverRate: 18, vacancy: 1, total: 8,  color: "#6366f1" },
  { role: "CNA",          avgTenure: 14, turnoverRate: 32, vacancy: 2, total: 14, color: "#f59e0b" },
  { role: "Chaplain",     avgTenure: 42, turnoverRate:  8, vacancy: 0, total: 3,  color: "#10b981" },
  { role: "Social Worker",avgTenure: 22, turnoverRate: 15, vacancy: 1, total: 5,  color: "#14b8a6" },
]

function getRiskColor(turnover: number) {
  if (turnover >= 30) return { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High Risk" }
  if (turnover >= 20) return { text: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  label: "Moderate" }
  return               { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Low Risk" }
}

const MAX_TENURE = 48

export function StaffTenureWidget() {
  const avgAll = Math.round(roles.reduce((s, r) => s + r.avgTenure, 0) / roles.length)
  const totalVacancies = roles.reduce((s, r) => s + r.vacancy, 0)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Staff Tenure by Role</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 dark:text-surface-50">{avgAll}</span>
            <span className="text-surface-400 text-sm mb-1.5">mo avg tenure</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${totalVacancies > 2 ? "text-rose-500 bg-rose-500/10 border-rose-500/30" : "text-amber-500 bg-amber-500/10 border-amber-500/30"} border`}>
          {totalVacancies} vacancies
        </span>
      </div>

      {/* Role rows */}
      <div className="space-y-3">
        {roles.map((r) => {
          const risk = getRiskColor(r.turnoverRate)
          return (
            <div key={r.role} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-200">{r.role}</span>
                  {r.vacancy > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                      {r.vacancy} open
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-surface-400">{r.avgTenure} mo</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${risk.text} ${risk.bg} border ${risk.border}`}>
                    {r.turnoverRate}% turnover
                  </span>
                </div>
              </div>
              {/* Tenure bar */}
              <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.avgTenure / MAX_TENURE) * 100}%`, background: r.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 border-t border-surface-100 dark:border-surface-700 pt-3">
        <div className="text-center">
          <p className="text-xs text-surface-400">Total Staff</p>
          <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
            {roles.reduce((s, r) => s + r.total, 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-surface-400">Avg Turnover</p>
          <p className="text-sm font-bold text-amber-400">
            {Math.round(roles.reduce((s, r) => s + r.turnoverRate, 0) / roles.length)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-surface-400">Vacancies</p>
          <p className="text-sm font-bold text-rose-400">{totalVacancies}</p>
        </div>
      </div>
    </Card>
  )
}
