"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

const referrals = [
  { source: "Regional Medical Center", pct: 38, count: 56, color: "#f59e0b" },
  { source: "Dr. Martinez Group",      pct: 22, count: 33, color: "#10b981" },
  { source: "Sunrise SNF",             pct: 18, count: 27, color: "#14b8a6" },
  { source: "Valley Orthopedics",      pct: 12, count: 18, color: "#6366f1" },
  { source: "Community Hospital",      pct:  7, count: 10, color: "#10b981" },
  { source: "Other",                   pct:  3, count:  5, color: "#64748b" },
]

const TOP_SOURCE_PCT = referrals[0].pct
const CONCENTRATION_THRESHOLD = 40

// HHI-like concentration: sum of squares
const hhi = referrals.reduce((s, r) => s + r.pct * r.pct, 0)

function getConcentrationRisk(pct: number) {
  if (pct >= 40) return { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "High Concentration" }
  if (pct >= 30) return { text: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  label: "Moderate Risk" }
  return          { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Diversified" }
}

export function ReferralConcentrationWidget() {
  const st = getConcentrationRisk(TOP_SOURCE_PCT)
  const totalReferrals = referrals.reduce((s, r) => s + r.count, 0)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Referral Concentration</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.text}`}>{TOP_SOURCE_PCT}%</span>
            <span className="text-surface-400 text-sm mb-1.5">top source</span>
          </div>
          <p className="text-xs text-surface-400">
            {totalReferrals} total referrals · HHI: <span className="font-medium text-surface-600 dark:text-surface-300">{Math.round(hhi)}</span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.text} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* Bar chart */}
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={referrals.slice(0, 5)}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[0, 50]} />
            <YAxis type="category" dataKey="source" tick={{ fontSize: 8, fill: "#94a3b8" }} width={80} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v}%`, "Share"]}
            />
            <ReferenceLine x={CONCENTRATION_THRESHOLD} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth={1} />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {referrals.slice(0, 5).map((entry, i) => (
                <Cell key={i} fill={entry.pct >= CONCENTRATION_THRESHOLD ? "#f43f5e" : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {TOP_SOURCE_PCT >= 30 && (
        <div className={`${st.bg} rounded-xl p-3 border ${st.border}`}>
          <p className={`text-xs font-semibold ${st.text}`}>
            {TOP_SOURCE_PCT >= 40
              ? `⚠ Concentration risk: ${referrals[0].source} at ${TOP_SOURCE_PCT}% — exceeds 40% threshold`
              : `⚡ Monitor: ${referrals[0].source} approaching 40% concentration`
            }
          </p>
        </div>
      )}

      {/* Source list */}
      <div className="space-y-1.5">
        {referrals.slice(0, 5).map((r) => (
          <div key={r.source} className="flex items-center justify-between text-xs">
            <span className="text-surface-500 dark:text-surface-400 truncate max-w-[160px]">{r.source}</span>
            <div className="flex items-center gap-2">
              <span className="text-surface-400">{r.count} refs</span>
              <span className={`font-semibold ${r.pct >= 40 ? "text-rose-400" : r.pct >= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                {r.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
