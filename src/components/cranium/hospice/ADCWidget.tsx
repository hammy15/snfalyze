"use client"
// recharts stubs
const Bar = (p: any) => null;
const XAxis = (p: any) => null;
const YAxis = (p: any) => null;
const CartesianGrid = (p: any) => null;
const Tooltip = (p: any) => null;
const ResponsiveContainer = (p: any) => null;
const Line = (p: any) => null;
const AreaChart = (p: any) => null;
const Area = (p: any) => null;

import { Card } from "@/components/ui/card"
const trendData = [
  { day: "Mar 1",  adc: 38 },
  { day: "Mar 5",  adc: 40 },
  { day: "Mar 10", adc: 41 },
  { day: "Mar 15", adc: 43 },
  { day: "Mar 20", adc: 42 },
  { day: "Mar 25", adc: 44 },
  { day: "Mar 30", adc: 42 },
]

const CURRENT_ADC = 42
const BE_45 = 45
const BE_60 = 60

function getStatus(adc: number) {
  if (adc >= BE_60)  return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Optimal" }
  if (adc >= BE_45)  return { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Marginal" }
  return               { color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   label: "Below Breakeven" }
}

export function ADCWidget() {
  const st = getStatus(CURRENT_ADC)
  const gapTo45 = BE_45 - CURRENT_ADC

  return (
    <Card className="neu-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Avg Daily Census</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-4xl font-bold ${st.color}`}>{CURRENT_ADC}</span>
            <span className="text-surface-400 text-sm mb-1.5">beds/day</span>
          </div>
          <p className={`text-xs ${st.color} font-medium`}>
            {gapTo45 > 0 ? `${gapTo45} below 45-bed breakeven` : "Above 45-bed breakeven"}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.color} ${st.bg} border ${st.border}`}>
          {st.label}
        </span>
      </div>

      {/* Margin Zone Bar */}
      <div>
        <div className="flex justify-between text-xs text-surface-400 mb-1.5">
          <span>0</span>
          <span className="text-amber-400">↑ BE 45</span>
          <span className="text-emerald-400">↑ Optimal 60</span>
        </div>
        <div className="relative h-4 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-[45fr_15fr_40fr]">
            <div className="bg-rose-500/15" />
            <div className="bg-amber-500/15" />
            <div className="bg-emerald-500/15" />
          </div>
          <div
            className="absolute top-0 h-full rounded-full transition-all duration-700"
            style={{
              width: `${(CURRENT_ADC / BE_60) * 100}%`,
              background: "linear-gradient(90deg, #f43f5e, #f59e0b)"
            }}
          />
          {/* Markers */}
          <div className="absolute top-0 h-full w-0.5 bg-amber-500/60" style={{ left: `${(BE_45 / BE_60) * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-1 text-surface-400">
          <span className="text-rose-400 font-medium">Gap: {gapTo45}</span>
          <span>{CURRENT_ADC} / {BE_60} capacity</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="adcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={[30, 70]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, background: "#1e293b", border: "none", color: "#f1f5f9" }}
            />
            <ReferenceLine y={BE_45} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={BE_60} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1} />
            <Area
              type="monotone" dataKey="adc" stroke="#f59e0b"
              fill="url(#adcFill)" strokeWidth={2} dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakeven summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-xs text-surface-400">45-Bed Breakeven</p>
          <p className="text-sm font-bold text-amber-500">{BE_45} ADC</p>
        </div>
        <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-2 text-center">
          <p className="text-xs text-surface-400">60-Bed Optimal</p>
          <p className="text-sm font-bold text-emerald-500">{BE_60} ADC</p>
        </div>
      </div>
    </Card>
  )
}
