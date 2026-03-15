"use client"

import { Card } from "@/components/ui/card"

const today = new Date("2026-03-04")

const contracts = [
  {
    plan:     "Anthem ISNP",
    expiry:   "2026-09-01",
    members:  68,
    pmpm:     1248,
    terms:    "Risk-sharing at 85% MLR floor",
    autoRenew: true,
    status:   "active",
  },
  {
    plan:     "UnitedHealth SNP",
    expiry:   "2026-12-31",
    members:  42,
    pmpm:     1195,
    terms:    "Capitated — full risk transfer",
    autoRenew: false,
    status:   "active",
  },
  {
    plan:     "Humana ISNP",
    expiry:   "2026-04-01",
    members:  31,
    pmpm:     1130,
    terms:    "Below-benchmark rate — renegotiate",
    autoRenew: false,
    status:   "warning",
  },
  {
    plan:     "Aetna Better Health",
    expiry:   "2027-01-01",
    members:  19,
    pmpm:     1290,
    terms:    "Performance bonus at 90% quality score",
    autoRenew: true,
    status:   "active",
  },
]

function getDaysToExpiry(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getExpiryAlert(days: number) {
  if (days <= 30)  return { text: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   icon: "🚨", label: "Critical" }
  if (days <= 90)  return { text: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   icon: "⚠️", label: "Alert" }
  if (days <= 180) return { text: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: "📅", label: "Review" }
  return           { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "✓",  label: "Active" }
}

export function PlanContractTermsWidget() {
  const alertContracts = contracts.filter(c => getDaysToExpiry(c.expiry) <= 180)

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Plan Contract Terms</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold text-surface-900 dark:text-surface-50">
              {contracts.length}
            </span>
            <span className="text-surface-400 text-sm mb-1.5">active plans</span>
          </div>
        </div>
        {alertContracts.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/30">
            {alertContracts.length} expiring soon
          </span>
        )}
      </div>

      {/* Alert banners for contracts expiring within 90 days */}
      {contracts
        .filter(c => getDaysToExpiry(c.expiry) <= 90)
        .map(c => {
          const days = getDaysToExpiry(c.expiry)
          const al = getExpiryAlert(days)
          return (
            <div key={c.plan} className={`${al.bg} rounded-xl p-2.5 border ${al.border}`}>
              <p className={`text-xs font-semibold ${al.text}`}>
                {al.icon} {c.plan} — expires in {days} days ({c.members} members · ${(c.members * c.pmpm / 1000).toFixed(0)}k/mo at risk)
              </p>
              {!c.autoRenew && (
                <p className="text-xs text-surface-400 mt-0.5">No auto-renew — manual action required</p>
              )}
            </div>
          )
        })}

      {/* Contract table */}
      <div className="space-y-3">
        {contracts.map((c) => {
          const days = getDaysToExpiry(c.expiry)
          const al = getExpiryAlert(days)
          return (
            <div key={c.plan} className="rounded-xl border border-surface-100 dark:border-surface-700 p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{c.plan}</p>
                  <p className="text-xs text-surface-400">{c.members} members · ${c.pmpm.toLocaleString()}/PMPM</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${al.text} ${al.bg} border ${al.border}`}>
                  {days}d
                </span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 italic">{c.terms}</p>
              <div className="flex items-center gap-2 text-xs text-surface-400">
                <span>Expires: {new Date(c.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <span>·</span>
                <span className={c.autoRenew ? "text-emerald-400" : "text-amber-400"}>
                  {c.autoRenew ? "Auto-renew" : "Manual renew"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
