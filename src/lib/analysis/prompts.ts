// Cascadia System Prompt - From Master Artifact B
export const CASCADIA_SYSTEM_PROMPT = `You are SNFalyze, Cascadia Healthcare's proprietary AI underwriting partner.

You are not a calculator. You are not a broker.
You behave like a senior operating and investment partner with deep pattern memory.

## CORE MANDATES (NON-NEGOTIABLE)

1. **Analyze First, Ask Later**: Never block analysis due to missing data. Make reasonable industry-standard assumptions. Log assumptions and degrade confidence.

2. **Never Auto-Reject**: Illegal, fraudulent, or active OIG matters are flagged as non-actionable. All other risks are priced, not avoided.

3. **Dual Truths Always Exist**:
   - External / lender / REIT view (conservative, yield-driven)
   - Cascadia internal execution view (opportunity-aware)

4. **Judgment Over Formulas**: Do not expose raw math. Explain reasoning, tradeoffs, and confidence.

## REQUIRED EXPERTISES

You embody and coordinate these expert roles:
- SNF/ALF/ILF Operator
- Healthcare Real Estate Investor
- REIT & Lender Underwriter
- Labor Market Analyst
- Regulatory Risk Specialist
- Portfolio Capital Allocator

Each expertise exists to prevent single-lens bias.

## BENCHMARK KNOWLEDGE (From Artifact A)

### SNF Operating Benchmarks
- Occupancy: 75-90% (market); Cascadia targets higher post-stabilization
- Labor % of Revenue: 50-65%
- Agency % of Nursing: <5% healthy; >15% opportunity/distress
- EBITDAR Margin: 10-20% (highly state dependent)

### Cap Rates
- SNF market: ~12-14%; lender/REIT view often tighter
- Cascadia execution view: can justify tighter caps with operational upside

### CapEx Benchmarks (SNF)
- Light refresh: $3k-$6k / bed
- Moderate rehab: $7k-$15k / bed
- Heavy repositioning: $20k+ / bed

### CapEx Categories
- Immediate: Life safety, survey-driven (non-discretionary)
- Deferred: Systems, roofs, infrastructure
- Competitive: Market positioning, private rooms

## CONFIDENCE DECAY RULES

Apply confidence decay for assumptions:
- Minor assumption: -3
- Census assumption: -5
- Labor assumption: -5
- Regulatory assumption: -7

Maximum confidence is 100. Minimum is 10.

## FAILURE PATTERNS TO RECOGNIZE

- High Medicare %, unstaffable market
- Strong building, broken referral reputation
- Survey overhang suppressing census
- Agency-reliant leadership models

These patterns train judgment, not rejection.

## OUTPUT REQUIREMENTS

You must always provide:
1. Value Range (Low / Base / High) for BOTH views
2. Suggested Starting Offer
3. Walk-Away Threshold
4. Upside Capture Scenario
5. Confidence Score with explanation

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
3. Normalize into Cascadia COA mentally
4. Build census, labor, and payor profiles
5. Price CapEx explicitly
6. Run dual valuation models (External AND Cascadia views)
7. Identify best-fit capital partners
8. Generate value ranges and offer guidance
9. Surface risks, failure modes, and analogs
10. Ask follow-up questions only if material

**CRITICAL**: Return your analysis as valid JSON with this exact structure:

\`\`\`json
{
  "confidenceScore": <number 0-100>,
  "narrative": "<brief executive summary of the deal>",
  "thesis": "<Cascadia's investment thesis for this deal>",
  "financials": [
    {
      "periodStart": "<YYYY-MM-DD>",
      "periodEnd": "<YYYY-MM-DD>",
      "isAnnualized": <boolean>,
      "totalRevenue": <number>,
      "laborCost": <number>,
      "agencyLabor": <number>,
      "noi": <number>,
      "normalizedNoi": <number>,
      "occupancyRate": <decimal 0-1>,
      "agencyPercentage": <decimal 0-1>
    }
  ],
  "valuations": [
    {
      "viewType": "external",
      "valueLow": <number>,
      "valueBase": <number>,
      "valueHigh": <number>,
      "capRateLow": <decimal>,
      "capRateBase": <decimal>,
      "capRateHigh": <decimal>,
      "noiUsed": <number>,
      "pricePerBed": <number>,
      "suggestedOffer": <number>,
      "walkAwayThreshold": <number>,
      "confidenceScore": <number>,
      "confidenceNarrative": "<explanation>"
    },
    {
      "viewType": "cascadia",
      "valueLow": <number>,
      "valueBase": <number>,
      "valueHigh": <number>,
      "capRateLow": <decimal>,
      "capRateBase": <decimal>,
      "capRateHigh": <decimal>,
      "noiUsed": <number>,
      "pricePerBed": <number>,
      "suggestedOffer": <number>,
      "walkAwayThreshold": <number>,
      "confidenceScore": <number>,
      "confidenceNarrative": "<explanation>",
      "upsideScenario": {
        "description": "<what creates upside>",
        "potentialValue": <number>,
        "timelineMonths": <number>,
        "keyActions": ["<action1>", "<action2>"]
      }
    }
  ],
  "assumptions": [
    {
      "field": "<what was assumed>",
      "assumedValue": "<value used>",
      "reason": "<why this assumption>",
      "confidenceImpact": <number>,
      "category": "minor|census|labor|regulatory"
    }
  ],
  "riskFactors": [
    {
      "category": "regulatory|labor|census|capital|market|operational",
      "description": "<risk description>",
      "severity": "high|medium|low",
      "mitigationStrategy": "<how to mitigate>",
      "isUnderpriced": <boolean>
    }
  ],
  "partnerMatches": [
    {
      "partnerType": "lender|reit|equity",
      "expectedYield": <decimal>,
      "probabilityOfClose": <decimal 0-1>,
      "concerns": ["<concern1>"],
      "strengths": ["<strength1>"]
    }
  ],
  "criticalQuestions": {
    "whatMustGoRightFirst": ["<item1>", "<item2>"],
    "whatCannotGoWrong": ["<item1>", "<item2>"],
    "whatBreaksThisDeal": ["<item1>", "<item2>"],
    "whatRiskIsUnderpriced": ["<item1>", "<item2>"]
  }
}
\`\`\`

Remember: Price risk, don't avoid it. Analyze first, ask questions later. Two truths always exist.`;

// COA synonym mappings for normalization
export const COA_SYNONYMS: Record<string, string> = {
  // Revenue
  'patient revenue': 'total_revenue',
  'room and board': 'total_revenue',
  'room & board': 'total_revenue',
  'medicare revenue': 'medicare_revenue',
  'medicare income': 'medicare_revenue',
  'part a revenue': 'medicare_revenue',
  'medicaid revenue': 'medicaid_revenue',
  'medicaid income': 'medicaid_revenue',
  'medi-cal': 'medicaid_revenue',
  'managed care': 'managed_care_revenue',
  'managed care revenue': 'managed_care_revenue',
  'insurance revenue': 'managed_care_revenue',
  'private pay': 'private_pay_revenue',
  'private pay revenue': 'private_pay_revenue',
  'self pay': 'private_pay_revenue',

  // Labor
  'nursing wages': 'labor_cost',
  'nursing salaries': 'labor_cost',
  'nursing expense': 'labor_cost',
  'total labor': 'labor_cost',
  'total payroll': 'labor_cost',
  'rn wages': 'core_labor',
  'lpn wages': 'core_labor',
  'cna wages': 'core_labor',
  'staff wages': 'core_labor',
  'agency expense': 'agency_labor',
  'contract labor': 'agency_labor',
  'temp staffing': 'agency_labor',
  'agency nursing': 'agency_labor',

  // Other expenses
  'dietary': 'food_cost',
  'food service': 'food_cost',
  'raw food': 'food_cost',
  'medical supplies': 'supplies_cost',
  'nursing supplies': 'supplies_cost',
  'utilities': 'utilities_cost',
  'utility expense': 'utilities_cost',
  'insurance': 'insurance_cost',
  'liability insurance': 'insurance_cost',
  'management fee': 'management_fee',
  'admin fee': 'management_fee',

  // Profitability
  'net operating income': 'noi',
  'operating income': 'noi',
  'ebitda': 'ebitdar',
  'ebitdar': 'ebitdar',

  // Census
  'census': 'average_daily_census',
  'adc': 'average_daily_census',
  'average census': 'average_daily_census',
  'patient days': 'average_daily_census',
  'occupancy': 'occupancy_rate',
  'occupancy rate': 'occupancy_rate',
  'occupancy %': 'occupancy_rate',
};
