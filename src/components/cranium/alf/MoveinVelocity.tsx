"use client"
import { Card } from "@/components/ui/card"
const months=[{m:"Oct",v:8},{m:"Nov",v:11},{m:"Dec",v:7},{m:"Jan",v:13},{m:"Feb",v:10},{m:"Mar",v:9}]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MoveinVelocity({ data }: { data?: any }){return(<Card className="neu-card p-5 flex flex-col gap-4"><div className="flex justify-between items-start"><p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Move-In Velocity</p><span className="text-xs text-surface-500">6-mo avg: 10/mo</span></div><div className="flex items-end gap-2" style={{height:"56px"}}>{months.map(item=>(<div key={item.m} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-blue-500 rounded-t" style={{height:String(Math.round((item.v/13)*100))+"%",minHeight:"4px"}}/><span className="text-xs text-surface-400">{item.m}</span></div>))}</div></Card>)}
