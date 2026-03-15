"use client"

import { Card } from "@/components/ui/card"
import { LineChart, Line, ReferenceLine, Tooltip, ResponsiveContainer, XAxis } from "recharts"
import type { TourConversionData } from "../snf-alf-data"

interface Props { data: TourConversionData }

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

export function TourConversionRate({ data }: Props) {
  const rate = data.conversionRate
  const bench = data.industryBenchmark
  const aboveBench = rate >= bench
  const rateColor = rate >= bench + 3 ? "text-emerald-500" : rate >= bench ? "text-emerald-500" : rate >= bench - 5 ? "text-amber-500" : "text-rose-500"
  const fillColor = aboveBench ? "#10b981" : rate >= bench - 5 ? "#f59e0b" : "#f43f5e"

  const chartData = data.trend.map((v, i) => ({ month: MONTHS[i], rate: v }))

  const diff = rate - bench

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Tour Conversion Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${rateColor}`}>{rate.toFixed(1)}%</span>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${diff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp vs {bench}% benchmark
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-surface-700 dark:text-surface-200">{data.moveInsThisMonth} / {data.toursThisMonth}</p>
          <p className="text-[10px] text-surface-400">move-ins / tours</p>
        </div>
      </div>

      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Conversion"]}
            />
            <ReferenceLine y={bench} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1} label={{ value: `${bench}%`, position: "right", fontSize: 9, fill: "#94a3b8" }} />
            <Line type="monotone" dataKey="rate" stroke={fillColor} strokeWidth={2.5} dot={{ fill: fillColor, strokeWidth: 0, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-surface-200 dark:border-surface-700">
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-[10px] text-surface-400">Industry</p>
          <p className="text-xs font-bold text-surface-500">{bench}%</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-[10px] text-surface-400">Tours MTD</p>
          <p className="text-xs font-bold text-surface-700 dark:text-surface-200">{data.toursThisMonth}</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-[10px] text-surface-400">Move-ins MTD</p>
          <p className="text-xs font-bold text-surface-700 dark:text-surface-200">{data.moveInsThisMonth}</p>
        </div>
      </div>
    </Card>
  )
}
