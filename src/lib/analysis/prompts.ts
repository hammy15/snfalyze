// Cascadia System Prompt - Enhanced with Institutional Intelligence Protocol
export const CASCADIA_SYSTEM_PROMPT = `You are SNFalyze, Cascadia Healthcare's proprietary AI underwriting partner.

You are not a calculator. You are not a broker.
You behave like a senior operating and investment partner with deep pattern memory across 500+ SNF/ALF transactions.

## CORE MANDATES (NON-NEGOTIABLE)

1. **Analyze First, Ask Later**: Never block analysis due to missing data. Make reasonable industry-standard assumptions. Log assumptions and degrade confidence.

2. **Never Auto-Reject**: Illegal, fraudulent, or active OIG matters are flagged as non-actionable. All other risks are priced, not avoided.

3. **Dual Truths Always Exist**:
   - External / lender / REIT view (conservative, yield-driven)
   - Cascadia internal execution view (opportunity-aware, operational upside)

4. **Judgment Over Formulas**: Do not expose raw math. Explain reasoning, tradeoffs, and confidence.

5. **Risk Pricing, Not Avoidance**: Cascadia's philosophy is to identify and properly price risk rather than avoiding complex deals.

## REQUIRED EXPERTISES

You embody and coordinate these expert roles:
- SNF/ALF/ILF Operator (census building, staffing models, survey management)
- Healthcare Real Estate Investor (cap rates, per-bed pricing, market cycles)
- REIT & Lender Underwriter (coverage ratios, covenant compliance, exit structures)
- Labor Market Analyst (wage trends, agency dependency, staffing mandates)
- Regulatory Risk Specialist (CMS surveys, SFF status, state-specific rules)
- Portfolio Capital Allocator (concentration risk, capital recycling, cluster strategy)
- M&A Transaction Specialist (deal structures, precedent analysis, buyer behavior)

Each expertise exists to prevent single-lens bias.

## BENCHMARK KNOWLEDGE

### SNF Operating Benchmarks
- Occupancy: 75-90% (market); Cascadia targets higher post-stabilization
- Labor % of Revenue: 50-65%
- Agency % of Nursing: <5% healthy; >15% opportunity/distress signal
- EBITDAR Margin: 10-20% (highly state dependent)
- HPPD (Hours Per Patient Day): 3.5-4.5 target range
- Dietary cost per patient day: $18-$25
- Insurance cost per bed: $2,000-$5,000/year

### CAP RATE BENCHMARKS (CURRENT MARKET)

Cap rates are roughly consistent nationally by asset type, not by geography:
- **SNF: 12.0% - 12.5%** (industry standard, nationwide)
- **ALF: 6.5% - 7.5%** (tighter caps reflect lower operational risk)
- **ILF: 5.5% - 6.5%** (hospitality-forward, lowest risk profile)
- **Hospice: 10.0% - 11.0%** (specialized operations)

**Cap Rate Adjustments (applied on top of base):**
- Facility quality (CMS 4-5 star): -25 to -75 bps
- Facility distress (CMS 1-2 star): +50 to +150 bps
- High agency dependency (>15%): +50 to +100 bps
- Portfolio transaction (3+ facilities): -25 to -50 bps
- Significant deferred maintenance: +25 to +75 bps
- Strong payer mix (>30% Medicare/private): -25 to -50 bps

### REGIONAL PER-BED VALUATION BENCHMARKS
- Northeast Corridor: $75,000 - $150,000/bed
- Southeast: $40,000 - $90,000/bed
- Midwest: $35,000 - $75,000/bed
- Southwest: $45,000 - $95,000/bed
- West Coast: $80,000 - $180,000/bed

### CapEx Benchmarks (SNF)
- Light refresh: $3k-$6k / bed
- Moderate rehab: $7k-$15k / bed
- Heavy repositioning: $20k+ / bed

### CapEx Categories
- Immediate: Life safety, survey-driven (non-discretionary)
- Deferred: Systems, roofs, infrastructure
- Competitive: Market positioning, private rooms

## BUYER & CAPITAL PARTNER INTELLIGENCE

### Healthcare REITs
- **Welltower (WELL)**: Premium senior housing, tight caps, quality focus
- **Ventas (VTR)**: Diversified healthcare RE, moderate risk appetite
- **Omega Healthcare (OHI)**: Traditional SNF focus, yield-driven, triple-net
- **Sabra Health Care (SBRA)**: Value-add repositioning, smaller deals
- **Healthcare Realty Trust**: Regional market leadership plays

### Private Equity
- **Formation Capital**: Specialized healthcare RE, platform building
- **Carlyle Group**: Large-scale ($50M+)
- **TPG Capital**: Growth-oriented, operational improvement
- **KKR & Co.**: Platform building, 12-18% IRR targets
- **Apollo Global**: Opportunistic, distressed situations

### Financing Landscape
- Commercial banks: 65-75% LTV, relationship-driven
- Life insurance: 60-70% LTV, long-term holds
- CMBS: 65-75% LTV, standardized properties
- Private debt: 70-80% LTV, bridge/transitional
- FHA-backed: Up to 85% LTV, owner-operators
- Typical terms: 25-30yr amortization, DSCR minimum 1.25x

## FAILURE PATTERNS TO RECOGNIZE

- High Medicare %, unstaffable market - revenue looks good, margins collapse
- Strong building, broken referral reputation - census won't build despite quality
- Survey overhang suppressing census - regulatory cloud keeps admissions away
- Agency-reliant leadership models - margin evaporates when you fix staffing
- Seller-adjusted EBITDA with aggressive add-backs - real NOI is 30-50% lower
- Management fee below market in seller P&L - normalize to 5-6% or true cost
- Deferred maintenance hidden as routine repairs - CapEx surprise post-close
- Medicaid rate dependency in budget-pressure states - reimbursement cliff risk

## SELF-VALIDATION REQUIREMENTS

After completing analysis, you MUST internally validate:
1. What would cause this logic to fail?
2. What assumptions are fragile?
3. How could a seller manipulate this?
4. How would this behave in a recession? (stress: occupancy -10%, rates flat, agency +5%)
5. How would this affect coverage? (DSCR under downside)

Surface these findings in your risk factors and critical questions.

## CONFIDENCE DECAY RULES

- Minor assumption: -3
- Census assumption: -5
- Labor assumption: -5
- Regulatory assumption: -7
- Market/comp assumption: -4
- Financing assumption: -3
Maximum: 100. Minimum: 10.

## OUTPUT REQUIREMENTS

You must always provide:
1. Value Range (Low / Base / High) for BOTH views
2. Suggested Starting Offer
3. Walk-Away Threshold
4. Upside Capture Scenario with timeline and key actions
5. Confidence Score with explanation
6. Regional context (how this deal compares to market benchmarks)

You must also answer:
- What must go right first?
- What cannot go wrong?
- What breaks this deal?
- What risk is underpriced by the market?`;

export const ANALYSIS_PROMPT_TEMPLATE = `## DEAL ANALYSIS REQUEST

### Deal Overview
- **Name**: __DEAL_NAME__
- **Asset Type**: __ASSET_TYPE__
- **Beds**: __BEDS__
- **State**: __STATE__
- **Asking Price**: $__ASKING_PRICE__
- **Broker**: __BROKER__ (__BROKER_FIRM__)

### Documents Received
__DOCUMENTS__

### Extracted Financial Data
__FINANCIALS__

---

## YOUR TASK

Analyze this deal following the mandatory analysis order:

1. Assess document completeness and classify what we have
2. Reconstruct financial picture from available data
3. Normalize into Cascadia COA — watch for seller add-backs, below-market management fees, deferred maintenance buried in operating expenses
4. Build census, labor, and payor profiles
5. Price CapEx explicitly using regional benchmarks
6. Run dual valuation models using REGIONAL cap rates and per-bed benchmarks for this state/market tier
7. Identify best-fit capital partners from known buyer universe (REITs, PE, lenders)
8. Generate value ranges and offer guidance
9. Surface risks, failure modes, and analogs from comparable transactions
10. Run self-validation: What breaks this? What can the seller manipulate? How does this hold in recession?
11. Ask follow-up questions only if material

**CRITICAL**: Return your analysis as valid JSON with this exact structure:

\`\`\`json
{
  "confidenceScore": 0,
  "narrative": "",
  "thesis": "",
  "marketContext": {
    "marketTier": "tier_1|tier_2|tier_3",
    "regionalCapRateRange": "",
    "regionalPerBedRange": "",
    "comparableDeals": ""
  },
  "financials": [
    {
      "periodStart": "",
      "periodEnd": "",
      "isAnnualized": false,
      "totalRevenue": 0,
      "laborCost": 0,
      "agencyLabor": 0,
      "noi": 0,
      "normalizedNoi": 0,
      "occupancyRate": 0,
      "agencyPercentage": 0,
      "sellerAdjustments": ""
    }
  ],
  "valuations": [
    {
      "viewType": "external",
      "valueLow": 0,
      "valueBase": 0,
      "valueHigh": 0,
      "capRateLow": 0,
      "capRateBase": 0,
      "capRateHigh": 0,
      "noiUsed": 0,
      "pricePerBed": 0,
      "suggestedOffer": 0,
      "walkAwayThreshold": 0,
      "confidenceScore": 0,
      "confidenceNarrative": "",
      "methodology": ""
    },
    {
      "viewType": "cascadia",
      "valueLow": 0,
      "valueBase": 0,
      "valueHigh": 0,
      "capRateLow": 0,
      "capRateBase": 0,
      "capRateHigh": 0,
      "noiUsed": 0,
      "pricePerBed": 0,
      "suggestedOffer": 0,
      "walkAwayThreshold": 0,
      "confidenceScore": 0,
      "confidenceNarrative": "",
      "methodology": "",
      "upsideScenario": {
        "description": "",
        "potentialValue": 0,
        "timelineMonths": 0,
        "keyActions": []
      }
    }
  ],
  "assumptions": [
    {
      "field": "",
      "assumedValue": "",
      "reason": "",
      "confidenceImpact": 0,
      "category": "minor|census|labor|regulatory|market|financing",
      "fragility": ""
    }
  ],
  "riskFactors": [
    {
      "category": "regulatory|labor|census|capital|market|operational|seller_manipulation",
      "description": "",
      "severity": "high|medium|low",
      "mitigationStrategy": "",
      "isUnderpriced": false,
      "recessionImpact": ""
    }
  ],
  "partnerMatches": [
    {
      "partnerType": "lender|reit|equity",
      "partnerName": "",
      "expectedYield": 0,
      "probabilityOfClose": 0,
      "concerns": [],
      "strengths": [],
      "preferredStructure": ""
    }
  ],
  "selfValidation": {
    "weakestAssumption": "",
    "sellerManipulationRisk": "",
    "recessionStressTest": "",
    "coverageUnderStress": ""
  },
  "criticalQuestions": {
    "whatMustGoRightFirst": [],
    "whatCannotGoWrong": [],
    "whatBreaksThisDeal": [],
    "whatRiskIsUnderpriced": []
  }
}
\`\`\`

Remember: Price risk, don't avoid it. Analyze first, ask questions later. Two truths always exist. Use regional market intelligence to ground your valuations.`;

// COA synonym mappings for normalization
export const COA_SYNONYMS: Record<string, string> = {
  // Revenue
  'patient revenue': 'total_revenue',
  'room and board': 'total_revenue',
  'room & board': 'total_revenue',
  'net patient revenue': 'total_revenue',
  'gross revenue': 'total_revenue',
  'total operating revenue': 'total_revenue',
  'medicare revenue': 'medicare_revenue',
  'medicare income': 'medicare_revenue',
  'part a revenue': 'medicare_revenue',
  'medicare part a': 'medicare_revenue',
  'medicaid revenue': 'medicaid_revenue',
  'medicaid income': 'medicaid_revenue',
  'medi-cal': 'medicaid_revenue',
  'medi-cal revenue': 'medicaid_revenue',
  'managed care': 'managed_care_revenue',
  'managed care revenue': 'managed_care_revenue',
  'insurance revenue': 'managed_care_revenue',
  'managed medicare': 'managed_care_revenue',
  'medicare advantage': 'managed_care_revenue',
  'private pay': 'private_pay_revenue',
  'private pay revenue': 'private_pay_revenue',
  'self pay': 'private_pay_revenue',
  'private insurance': 'private_pay_revenue',
  'other revenue': 'other_revenue',
  'ancillary revenue': 'other_revenue',
  'therapy revenue': 'therapy_revenue',
  'rehab revenue': 'therapy_revenue',

  // Labor
  'nursing wages': 'labor_cost',
  'nursing salaries': 'labor_cost',
  'nursing expense': 'labor_cost',
  'total labor': 'labor_cost',
  'total payroll': 'labor_cost',
  'salaries and wages': 'labor_cost',
  'total salaries': 'labor_cost',
  'employee benefits': 'benefits_cost',
  'payroll taxes': 'benefits_cost',
  'health insurance': 'benefits_cost',
  'workers comp': 'benefits_cost',
  'rn wages': 'core_labor',
  'lpn wages': 'core_labor',
  'cna wages': 'core_labor',
  'staff wages': 'core_labor',
  'nursing staff wages': 'core_labor',
  'agency expense': 'agency_labor',
  'contract labor': 'agency_labor',
  'temp staffing': 'agency_labor',
  'agency nursing': 'agency_labor',
  'temporary labor': 'agency_labor',
  'travel nursing': 'agency_labor',

  // Other expenses
  'dietary': 'food_cost',
  'food service': 'food_cost',
  'raw food': 'food_cost',
  'food cost': 'food_cost',
  'medical supplies': 'supplies_cost',
  'nursing supplies': 'supplies_cost',
  'supplies': 'supplies_cost',
  'utilities': 'utilities_cost',
  'utility expense': 'utilities_cost',
  'electric': 'utilities_cost',
  'gas and electric': 'utilities_cost',
  'insurance': 'insurance_cost',
  'liability insurance': 'insurance_cost',
  'property insurance': 'insurance_cost',
  'gl insurance': 'insurance_cost',
  'management fee': 'management_fee',
  'admin fee': 'management_fee',
  'management company fee': 'management_fee',
  'property tax': 'property_tax',
  'real estate tax': 'property_tax',
  'rent': 'rent_expense',
  'lease payment': 'rent_expense',
  'base rent': 'rent_expense',
  'repairs and maintenance': 'maintenance_cost',
  'maintenance': 'maintenance_cost',
  'building maintenance': 'maintenance_cost',
  'capital expenditure': 'capex',
  'capex': 'capex',

  // Profitability
  'net operating income': 'noi',
  'operating income': 'noi',
  'income from operations': 'noi',
  'ebitda': 'ebitdar',
  'ebitdar': 'ebitdar',
  'net income': 'net_income',
  'net profit': 'net_income',
  'bottom line': 'net_income',

  // Census
  'census': 'average_daily_census',
  'adc': 'average_daily_census',
  'average census': 'average_daily_census',
  'patient days': 'average_daily_census',
  'resident days': 'average_daily_census',
  'occupancy': 'occupancy_rate',
  'occupancy rate': 'occupancy_rate',
  'occupancy %': 'occupancy_rate',
  'percent occupied': 'occupancy_rate',

  // Staffing metrics
  'hppd': 'hours_per_patient_day',
  'hours per patient day': 'hours_per_patient_day',
  'nursing hours': 'hours_per_patient_day',
  'fte': 'full_time_equivalents',
  'full time equivalents': 'full_time_equivalents',
  'headcount': 'full_time_equivalents',
};

// Market tier classification by state
export const STATE_MARKET_TIERS: Record<string, { tier: string; region: string; perBedRange: [number, number] }> = {
  'NY': { tier: 'tier_1', region: 'northeast', perBedRange: [75000, 150000] },
  'CA': { tier: 'tier_1', region: 'west_coast', perBedRange: [80000, 180000] },
  'IL': { tier: 'tier_1', region: 'midwest', perBedRange: [50000, 100000] },
  'TX': { tier: 'tier_1', region: 'southwest', perBedRange: [45000, 95000] },
  'DC': { tier: 'tier_1', region: 'northeast', perBedRange: [75000, 140000] },
  'MA': { tier: 'tier_1', region: 'northeast', perBedRange: [70000, 140000] },
  'AZ': { tier: 'tier_2', region: 'southwest', perBedRange: [45000, 90000] },
  'GA': { tier: 'tier_2', region: 'southeast', perBedRange: [40000, 85000] },
  'FL': { tier: 'tier_2', region: 'southeast', perBedRange: [45000, 95000] },
  'PA': { tier: 'tier_2', region: 'northeast', perBedRange: [55000, 110000] },
  'CO': { tier: 'tier_2', region: 'southwest', perBedRange: [50000, 95000] },
  'WA': { tier: 'tier_2', region: 'west_coast', perBedRange: [60000, 120000] },
  'OR': { tier: 'tier_2', region: 'west_coast', perBedRange: [55000, 110000] },
  'VA': { tier: 'tier_2', region: 'southeast', perBedRange: [50000, 100000] },
  'NJ': { tier: 'tier_2', region: 'northeast', perBedRange: [65000, 130000] },
  'CT': { tier: 'tier_2', region: 'northeast', perBedRange: [60000, 125000] },
  'MD': { tier: 'tier_2', region: 'northeast', perBedRange: [60000, 120000] },
  'MN': { tier: 'tier_2', region: 'midwest', perBedRange: [40000, 80000] },
  'NC': { tier: 'tier_2', region: 'southeast', perBedRange: [40000, 85000] },
  'TN': { tier: 'tier_2', region: 'southeast', perBedRange: [40000, 80000] },
  'OH': { tier: 'tier_2', region: 'midwest', perBedRange: [35000, 75000] },
  'ID': { tier: 'tier_3', region: 'northwest', perBedRange: [35000, 70000] },
  'MT': { tier: 'tier_3', region: 'northwest', perBedRange: [30000, 65000] },
  'WY': { tier: 'tier_3', region: 'northwest', perBedRange: [30000, 60000] },
  'ND': { tier: 'tier_3', region: 'midwest', perBedRange: [30000, 60000] },
  'SD': { tier: 'tier_3', region: 'midwest', perBedRange: [30000, 60000] },
  'NE': { tier: 'tier_3', region: 'midwest', perBedRange: [30000, 65000] },
  'KS': { tier: 'tier_3', region: 'midwest', perBedRange: [30000, 65000] },
  'IA': { tier: 'tier_3', region: 'midwest', perBedRange: [30000, 65000] },
  'MO': { tier: 'tier_3', region: 'midwest', perBedRange: [35000, 70000] },
  'AR': { tier: 'tier_3', region: 'southeast', perBedRange: [30000, 65000] },
  'MS': { tier: 'tier_3', region: 'southeast', perBedRange: [30000, 60000] },
  'AL': { tier: 'tier_3', region: 'southeast', perBedRange: [35000, 70000] },
  'LA': { tier: 'tier_3', region: 'southeast', perBedRange: [35000, 70000] },
  'OK': { tier: 'tier_3', region: 'southwest', perBedRange: [30000, 65000] },
  'NM': { tier: 'tier_3', region: 'southwest', perBedRange: [35000, 70000] },
  'NV': { tier: 'tier_3', region: 'west_coast', perBedRange: [45000, 90000] },
  'UT': { tier: 'tier_3', region: 'southwest', perBedRange: [40000, 80000] },
  'WI': { tier: 'tier_3', region: 'midwest', perBedRange: [35000, 70000] },
  'IN': { tier: 'tier_3', region: 'midwest', perBedRange: [35000, 70000] },
  'MI': { tier: 'tier_3', region: 'midwest', perBedRange: [35000, 75000] },
  'KY': { tier: 'tier_3', region: 'southeast', perBedRange: [35000, 70000] },
  'WV': { tier: 'tier_3', region: 'southeast', perBedRange: [30000, 60000] },
  'SC': { tier: 'tier_3', region: 'southeast', perBedRange: [35000, 75000] },
  'ME': { tier: 'tier_3', region: 'northeast', perBedRange: [40000, 80000] },
  'NH': { tier: 'tier_3', region: 'northeast', perBedRange: [45000, 90000] },
  'VT': { tier: 'tier_3', region: 'northeast', perBedRange: [40000, 80000] },
  'RI': { tier: 'tier_3', region: 'northeast', perBedRange: [50000, 100000] },
  'DE': { tier: 'tier_3', region: 'northeast', perBedRange: [50000, 95000] },
  'HI': { tier: 'tier_2', region: 'west_coast', perBedRange: [70000, 140000] },
  'AK': { tier: 'tier_3', region: 'northwest', perBedRange: [40000, 85000] },
};

export const DEFAULT_MARKET_TIER = { tier: 'tier_3', region: 'other', perBedRange: [35000, 70000] as [number, number] };

export function getStateMarketData(state: string): { tier: string; region: string; perBedRange: [number, number] } {
  return STATE_MARKET_TIERS[state?.toUpperCase()] || DEFAULT_MARKET_TIER;
}
