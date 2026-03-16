"use client"
import { Card } from "@/components/ui/card"
const payers=[{name:"Medicare A",pct:22,color:"#3b82f6"},{name:"Medicaid",pct:41,color:"#22c55e"},{name:"Medicare Advantage",pct:18,color:"#a855f7"},{name:"Private Pay",pct:12,color:"#f97316"},{name:"Other",pct:7,color:"#9ca3af"}]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CensusByPayer({ data }: { data?: any }){return(<Card className="neu-card p-5 flex flex-col gap-4"><p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Census by Payer</p><div className="space-y-2">{payers.map(p=>(<div key={p.name} className="flex items-center gap-3 text-sm"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:p.color}}/><span className="flex-1 text-surface-600">{p.name}</span><span className="font-semibold text-surface-800">{p.pct}%</span></div>))}</div></Card>)}
