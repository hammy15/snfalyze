"use client"

import { useState } from "react"
import { FACILITIES, ALL_DATA } from "./snf-alf-data"

// SNF widgets
import { CensusByPayer } from "./snf/CensusByPayer"
import { HPPDByShift } from "./snf/HPPDByShift"
import { MDSARDTiming } from "./snf/MDSARDTiming"
import { PDPMAccuracy } from "./snf/PDPMAccuracy"
import { AgencyFlagPct } from "./snf/AgencyFlagPct"
import { SurveyReadiness } from "./snf/SurveyReadiness"
import { PayerMixDrift } from "./snf/PayerMixDrift"
import { FiveStarComponents } from "./snf/FiveStarComponents"
import { IncidentLog } from "./snf/IncidentLog"
import { ARAgingByPayer } from "./snf/ARAgingByPayer"

// ALF widgets
import { OccupancyByCareLevel } from "./alf/OccupancyByCareLevel"
import { WaitlistDepth } from "./alf/WaitlistDepth"
import { TourConversionRate } from "./alf/TourConversionRate"
import { MoveinVelocity } from "./alf/MoveinVelocity"
import { CareLevelMigration } from "./alf/CareLevelMigration"
import { AncillaryRevenuePerUnit } from "./alf/AncillaryRevenuePerUnit"
import { ActivitySatisfaction } from "./alf/ActivitySatisfaction"
import { StateComplianceCalendar } from "./alf/StateComplianceCalendar"

type Tab = "snf" | "alf"

export function CraniumDashboard() {
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0].id)
  const [activeTab, setActiveTab] = useState<Tab>("snf")

  const facility = FACILITIES.find(f => f.id === selectedFacility)!
  const facilityData = ALL_DATA[selectedFacility]

  // Derive quick-read status indicators for the header
  const snf = facilityData.snf
  const alf = facilityData.alf
  const occColor = snf.censusByPayer.occupancyPct >= 90 ? "text-emerald-500" : snf.censusByPayer.occupancyPct >= 85 ? "text-amber-500" : "text-rose-500"
  const agencyColor = snf.agencyFlag.agencyHoursPct < 10 ? "text-emerald-500" : snf.agencyFlag.agencyHoursPct <= 20 ? "text-amber-500" : "text-rose-500"
  const surveyColor = snf.surveyReadiness.score >= 80 ? "text-emerald-500" : snf.surveyReadiness.score >= 60 ? "text-amber-500" : "text-rose-500"

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 sticky top-0 z-30 shadow-soft">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Title */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-surface-900 dark:text-surface-50 leading-none">Cranium Intelligence</h1>
                <p className="text-xs text-surface-400 mt-0.5">Operational health dashboard</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden lg:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-surface-400">Occupancy</span>
                <span className={`font-bold ${occColor}`}>{snf.censusByPayer.occupancyPct.toFixed(1)}%</span>
              </div>
              <div className="w-px h-4 bg-surface-200 dark:bg-surface-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-surface-400">Agency</span>
                <span className={`font-bold ${agencyColor}`}>{snf.agencyFlag.agencyHoursPct.toFixed(1)}%</span>
              </div>
              <div className="w-px h-4 bg-surface-200 dark:bg-surface-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-surface-400">Survey</span>
                <span className={`font-bold ${surveyColor}`}>{snf.surveyReadiness.score}/100</span>
              </div>
              <div className="w-px h-4 bg-surface-200 dark:bg-surface-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-surface-400">Five-Star</span>
                <span className="font-bold text-surface-700 dark:text-surface-200">
                  {"★".repeat(snf.fiveStar.overall.stars)}{"☆".repeat(5 - snf.fiveStar.overall.stars)}
                </span>
              </div>
            </div>

            {/* Facility selector */}
            <div className="flex-shrink-0">
              <div className="relative">
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="appearance-none bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-100 text-sm font-medium rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer transition-all"
                >
                  {FACILITIES.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.state})
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Service line tabs */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setActiveTab("snf")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "snf"
                  ? "bg-primary-500 text-white shadow-glow-primary"
                  : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
            >
              <span>🏥</span>
              <span>SNF</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "snf" ? "bg-white/20" : "bg-surface-200 dark:bg-surface-700 text-surface-500"}`}>
                {facility.snfBeds} beds
              </span>
            </button>
            <button
              onClick={() => setActiveTab("alf")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "alf"
                  ? "bg-primary-500 text-white shadow-glow-primary"
                  : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
            >
              <span>🏡</span>
              <span>ALF / IL</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "alf" ? "bg-white/20" : "bg-surface-200 dark:bg-surface-700 text-surface-500"}`}>
                {facility.alfUnits} units
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2 text-xs text-surface-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span>Live · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Widget Grid ─────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "snf" && (
          <div key={`snf-${selectedFacility}`} className="animate-fade-in">
            {/* Alert bar if critical issues */}
            {(snf.mdsARDTiming.overdue > 0 || snf.agencyFlag.agencyHoursPct > 20 || snf.surveyReadiness.score < 60) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {snf.mdsARDTiming.overdue > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠</span> {snf.mdsARDTiming.overdue} MDS ARD{snf.mdsARDTiming.overdue > 1 ? "s" : ""} overdue — regulatory risk
                  </div>
                )}
                {snf.agencyFlag.agencyHoursPct > 20 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠</span> Agency hours elevated at {snf.agencyFlag.agencyHoursPct.toFixed(1)}% — cost pressure
                  </div>
                )}
                {snf.surveyReadiness.score < 60 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠</span> Survey readiness score {snf.surveyReadiness.score}/100 — intervention needed
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Row 1 — Census + HPPD + MDS + PDPM */}
              <div className="sm:col-span-2">
                <CensusByPayer data={snf.censusByPayer} />
              </div>
              <HPPDByShift data={snf.hppdByShift} />
              <MDSARDTiming data={snf.mdsARDTiming} />

              {/* Row 2 — PDPM + Agency + Survey + Payer drift */}
              <PDPMAccuracy data={snf.pdpmAccuracy} />
              <AgencyFlagPct data={snf.agencyFlag} />
              <SurveyReadiness data={snf.surveyReadiness} />
              <PayerMixDrift data={snf.payerMixDrift} />

              {/* Row 3 — Five Star + Incidents + AR Aging */}
              <FiveStarComponents data={snf.fiveStar} />
              <IncidentLog data={snf.incidentLog} />
              <div className="sm:col-span-2">
                <ARAgingByPayer data={snf.arAging} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "alf" && (
          <div key={`alf-${selectedFacility}`} className="animate-fade-in">
            {/* Alert bar for ALF */}
            {(alf.waitlistDepth.entries.some(e => e.status === "critical") || alf.stateCompliance.nextDeadline.status === "overdue" || alf.tourConversion.conversionRate < alf.tourConversion.industryBenchmark - 5) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {alf.waitlistDepth.entries.filter(e => e.status === "critical").map(e => (
                  <div key={e.careLevel} className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠</span> {e.careLevel} waitlist empty — census risk
                  </div>
                ))}
                {alf.stateCompliance.nextDeadline.status === "overdue" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <span>⚠</span> Compliance deadline overdue: {alf.stateCompliance.nextDeadline.description}
                  </div>
                )}
                {alf.tourConversion.conversionRate < alf.tourConversion.industryBenchmark - 5 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <span>⚠</span> Tour conversion {alf.tourConversion.conversionRate.toFixed(1)}% — below {alf.tourConversion.industryBenchmark}% benchmark
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Row 1 */}
              <div className="sm:col-span-2">
                <OccupancyByCareLevel data={alf.occupancyByCareLevel} />
              </div>
              <WaitlistDepth data={alf.waitlistDepth} />
              <TourConversionRate data={alf.tourConversion} />

              {/* Row 2 */}
              <MoveinVelocity data={alf.moveinVelocity} />
              <CareLevelMigration data={alf.careLevelMigration} />
              <AncillaryRevenuePerUnit data={alf.ancillaryRevenue} />
              <StateComplianceCalendar data={alf.stateCompliance} />

              {/* Row 3 */}
              <div className="sm:col-span-2">
                <ActivitySatisfaction data={alf.activitySatisfaction} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="border-t border-surface-200 dark:border-surface-800 mt-8">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-surface-400">
          <span>Cranium Intelligence · Cascadia Healthcare Underwriting Platform</span>
          <span>Demo data · {new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
        </div>
      </div>
    </div>
  )
}
