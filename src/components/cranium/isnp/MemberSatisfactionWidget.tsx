"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts"

const domains = [
  { domain: "Care Coordination",   isnp: 88, ffs: 78, benchmark: 80 },
  { domain: "MD Access",           isnp: 82, ffs: 71, benchmark: 75 },
  { domain: "Care Transitions",    isnp: 79, ffs: 68, benchmark: 72 },
  { domain: "Chronic Condition Mgmt", isnp: 85, ffs: 73, benchmark: 78 },
  { domain: "Overall Satisfaction",isnp: 84, ffs: 75, benchmark: 80 },
]

const OVERALL_ISNP = Math.round(domains.reduce((s, d) => s + d.isnp, 0) / domains.length)
const OVERALL_FFS  = Math.round(domains.reduce((s, d) => s + d.ffs,  0) / domains.length)
const ADVANTAGE    = OVERALL_ISNP - OVERALL_FFS

const retentionRisk = [
  { segment: "High (>85 score)",     count: 68, risk: "Low",   color: "#10b981" },
  { segment: "Moderate (75-85)",     count: 58, risk: "Medium", color: "#f59e0b" },
  { segment: "Low (<75 score)",      count: 34, risk: "High",   color: "#f43f5e" },
]

export function MemberSatisfactionWidget() {
  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Member Satisfaction</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-emerald-500">{OVERALL_ISNP}</span>
            <span className="text-surface-400 text-sm mb-1.5">ISNP avg</span>
          </div>
          <p className="text-xs text-surface-400">
            vs FFS Medicare: <span className="text-surface-600 dark:text-surface-300">{OVERALL_FFS}</span>
            {" · "}<span className="text-emerald-400 font-medium">+{ADVANTAGE} I-SNP advantage</span>
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
          All Domains Above FFS
        </span>
      </div>

      {/* Domain comparison chart */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={domains} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="domain" tick={{ fontSize: 7, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[60, 95]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number, n: string) => [v, n === "isnp" ? "I-SNP" : "FFS Medicare"]}
            />
            <Bar dataKey="ffs"  fill="rgba(148,163,184,0.3)" radius={[3, 3, 0, 0]} name="ffs" />
            <Bar dataKey="isnp" fill="#10b981"               radius={[3, 3, 0, 0]} name="isnp" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Domain bars */}
      <div className="space-y-2">
        {domains.map((d) => {
          const advantage = d.isnp - d.ffs
          return (
            <div key={d.domain} className="flex items-center gap-2">
              <span className="text-xs text-surface-500 dark:text-surface-400 w-36 truncate">{d.domain}</span>
              <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: `${d.isnp}%` }} />
              </div>
              <span className="text-xs font-bold text-emerald-400 w-6">{d.isnp}</span>
              <span className="text-xs text-emerald-500 w-8 text-right">+{advantage}</span>
            </div>
          )
        })}
      </div>

      {/* Retention risk */}
      <div>
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Retention Risk</p>
        <div className="grid grid-cols-3 gap-2">
          {retentionRisk.map((r) => (
            <div key={r.segment} className="rounded-xl p-2 text-center" style={{ background: `${r.color}15`, border: `1px solid ${r.color}30` }}>
              <p className="text-xs text-surface-400 truncate">{r.risk} Risk</p>
              <p className="text-sm font-bold" style={{ color: r.color }}>{r.count}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
