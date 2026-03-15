"use client"

import { Card } from "@/components/ui/card"

const plans = [
  {
    plan:    "Anthem ISNP",
    pmpm:    1248,
    benchmark: 1180,
    renewal: "2026-09-01",
    members: 68,
    status:  "active",
  },
  {
    plan:    "UnitedHealth SNP",
    pmpm:    1195,
    benchmark: 1180,
    renewal: "2026-12-31",
    members: 42,
    status:  "active",
  },
  {
    plan:    "Humana ISNP",
    pmpm:    1130,
    benchmark: 1180,
    renewal: "2026-04-01",
    members: 31,
    status:  "warning",
  },
  {
    plan:    "Aetna Better Health",
    pmpm:    1290,
    benchmark: 1180,
    renewal: "2027-01-01",
    members: 19,
    status:  "active",
  },
]

const today = new Date("2026-03-04")

function getDaysToRenewal(dateStr: string) {
  const d = new Date(dateStr)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getRenewalStatus(days: number) {
  if (days <= 90)  return { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "Renew Soon" }
  if (days <= 180) return { text: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  label: "Review" }
  return           { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Active" }
}

const TOTAL_MEMBERS = plans.reduce((s, p) => s + p.members, 0)
const WEIGHTED_PMPM = Math.round(
  plans.reduce((s, p) => s + p.pmpm * p.members, 0) / TOTAL_MEMBERS
)
const BENCHMARK = 1180

export function PMPMRateWidget() {
  const aboveBenchmark = plans.filter(p => p.pmpm >= p.benchmark).length

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">PMPM Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-teal-500">${WEIGHTED_PMPM.toLocaleString()}</span>
            <span className="text-surface-400 text-sm mb-1.5">weighted avg</span>
          </div>
          <p className="text-xs text-surface-400">
            Benchmark: <span className="font-medium text-surface-600 dark:text-surface-300">${BENCHMARK}</span>
            {" · "}
            <span className={WEIGHTED_PMPM >= BENCHMARK ? "text-emerald-400" : "text-rose-400"}>
              {WEIGHTED_PMPM >= BENCHMARK ? `+$${WEIGHTED_PMPM - BENCHMARK} above` : `-$${BENCHMARK - WEIGHTED_PMPM} below`}
            </span>
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${aboveBenchmark >= 3 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-amber-500 bg-amber-500/10 border-amber-500/30"} border`}>
          {aboveBenchmark}/4 plans above BM
        </span>
      </div>

      {/* Plan table */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-[1fr_60px_55px_70px] text-xs font-medium text-surface-400 uppercase tracking-wider pb-1.5 border-b border-surface-100 dark:border-surface-700">
          <span>Plan</span>
          <span className="text-right">PMPM</span>
          <span className="text-right">vs BM</span>
          <span className="text-right">Renewal</span>
        </div>

        {plans.map((p) => {
          const days = getDaysToRenewal(p.renewal)
          const st = getRenewalStatus(days)
          const diff = p.pmpm - p.benchmark
          const renewalDate = new Date(p.renewal)
          return (
            <div key={p.plan} className="grid grid-cols-[1fr_60px_55px_70px] text-xs items-center gap-1">
              <div>
                <p className="text-surface-700 dark:text-surface-200 font-medium truncate">{p.plan}</p>
                <p className="text-surface-400">{p.members} members</p>
              </div>
              <span className={`text-right font-bold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ${p.pmpm.toLocaleString()}
              </span>
              <span className={`text-right font-medium ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {diff >= 0 ? `+$${diff}` : `-$${Math.abs(diff)}`}
              </span>
              <div className="text-right">
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${st.text} ${st.bg} border ${st.border}`}>
                  {days}d
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upcoming renewals */}
      {plans.filter(p => getDaysToRenewal(p.renewal) <= 180).map(p => {
        const days = getDaysToRenewal(p.renewal)
        const st = getRenewalStatus(days)
        return (
          <div key={p.plan} className={`${st.bg} rounded-xl p-2.5 border ${st.border}`}>
            <p className={`text-xs font-semibold ${st.text}`}>
              {days <= 90 ? "⚠" : "📅"} {p.plan} renews in {days} days — {p.members} members at risk
            </p>
          </div>
        )
      })}
    </Card>
  )
}
