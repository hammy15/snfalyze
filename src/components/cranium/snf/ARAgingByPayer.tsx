"use client"

import { Card } from "@/components/ui/card"
import type { ARAgingData } from "../snf-alf-data"

interface Props { data: ARAgingData }

const BUCKET_COLORS = ["#14b8a6", "#f59e0b", "#f97316", "#f43f5e"]
const PAYER_COLORS = { medicare: "#14b8a6", medicaid: "#6366f1", privatePay: "#f97316" }

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

export function ARAgingByPayer({ data }: Props) {
  const maxBucket = Math.max(...data.buckets.map(b => b.total))
  const over90Color = data.over90Pct > 15 ? "text-rose-500" : data.over90Pct > 8 ? "text-amber-500" : "text-emerald-500"

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">AR Aging by Payer</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-bold text-surface-800 dark:text-surface-100">
              ${(data.totalAR / 1000).toFixed(0)}k
            </span>
            <span className="text-surface-400 text-sm mb-1">total AR</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${over90Color}`}>{data.over90Pct.toFixed(1)}%</span>
          <p className="text-[10px] text-surface-400">90+ days</p>
        </div>
      </div>

      {/* Stacked visual */}
      <div className="space-y-2">
        {data.buckets.map((bucket, i) => {
          const pct = (bucket.total / data.totalAR) * 100
          const barPct = (bucket.total / maxBucket) * 100
          const isBad = i === 3 && data.over90Pct > 8
          return (
            <div key={bucket.bucket} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${i === 3 ? over90Color : "text-surface-600 dark:text-surface-300"}`}>{bucket.bucket} days</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-800 dark:text-surface-100">{fmt(bucket.total)}</span>
                  <span className="text-[10px] text-surface-400 w-8 text-right">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isBad ? "animate-pulse" : ""}`}
                  style={{ width: `${barPct}%`, backgroundColor: BUCKET_COLORS[i] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Payer breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              <th className="text-left py-1.5 text-surface-400 font-medium">Bucket</th>
              <th className="text-right py-1.5 font-medium" style={{ color: PAYER_COLORS.medicare }}>Medicare</th>
              <th className="text-right py-1.5 font-medium" style={{ color: PAYER_COLORS.medicaid }}>Medicaid</th>
              <th className="text-right py-1.5 font-medium" style={{ color: PAYER_COLORS.privatePay }}>Private</th>
            </tr>
          </thead>
          <tbody>
            {data.buckets.map((bucket, i) => (
              <tr key={bucket.bucket} className={`border-b border-surface-100 dark:border-surface-800 last:border-0 ${i === 3 && data.over90Pct > 8 ? "bg-rose-500/5" : ""}`}>
                <td className="py-1.5 text-surface-600 dark:text-surface-300 font-medium">{bucket.bucket}d</td>
                <td className="py-1.5 text-right text-surface-700 dark:text-surface-200">{fmt(bucket.medicare)}</td>
                <td className="py-1.5 text-right text-surface-700 dark:text-surface-200">{fmt(bucket.medicaid)}</td>
                <td className="py-1.5 text-right text-surface-700 dark:text-surface-200">{fmt(bucket.privatePay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
