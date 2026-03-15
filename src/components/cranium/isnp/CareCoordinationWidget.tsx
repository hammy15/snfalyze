"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

const TOTAL_MEMBERS   = 160
const AVG_TOUCHPOINTS = 4.2   // monthly per member
const MIN_REQUIRED    = 3.0
const AT_RISK_COUNT   = 18    // members below minimum

// Distribution: how many members at each touchpoint level
const distribution = [
  { band: "0-1", count: 5,  risk: "critical" },
  { band: "2",   count: 8,  risk: "warning"  },
  { band: "3",   count: 5,  risk: "warning"  },
  { band: "4",   count: 42, risk: "ok"       },
  { band: "5",   count: 55, risk: "ok"       },
  { band: "6+",  count: 45, risk: "good"     },
]

const colors: Record<string, string> = {
  critical: "#f43f5e",
  warning:  "#f59e0b",
  ok:       "#10b981",
  good:     "#14b8a6",
}

const topMembers = [
  { name: "Resident #A42", facility: "Sunrise SNF",  touchpoints: 1, risk: "High"   },
  { name: "Resident #B17", facility: "Valley Care",  touchpoints: 1, risk: "High"   },
  { name: "Resident #C88", facility: "Harbor View",  touchpoints: 2, risk: "Moderate" },
  { name: "Resident #D31", facility: "Meadow Ridge", touchpoints: 2, risk: "Moderate" },
]

export function CareCoordinationWidget() {
  const pctAtRisk = Math.round((AT_RISK_COUNT / TOTAL_MEMBERS) * 100)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Care Coordination Touchpoints</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-emerald-500">{AVG_TOUCHPOINTS}</span>
            <span className="text-surface-400 text-sm mb-1.5">avg/member/mo</span>
          </div>
          <p className="text-xs text-surface-400">
            Minimum required: <span className="text-amber-400 font-medium">{MIN_REQUIRED}</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${AT_RISK_COUNT <= 10 ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-rose-500 bg-rose-500/10 border-rose-500/30"} border`}>
          {AT_RISK_COUNT} below min
        </span>
      </div>

      {/* Distribution */}
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="band" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v} members`]}
            />
            <ReferenceLine x="3" stroke="#f59e0b" strokeDasharray="4 2" />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distribution.map((entry, i) => (
                <Cell key={i} fill={colors[entry.risk]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* At-risk banner */}
      <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-rose-400">Members Below Minimum ({AT_RISK_COUNT})</p>
          <span className="text-xs text-rose-400">{pctAtRisk}% of total</span>
        </div>
        <div className="space-y-1">
          {topMembers.slice(0, 3).map((m) => (
            <div key={m.name} className="flex items-center justify-between text-xs">
              <span className="text-surface-400">{m.name} · {m.facility}</span>
              <span className={`font-medium ${m.touchpoints <= 1 ? "text-rose-400" : "text-amber-400"}`}>
                {m.touchpoints} touch
              </span>
            </div>
          ))}
          {AT_RISK_COUNT > 3 && (
            <p className="text-xs text-surface-400">+{AT_RISK_COUNT - 3} more members</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-500/10 rounded-xl p-2 text-center border border-emerald-500/20">
          <p className="text-xs text-surface-400">Adequate (≥3)</p>
          <p className="text-sm font-bold text-emerald-400">{TOTAL_MEMBERS - AT_RISK_COUNT}</p>
        </div>
        <div className="bg-rose-500/10 rounded-xl p-2 text-center border border-rose-500/20">
          <p className="text-xs text-surface-400">Below Min</p>
          <p className="text-sm font-bold text-rose-400">{AT_RISK_COUNT}</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-xs text-surface-400">Total</p>
          <p className="text-sm font-bold text-surface-700 dark:text-surface-200">{TOTAL_MEMBERS}</p>
        </div>
      </div>
    </Card>
  )
}
