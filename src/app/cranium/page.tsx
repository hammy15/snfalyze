"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { AnimatedTabs, TabPanel } from "@/components/ui/tabs"
import { AlertTriangle, TrendingUp, Activity } from "lucide-react"

// ── CIL Tensions (new, default)
import { Tension1Valuation }    from "@/components/cranium/tensions/Tension1Valuation"
import { Tension2Growth }       from "@/components/cranium/tensions/Tension2Growth"
import { Tension3MarketTiming } from "@/components/cranium/tensions/Tension3MarketTiming"
import { Tension4PayerMix }     from "@/components/cranium/tensions/Tension4PayerMix"
import { Tension5Synergy }      from "@/components/cranium/tensions/Tension5Synergy"
import { Tension6ExitMultiple } from "@/components/cranium/tensions/Tension6ExitMultiple"

// ── Vertical Integration (new)
import { PatientFlowWidget }         from "@/components/cranium/vertint/PatientFlowWidget"
import { RevenuePerEpisodeWidget }   from "@/components/cranium/vertint/RevenuePerEpisodeWidget"
import { PipeCoverageWidget }        from "@/components/cranium/vertint/PipeCoverageWidget"
import { HospitalPartnershipWidget } from "@/components/cranium/vertint/HospitalPartnershipWidget"
import { ReferralLeakageWidget }     from "@/components/cranium/vertint/ReferralLeakageWidget"
import { VertIntROIWidget }          from "@/components/cranium/vertint/VertIntROIWidget"

// ── Therapy (new)
import { InHouseVsContractWidget } from "@/components/cranium/therapy/InHouseVsContractWidget"
import { TherapyMinutesWidget }    from "@/components/cranium/therapy/TherapyMinutesWidget"
import { RPDDifferentialWidget }   from "@/components/cranium/therapy/RPDDifferentialWidget"
import { TherapyOutcomesWidget }   from "@/components/cranium/therapy/TherapyOutcomesWidget"
import { CostEfficiencyWidget }    from "@/components/cranium/therapy/CostEfficiencyWidget"
import { TherapyMixOptWidget }     from "@/components/cranium/therapy/TherapyMixOptWidget"

// Hospice widgets
import { ADCWidget }               from "@/components/cranium/hospice/ADCWidget"
import { AdmissionSourceMixWidget }from "@/components/cranium/hospice/AdmissionSourceMixWidget"
import { GIPUtilizationWidget }    from "@/components/cranium/hospice/GIPUtilizationWidget"
import { ContinuousCareDaysWidget }from "@/components/cranium/hospice/ContinuousCareDaysWidget"
import { CAHPSScoresWidget }       from "@/components/cranium/hospice/CAHPSScoresWidget"
import { StaffTenureWidget }       from "@/components/cranium/hospice/StaffTenureWidget"
import { BereavementQualityWidget }from "@/components/cranium/hospice/BereavementQualityWidget"
import { MedicareCapWidget }       from "@/components/cranium/hospice/MedicareCapWidget"

// Home Health widgets
import { EpisodeMixPDGMWidget }      from "@/components/cranium/home-health/EpisodeMixPDGMWidget"
import { OASISAccuracyWidget }       from "@/components/cranium/home-health/OASISAccuracyWidget"
import { VisitUtilizationWidget }    from "@/components/cranium/home-health/VisitUtilizationWidget"
import { ReadmissionRateWidget }     from "@/components/cranium/home-health/ReadmissionRateWidget"
import { DischargeDispositionWidget }from "@/components/cranium/home-health/DischargeDispositionWidget"
import { ReferralConcentrationWidget}from "@/components/cranium/home-health/ReferralConcentrationWidget"
import { EpisodeRevenueByPDGMWidget }from "@/components/cranium/home-health/EpisodeRevenueByPDGMWidget"
import { CostPerVisitWidget }        from "@/components/cranium/home-health/CostPerVisitWidget"

// I-SNP widgets
import { EnrolledMemberCountWidget } from "@/components/cranium/isnp/EnrolledMemberCountWidget"
import { PMPMRateWidget }            from "@/components/cranium/isnp/PMPMRateWidget"
import { AcuteHospitalizationWidget }from "@/components/cranium/isnp/AcuteHospitalizationWidget"
import { CareCoordinationWidget }    from "@/components/cranium/isnp/CareCoordinationWidget"
import { EnrollmentPipelineWidget }  from "@/components/cranium/isnp/EnrollmentPipelineWidget"
import { PlanContractTermsWidget }   from "@/components/cranium/isnp/PlanContractTermsWidget"
import { MemberSatisfactionWidget }  from "@/components/cranium/isnp/MemberSatisfactionWidget"
import { GeographicPenetrationWidget}from "@/components/cranium/isnp/GeographicPenetrationWidget"

// SNF widgets
import { CensusByPayer }       from "@/components/cranium/snf/CensusByPayer"
import { HPPDByShift }         from "@/components/cranium/snf/HPPDByShift"
import { MDSARDTiming }        from "@/components/cranium/snf/MDSARDTiming"
import { PDPMAccuracy }        from "@/components/cranium/snf/PDPMAccuracy"
import { AgencyFlagPct }       from "@/components/cranium/snf/AgencyFlagPct"
import { SurveyReadiness }     from "@/components/cranium/snf/SurveyReadiness"
import { PayerMixDrift }       from "@/components/cranium/snf/PayerMixDrift"
import { FiveStarComponents }  from "@/components/cranium/snf/FiveStarComponents"
import { IncidentLog }         from "@/components/cranium/snf/IncidentLog"
import { ARAgingByPayer }      from "@/components/cranium/snf/ARAgingByPayer"

// ALF/IL widgets
import { OccupancyByCareLevel }    from "@/components/cranium/alf/OccupancyByCareLevel"
import { WaitlistDepth }           from "@/components/cranium/alf/WaitlistDepth"
import { TourConversionRate }      from "@/components/cranium/alf/TourConversionRate"
import { MoveinVelocity }          from "@/components/cranium/alf/MoveinVelocity"
import { CareLevelMigration }      from "@/components/cranium/alf/CareLevelMigration"
import { AncillaryRevenuePerUnit } from "@/components/cranium/alf/AncillaryRevenuePerUnit"
import { ActivitySatisfaction }    from "@/components/cranium/alf/ActivitySatisfaction"
import { StateComplianceCalendar } from "@/components/cranium/alf/StateComplianceCalendar"

import { FACILITIES, ALL_DATA } from "@/components/cranium/snf-alf-data"

const TABS = [
  { id: "tensions",    label: "CIL War Room",  badge: "6",  icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> },
  { id: "vertint",     label: "Vert-Int",      badge: "6",  icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: "therapy",     label: "Therapy",       badge: "6",  icon: <Activity className="w-3.5 h-3.5" /> },
  { id: "snf",         label: "SNF",           badge: "10" },
  { id: "alf",         label: "ALF / IL",      badge: "8"  },
  { id: "hospice",     label: "Hospice",       badge: "8"  },
  { id: "home-health", label: "Home Health",   badge: "8"  },
  { id: "isnp",        label: "I-SNP",         badge: "8"  },
]

function FacilitySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-100 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer"
      >
        {FACILITIES.map(f => (
          <option key={f.id} value={f.id}>{f.name} ({f.state})</option>
        ))}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export default function CraniumPage() {
  const [activeTab, setActiveTab] = useState("tensions")
  const [snfFacility, setSnfFacility] = useState(FACILITIES[0].id)
  const [alfFacility, setAlfFacility] = useState(FACILITIES[0].id)

  const snfData = ALL_DATA[snfFacility].snf
  const alfData = ALL_DATA[alfFacility].alf

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-[#0a0a0b] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Cranium"
        description="Synthesis layer — CIL War Room · Vert-Int · Therapy · SNF · ALF/IL · Hospice · Home Health · I-SNP"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400 bg-surface-100 dark:bg-surface-800 px-3 py-1.5 rounded-full">
              March 2026
            </span>
            <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full font-medium">
              Live Data
            </span>
          </div>
        }
      />

      <AnimatedTabs tabs={TABS} defaultTab="tensions" onChange={setActiveTab} variant="default">

        {/* ─── CIL War Room (TENSIONS) — default ─────────────── */}
        <TabPanel id="tensions" activeTab={activeTab}>
          <div className="rounded-2xl bg-gray-950 border border-gray-800 px-6 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  CIL War Room
                  <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest ml-2">Decision-Forcing Tension Analysis</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  6 structural tensions · 3 active deals · Each tension shows both sides → CIL recommendation
                </p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Proceed</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Conditional</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Revisit / Pass</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Tension1Valuation />
            <Tension2Growth />
            <Tension3MarketTiming />
            <Tension4PayerMix />
            <Tension5Synergy />
            <Tension6ExitMultiple />
          </div>
        </TabPanel>

        {/* ─── Vertical Integration ────────────────────────── */}
        <TabPanel id="vertint" activeTab={activeTab}>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">Vertical Integration Intelligence</h2>
            <p className="text-xs text-surface-500 mt-0.5">Patient flow · Revenue per episode · Market coverage · Hospital partnerships · Referral leakage · 12-mo ROI</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PatientFlowWidget />
            <RevenuePerEpisodeWidget />
            <PipeCoverageWidget />
            <HospitalPartnershipWidget />
            <ReferralLeakageWidget />
            <VertIntROIWidget />
          </div>
        </TabPanel>

        {/* ─── Therapy ─────────────────────────────────────── */}
        <TabPanel id="therapy" activeTab={activeTab}>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">Therapy Operations Intelligence</h2>
            <p className="text-xs text-surface-500 mt-0.5">In-house vs. contract mix · Minutes per episode · RPD premium · Outcomes · Cost efficiency · Mix optimization alerts</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <InHouseVsContractWidget />
            <TherapyMinutesWidget />
            <RPDDifferentialWidget />
            <TherapyOutcomesWidget />
            <CostEfficiencyWidget />
            <TherapyMixOptWidget />
          </div>
        </TabPanel>

        {/* ─── SNF (10 widgets) ────────────────────────────── */}
        <TabPanel id="snf" activeTab={activeTab}>
          {/* Facility selector + alert strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <FacilitySelector value={snfFacility} onChange={setSnfFacility} />
            <div className="flex flex-wrap gap-2">
              {snfData.mdsARDTiming.overdue > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ {snfData.mdsARDTiming.overdue} ARD{snfData.mdsARDTiming.overdue > 1 ? "s" : ""} overdue
                </span>
              )}
              {snfData.agencyFlag.agencyHoursPct > 20 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ Agency {snfData.agencyFlag.agencyHoursPct.toFixed(1)}% elevated
                </span>
              )}
              {snfData.surveyReadiness.score < 60 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ Survey readiness {snfData.surveyReadiness.score}/100
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Widgets 1–2: Census (wide) + HPPD */}
            <div className="sm:col-span-2"><CensusByPayer data={snfData.censusByPayer} /></div>
            <HPPDByShift data={snfData.hppdByShift} />
            {/* Widget 3: MDS */}
            <MDSARDTiming data={snfData.mdsARDTiming} />
            {/* Widgets 4–7 */}
            <PDPMAccuracy data={snfData.pdpmAccuracy} />
            <AgencyFlagPct data={snfData.agencyFlag} />
            <SurveyReadiness data={snfData.surveyReadiness} />
            <PayerMixDrift data={snfData.payerMixDrift} />
            {/* Widgets 8–10 */}
            <FiveStarComponents data={snfData.fiveStar} />
            <IncidentLog data={snfData.incidentLog} />
            <div className="sm:col-span-2"><ARAgingByPayer data={snfData.arAging} /></div>
          </div>
        </TabPanel>

        {/* ─── ALF / IL (8 widgets) ────────────────────────── */}
        <TabPanel id="alf" activeTab={activeTab}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <FacilitySelector value={alfFacility} onChange={setAlfFacility} />
            <div className="flex flex-wrap gap-2">
              {alfData.waitlistDepth.entries.filter(e => e.status === "critical").map(e => (
                <span key={e.careLevel} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ {e.careLevel} waitlist empty
                </span>
              ))}
              {alfData.stateCompliance.nextDeadline.status === "overdue" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ Compliance deadline overdue
                </span>
              )}
              {alfData.tourConversion.conversionRate < alfData.tourConversion.industryBenchmark - 5 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Tour conversion below benchmark
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Widgets 11–12: Occupancy (wide) + Waitlist */}
            <div className="sm:col-span-2"><OccupancyByCareLevel data={alfData.occupancyByCareLevel} /></div>
            <WaitlistDepth data={alfData.waitlistDepth} />
            {/* Widget 13: Tour conversion */}
            <TourConversionRate data={alfData.tourConversion} />
            {/* Widgets 14–17 */}
            <MoveinVelocity data={alfData.moveinVelocity} />
            <CareLevelMigration data={alfData.careLevelMigration} />
            <AncillaryRevenuePerUnit data={alfData.ancillaryRevenue} />
            <StateComplianceCalendar data={alfData.stateCompliance} />
            {/* Widget 18: Activity satisfaction (wide) */}
            <div className="sm:col-span-2"><ActivitySatisfaction data={alfData.activitySatisfaction} /></div>
          </div>
        </TabPanel>

        {/* ─── Hospice ─────────────────────────────────────── */}
        <TabPanel id="hospice" activeTab={activeTab}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <ADCWidget />
            <AdmissionSourceMixWidget />
            <GIPUtilizationWidget />
            <ContinuousCareDaysWidget />
            <CAHPSScoresWidget />
            <StaffTenureWidget />
            <BereavementQualityWidget />
            <MedicareCapWidget />
          </div>
        </TabPanel>

        {/* ─── Home Health ─────────────────────────────────── */}
        <TabPanel id="home-health" activeTab={activeTab}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <EpisodeMixPDGMWidget />
            <OASISAccuracyWidget />
            <VisitUtilizationWidget />
            <ReadmissionRateWidget />
            <DischargeDispositionWidget />
            <ReferralConcentrationWidget />
            <EpisodeRevenueByPDGMWidget />
            <CostPerVisitWidget />
          </div>
        </TabPanel>

        {/* ─── I-SNP ───────────────────────────────────────── */}
        <TabPanel id="isnp" activeTab={activeTab}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <EnrolledMemberCountWidget />
            <PMPMRateWidget />
            <AcuteHospitalizationWidget />
            <CareCoordinationWidget />
            <EnrollmentPipelineWidget />
            <PlanContractTermsWidget />
            <MemberSatisfactionWidget />
            <GeographicPenetrationWidget />
          </div>
        </TabPanel>

      </AnimatedTabs>
    </div>
  )
}
