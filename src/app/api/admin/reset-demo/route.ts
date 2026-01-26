import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, capitalPartners, documents, financialPeriods, valuations } from '@/db/schema';
import { sql } from 'drizzle-orm';

// ============================================================================
// SNF DEALS (5 Complete Deals)
// ============================================================================
const snfDeals = [
  {
    name: 'Sunrise Senior Living Portfolio',
    status: 'due_diligence' as const,
    assetType: 'SNF' as const,
    askingPrice: '45000000',
    beds: 340,
    primaryState: 'TX',
    markets: ['Dallas-Fort Worth', 'Houston', 'Austin'],
    brokerName: 'Michael Chen',
    brokerFirm: 'Marcus & Millichap Healthcare',
    sellerName: 'Sunrise Holdings LLC',
    brokerCredibilityScore: 85,
    thesis: 'Strong regional portfolio with upside potential through operational improvements and Medicaid rate increases expected in Q2 2025.',
    confidenceScore: 78,
    analysisNarrative: `Portfolio Analysis Summary:

OPPORTUNITY: Sunrise is a well-established 3-facility SNF portfolio in high-growth Texas markets. Current ownership has struggled with staffing efficiency, presenting a clear value-add opportunity for an experienced operator.

KEY METRICS:
• Combined 340 licensed beds across 3 facilities
• Blended occupancy of 87% (market average is 85%)
• Medicare mix at 22% (below optimal 28-32%)
• EBITDAR margin of 12.8% (peer group: 14-18%)
• Labor costs running 5.2% above regional benchmarks

UPSIDE THESIS:
1. Texas Medicaid rate increase effective July 2025 adds ~$1.2M annual revenue
2. Medicare census optimization could add $2.8M revenue annually
3. Labor cost normalization saves $1.5M annually
4. Pro forma EBITDAR margin improves to 17.5%

RISKS:
• Austin facility has pending 2567 survey from October requiring $280K remediation
• Dallas facility nursing director retiring Q1 - succession plan needed
• Houston market becoming competitive with 2 new builds within 5 miles

RECOMMENDATION: Proceed to LOI at $42M with 10% holdback pending survey clearance.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Valley Healthcare Partners',
    status: 'under_loi' as const,
    assetType: 'SNF' as const,
    askingPrice: '28000000',
    beds: 220,
    primaryState: 'FL',
    markets: ['Tampa Bay', 'Orlando'],
    brokerName: 'Sarah Johnson',
    brokerFirm: 'Blueprint Healthcare Real Estate',
    sellerName: 'Valley Health Systems Inc.',
    brokerCredibilityScore: 92,
    thesis: 'Well-maintained facilities in high-growth Florida markets with strong Medicare mix and experienced management team willing to stay post-acquisition.',
    confidenceScore: 82,
    analysisNarrative: `Portfolio Analysis Summary:

OPPORTUNITY: Valley Healthcare represents a rare opportunity to acquire two premium SNFs in Florida's strongest markets with management continuity. Current operator is a retiring family with 30+ years operating history.

KEY METRICS:
• 220 beds across 2 facilities (120 Tampa, 100 Orlando)
• Medicare mix at 35% - exceptionally strong
• Medicaid mix at 45%, Private Pay at 20%
• Combined occupancy of 90% trailing 12 months
• 5-star CMS rating on Tampa facility, 4-star on Orlando
• EBITDAR margin of 18.2% (top quartile)
• Revenue per patient day of $385 (above market)

MANAGEMENT RETENTION:
Administrator (25 years) and DON (18 years) have agreed to 3-year employment contracts. This provides invaluable operational continuity and regulatory relationships.

MARKET DYNAMICS:
• Tampa Bay adding 180K seniors by 2030 (15% growth)
• Orlando market vacancy rate at historic low of 8%
• Certificate of Need state limits new competition
• Both facilities have strong hospital referral relationships

FINANCIAL HIGHLIGHTS:
• T12 Revenue: $18.4M
• T12 EBITDAR: $3.35M (18.2% margin)
• Historical capex averaging $450K/year
• No deferred maintenance identified

VALUATION:
• Asking: $28M (8.35x EBITDAR)
• Our bid: $26.5M (7.9x) accepted pending DD
• Implied cap rate: 11.2%

RECOMMENDATION: Close deal. This is institutional-quality with limited downside.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
  {
    name: 'Midwest Care Centers',
    status: 'new' as const,
    assetType: 'SNF' as const,
    askingPrice: '12000000',
    beds: 95,
    primaryState: 'OH',
    markets: ['Columbus'],
    brokerName: 'David Williams',
    brokerFirm: 'Senior Living Investment Brokerage',
    sellerName: 'Private Owner',
    brokerCredibilityScore: 78,
    thesis: 'Single-facility acquisition opportunity in underserved Columbus submarket. Building needs $1.5M in deferred maintenance but location fundamentals are strong.',
    confidenceScore: 65,
    analysisNarrative: `Initial Assessment:

SITUATION: Distressed single-facility SNF available due to owner health issues. Facility has experienced significant census decline over 18 months from 92% to 78% occupancy. Root cause appears to be management transition issues rather than fundamental market problems.

FACILITY PROFILE:
• 95 licensed beds (90 Medicare/Medicaid certified)
• Built 1998, last renovated 2015
• 43,000 SF on 3.2 acres
• CMS rating declined from 4-star to 3-star (staffing metrics driving decline)
• Current census: 74 residents

CAPITAL REQUIREMENTS:
• Roof replacement: $420K (deferred 3 years)
• HVAC system upgrades: $380K
• Kitchen equipment: $180K
• Cosmetic refresh: $520K
• Total capital needed: ~$1.5M

TURNAROUND POTENTIAL:
If census restored to 90%+ and staffing stabilized:
• Pro forma revenue: $8.2M (current: $6.1M)
• Pro forma EBITDAR: $1.3M (current: $0.6M)
• Stabilized value: $14-16M

RISKS:
• Significant execution risk in turnaround
• Ohio Medicaid rates among lowest in region
• 2 competing facilities within 3-mile radius
• Current staff morale issues reported

PRELIMINARY RECOMMENDATION:
Request detailed due diligence data. If numbers hold, consider offer at $10M with seller financing component for deferred maintenance.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Rocky Mountain Health Group',
    status: 'analyzing' as const,
    assetType: 'SNF' as const,
    askingPrice: '67000000',
    beds: 485,
    primaryState: 'CO',
    markets: ['Denver Metro', 'Colorado Springs', 'Fort Collins', 'Boulder'],
    brokerName: 'Jennifer Adams',
    brokerFirm: 'JLL Healthcare Capital Markets',
    sellerName: 'Rocky Mountain Healthcare Holdings LLC',
    brokerCredibilityScore: 94,
    thesis: 'Large Colorado portfolio from institutional seller divesting non-core assets. Premium markets with strong demographics and limited new supply.',
    confidenceScore: 71,
    analysisNarrative: `Portfolio Overview:

SELLER CONTEXT: Rocky Mountain Healthcare Holdings is a national REIT divesting smaller regional portfolios to focus on top-10 metro assets. This portfolio is well-maintained but non-strategic for their platform.

PORTFOLIO COMPOSITION:
1. Denver Metro - Highlands Rehab Center (145 beds, 5-star)
2. Colorado Springs - Peak View SNF (120 beds, 4-star)
3. Fort Collins - Northern Colorado Care (110 beds, 4-star)
4. Boulder - Flatirons Nursing & Rehab (110 beds, 4-star)

FINANCIAL SUMMARY:
• Combined T12 Revenue: $42.8M
• Combined T12 EBITDAR: $7.2M
• Blended EBITDAR margin: 16.8%
• Weighted average occupancy: 89%
• Medicare mix: 26%
• Private pay mix: 8%

MARKET STRENGTHS:
• Colorado among fastest-growing states for 65+ population
• Denver MSA adding 45K seniors annually
• Certificate of Need provides competition barrier
• Strong hospital systems drive referrals
• Higher-than-average reimbursement rates

CONCERNS:
• Asking price of $67M implies 9.3x EBITDAR - aggressive
• Labor market extremely tight in Front Range
• Recent minimum wage increases impacting margins
• Fort Collins facility has pending state survey

ANALYSIS IN PROGRESS:
• Requested detailed facility-level financials
• Site visits scheduled for next week
• Labor market analysis underway
• Reviewing historical survey performance`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Magnolia Southern Care',
    status: 'passed' as const,
    assetType: 'SNF' as const,
    askingPrice: '22000000',
    beds: 180,
    primaryState: 'GA',
    markets: ['Atlanta Metro', 'Savannah'],
    brokerName: 'Thomas Reynolds',
    brokerFirm: 'Berkadia Healthcare',
    sellerName: 'Magnolia Holdings Group',
    brokerCredibilityScore: 88,
    thesis: 'Initially attractive Georgia portfolio, but due diligence revealed significant regulatory and staffing challenges that exceed our risk tolerance.',
    confidenceScore: 45,
    analysisNarrative: `Deal Passed - Final Summary:

INITIAL ATTRACTION:
Appeared to be well-priced Georgia portfolio at $22M for 180 beds ($122K/bed). Strong Atlanta market exposure with growing demographics.

DUE DILIGENCE FINDINGS:

REGULATORY RED FLAGS:
• Atlanta facility has active IJ (Immediate Jeopardy) citation from September
• Civil Money Penalties totaling $180K in past 18 months
• Savannah facility on Special Focus Facility list
• Both facilities showing declining CMS ratings over 3 years

STAFFING CRISIS:
• RN turnover at 85% annually (market average: 45%)
• Current RN vacancy rate: 32%
• Relying heavily on agency staffing at 2.5x standard costs
• Recent NLRB union organizing petition filed at Atlanta facility

FINANCIAL DETERIORATION:
• T12 EBITDAR declining 18% YoY
• Occupancy dropped from 88% to 79% in 12 months
• Private pay census nearly eliminated
• Medicare managed care contracts being terminated

PHYSICAL CONDITION:
• Atlanta facility failed recent fire inspection
• Life safety system upgrades required: $650K
• Deferred maintenance estimated at $2.2M total

RECOMMENDATION:
Pass on this deal. The combination of regulatory issues, staffing challenges, and declining financial performance represents unacceptable risk. Would reconsider only if:
1. IJ citation fully resolved
2. Price reduced to $15M or below
3. Seller agrees to significant representations and warranties

Lessons learned documented for future Georgia market analysis.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
];

// ============================================================================
// ALF DEALS (4 Complete Deals)
// ============================================================================
const alfDeals = [
  {
    name: 'Coastal Living Group',
    status: 'closed' as const,
    assetType: 'ALF' as const,
    askingPrice: '62000000',
    beds: 480,
    primaryState: 'CA',
    markets: ['San Diego', 'Los Angeles', 'Orange County', 'Santa Barbara'],
    brokerName: 'Jennifer Martinez',
    brokerFirm: 'JLL Healthcare Capital Markets',
    sellerName: 'Coastal Senior Services Corp.',
    brokerCredibilityScore: 95,
    thesis: 'Premium ALF portfolio in high-barrier-to-entry California coastal markets. Strong private-pay resident base with average length of stay exceeding 36 months.',
    confidenceScore: 91,
    analysisNarrative: `CLOSED DEAL SUMMARY:

TRANSACTION DETAILS:
• Closed: November 15, 2024
• Final Price: $58.5M (reduced from $62M asking)
• Structure: Sale-leaseback with Senior Housing Trust
• Initial lease yield: 7.25%
• Lease term: 15 years with 2.5% annual escalators

PORTFOLIO HIGHLIGHTS:
• 4 premium ALF communities totaling 480 units
• Average building age: 8 years
• 94% stabilized occupancy
• Average monthly rent: $7,200 (well above market)
• Average length of stay: 38 months
• 98% private pay

INVESTMENT THESIS VALIDATED:
1. California coastal markets have highest barriers to entry
2. Private-pay model insulated from reimbursement risk
3. Affluent demographics support premium pricing
4. Management team with 20+ year track record retained

FINANCIAL PERFORMANCE:
• T12 Revenue: $31.2M
• T12 EBITDAR: $8.7M (28% margin)
• Revenue per occupied unit: $5,417/month
• Operating expense ratio: 72%

POST-CLOSING PERFORMANCE:
• Q4 2024 occupancy increased to 95.2%
• Implemented $200/month rate increase effective January
• Added memory care wing at La Jolla (12 units) under development
• All properties exceeding pro forma through Month 2`,
    dealStructure: 'sale_leaseback' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Heartland Senior Communities',
    status: 'due_diligence' as const,
    assetType: 'ALF' as const,
    askingPrice: '38000000',
    beds: 320,
    primaryState: 'AZ',
    markets: ['Phoenix Metro', 'Scottsdale', 'Tucson'],
    brokerName: 'Robert Anderson',
    brokerFirm: 'CBRE Healthcare',
    sellerName: 'Heartland Senior Living Inc.',
    brokerCredibilityScore: 90,
    thesis: 'Arizona ALF portfolio benefiting from massive in-migration of retirees. Strong fundamentals with room for operational improvement and rate optimization.',
    confidenceScore: 76,
    analysisNarrative: `Due Diligence Progress Report:

PORTFOLIO OVERVIEW:
• 4 ALF communities across Arizona's premier retirement markets
• Total capacity: 320 units
• Average community size: 80 units
• All purpose-built ALF (no conversions)
• Buildings average 12 years old

DEMOGRAPHIC TAILWINDS:
• Arizona adding 90K+ seniors annually
• Phoenix MSA ranked #1 for retiree in-migration
• Scottsdale affluent demographics ideal for private-pay
• Tucson growing as affordable alternative to Phoenix

CURRENT OPERATIONS:
• Blended occupancy: 86% (below market average of 89%)
• Average monthly rate: $5,100 (below market by ~$400)
• EBITDAR margin: 22% (peer group: 25-28%)
• Staff turnover at 55% (elevated)

VALUE CREATION OPPORTUNITIES:
1. Rate optimization: $400/unit increase = $1.5M annual revenue
2. Occupancy improvement to 92%: $1.8M additional revenue
3. Operating efficiency improvements: $600K savings potential
4. Memory care expansion at 2 communities: $2M revenue opportunity

DUE DILIGENCE STATUS:
✅ Financial review complete
✅ Site visits complete (all 4 properties)
✅ Environmental Phase I complete - no issues
🔄 Title review in progress
🔄 ALTA surveys ordered
⏳ Legal document review pending
⏳ Employee matters review pending

PRELIMINARY VALUATION:
• Current NOI: $3.8M
• Stabilized NOI (Year 3): $5.5M
• Entry cap rate: 10.0%
• Stabilized cap rate: 8.0%
• Recommended bid: $36M`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Pacific Northwest Senior Living',
    status: 'analyzing' as const,
    assetType: 'ALF' as const,
    askingPrice: '29000000',
    beds: 240,
    primaryState: 'WA',
    markets: ['Seattle Metro', 'Bellevue', 'Tacoma'],
    brokerName: 'Christine Park',
    brokerFirm: 'Newmark Healthcare',
    sellerName: 'PNW Senior Housing LLC',
    brokerCredibilityScore: 86,
    thesis: 'Seattle-area ALF portfolio from local developer seeking liquidity. Premium locations in supply-constrained market with strong tech-driven demographics.',
    confidenceScore: 68,
    analysisNarrative: `Initial Analysis:

MARKET CONTEXT:
The Seattle metro area has experienced significant ALF demand growth driven by the region's tech wealth and aging baby boomer population. New supply has been limited due to high construction costs and regulatory complexity.

PORTFOLIO COMPOSITION:
1. Bellevue Gardens (85 units) - Class A, built 2019
2. Seattle Heights (80 units) - Class B+, built 2014
3. Tacoma Senior Living (75 units) - Class B, built 2011

INITIAL OBSERVATIONS:

STRENGTHS:
• Premium locations in desirable neighborhoods
• Bellevue property is institutional quality
• Strong referral relationships with area hospitals
• Experienced on-site management teams

CONCERNS:
• Seattle market has seen rent growth deceleration
• Tech sector layoffs impacting local sentiment
• Tacoma property needs capital refresh ($800K est.)
• Seller motivation unclear - need to understand driver

PRELIMINARY FINANCIALS:
• Combined revenue: $15.8M
• Combined EBITDAR: $3.5M (22% margin)
• Weighted occupancy: 87%
• Average rate: $5,500/month

ANALYSIS WORKSTREAMS:
1. Deep dive on Tacoma property economics
2. Seattle supply pipeline analysis
3. Tech sector demographic impact study
4. Management team interviews scheduled
5. Historical occupancy trend analysis

TARGET TIMELINE:
• Complete initial analysis: 2 weeks
• Make go/no-go decision on site visits
• If proceeding, LOI target: 30 days`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
  {
    name: 'Sunshine State Assisted Living',
    status: 'new' as const,
    assetType: 'ALF' as const,
    askingPrice: '19500000',
    beds: 160,
    primaryState: 'FL',
    markets: ['Jacksonville', 'St. Augustine'],
    brokerName: 'William Thompson',
    brokerFirm: 'Walker & Dunlop',
    sellerName: 'First Coast Senior Care Inc.',
    brokerCredibilityScore: 82,
    thesis: 'Northeast Florida ALF portfolio in rapidly growing Jacksonville market. Family-owned operator seeking retirement exit with clean operations.',
    confidenceScore: 72,
    analysisNarrative: `New Deal Intake Summary:

DEAL SOURCE:
Received offering memorandum from Walker & Dunlop. Seller is second-generation family operator seeking retirement. Properties have been well-maintained with consistent reinvestment.

PORTFOLIO:
• Jacksonville ALF: 100 units, built 2008
• St. Augustine ALF: 60 units, built 2012
• Both properties RCFE licensed
• No memory care currently offered

HEADLINE METRICS:
• Combined capacity: 160 units
• Current occupancy: 91%
• Average monthly rate: $4,800
• Private pay: 85%
• Medicaid waiver: 15%
• T12 Revenue: $8.9M
• T12 EBITDAR: $2.0M (22.5% margin)

MARKET DYNAMICS:
• Jacksonville fastest-growing large city in Florida
• St. Augustine benefits from Jacksonville overflow
• Limited new ALF supply in immediate trade areas
• Strong in-migration from Northeast US

INITIAL SCREENING:
✅ Asset type: Target
✅ Market: Target
✅ Size: Within range
✅ Seller motivation: Clear (retirement)
⚠️ Price: Appears full at $122K/unit
⚠️ Margin: Below peer group (target: 25%+)

NEXT STEPS:
1. Request additional materials:
   - 3 years historical financials
   - Census detail by unit type
   - Staff roster and wage rates
   - Rent roll
   - Capital expenditure history
2. Schedule initial call with broker
3. Add to pipeline tracking`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
];

// ============================================================================
// ILF DEALS (4 Complete Deals)
// ============================================================================
const ilfDeals = [
  {
    name: 'Silver Horizons Retirement',
    status: 'due_diligence' as const,
    assetType: 'ILF' as const,
    askingPrice: '42000000',
    beds: 380,
    primaryState: 'NC',
    markets: ['Charlotte', 'Raleigh-Durham', 'Wilmington'],
    brokerName: 'Emily Richardson',
    brokerFirm: 'Cushman & Wakefield',
    sellerName: 'Silver Horizons Holdings LLC',
    brokerCredibilityScore: 91,
    thesis: 'High-quality ILF portfolio in North Carolina growth markets. Strong age-restricted housing demand with limited competition from new construction.',
    confidenceScore: 79,
    analysisNarrative: `Due Diligence Summary:

PORTFOLIO OVERVIEW:
Premium independent living portfolio across three of North Carolina's fastest-growing metros. All three communities feature resort-style amenities and active lifestyle programming.

PROPERTIES:
1. Silver Horizons Charlotte (150 units)
   - Class A property built 2017
   - 95% occupancy
   - Monthly rent: $3,200-$4,800
   - Full service dining included

2. Silver Horizons Raleigh (130 units)
   - Class A property built 2019
   - 93% occupancy
   - Monthly rent: $2,900-$4,200
   - Near Research Triangle

3. Silver Horizons Wilmington (100 units)
   - Class B+ property built 2014
   - 88% occupancy
   - Monthly rent: $2,600-$3,800
   - Coastal location premium

FINANCIAL PERFORMANCE:
• Combined T12 Revenue: $16.8M
• Combined T12 NOI: $6.7M
• NOI Margin: 40%
• Revenue per unit: $3,684/month
• Operating expense per unit: $2,214/month

COMPETITIVE POSITION:
• Charlotte: Only ILF with full-service dining model
• Raleigh: Benefiting from tech sector growth
• Wilmington: Beach proximity creates waiting list

DEMOGRAPHIC ANALYSIS:
• NC ranked #3 for retiree in-migration
• Charlotte MSA 65+ population growing 4.5%/year
• Triangle area has highest educational attainment
• Coastal counties seeing 6%+ senior growth

DUE DILIGENCE STATUS:
• Phase I environmental: Complete (no issues)
• Property condition reports: Complete
• Financial audit: In progress
• Lease file review: In progress
• Title/survey: Ordered

VALUATION ANALYSIS:
• Current NOI cap rate at ask: 6.3%
• Market cap rate for Class A ILF: 5.75-6.25%
• Implied value range: $40-44M
• Recommended offer: $40.5M`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Midwest Active Living Portfolio',
    status: 'under_loi' as const,
    assetType: 'ILF' as const,
    askingPrice: '28500000',
    beds: 420,
    primaryState: 'IL',
    markets: ['Chicago Suburbs', 'Naperville', 'Oak Brook'],
    brokerName: 'Kevin Murphy',
    brokerFirm: 'Marcus & Millichap',
    sellerName: 'Active Living Communities Inc.',
    brokerCredibilityScore: 85,
    thesis: 'Chicago suburban ILF portfolio with stable, affluent resident base. Properties benefit from high-income demographics and limited competitive supply.',
    confidenceScore: 81,
    analysisNarrative: `LOI Executed - Summary:

DEAL TERMS:
• Purchase Price: $27.5M (negotiated from $28.5M)
• Earnest Money: $1.5M
• Due Diligence Period: 60 days
• Closing Target: 75 days from effective date
• Financing Contingency: 45 days

PORTFOLIO:
• 5 ILF communities in affluent Chicago suburbs
• Total units: 420
• Average community size: 84 units
• All age-restricted (55+) housing
• No care services provided

LOCATION QUALITY:
All properties located in DuPage County, one of wealthiest counties in Illinois:
1. Naperville Village (95 units) - $175K median HH income
2. Oak Brook Residences (88 units) - $185K median HH income
3. Wheaton Senior Living (82 units) - $125K median HH income
4. Downers Grove Place (80 units) - $115K median HH income
5. Hinsdale Gardens (75 units) - $210K median HH income

FINANCIAL SUMMARY:
• Gross Potential Rent: $14.2M
• Economic Occupancy: 93%
• Effective Gross Income: $13.2M
• Operating Expenses: $5.8M
• NOI: $7.4M
• NOI Margin: 56%

KEY INVESTMENT MERITS:
1. High barriers to entry (limited land, strict zoning)
2. Affluent demographics support premium rents
3. Properties well-maintained with minimal capex needs
4. Long average tenancies (4.5 years)
5. Upside in rent through mark-to-market

RISKS IDENTIFIED:
• Illinois property tax risk
• Aging demographic within properties (avg age 78)
• Two properties built in 1990s need refresh
• Limited on-site amenities vs newer competition

FINANCING PLAN:
• Seeking 65% LTV conventional loan
• Targeting 5.5% rate on 10-year term
• Pre-approved with Regional Healthcare Finance`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Sun Valley Retirement Communities',
    status: 'analyzing' as const,
    assetType: 'ILF' as const,
    askingPrice: '55000000',
    beds: 550,
    primaryState: 'NV',
    markets: ['Las Vegas', 'Henderson', 'Summerlin'],
    brokerName: 'Daniel Kim',
    brokerFirm: 'Colliers Healthcare',
    sellerName: 'Sun Valley Senior Enterprises',
    brokerCredibilityScore: 83,
    thesis: 'Large Las Vegas ILF portfolio benefiting from California out-migration. Tax-advantaged Nevada location attractive to retiring baby boomers.',
    confidenceScore: 67,
    analysisNarrative: `Initial Analysis Phase:

MARKET THESIS:
Las Vegas has emerged as a top retirement destination due to favorable tax environment (no state income tax), lower cost of living than California, and year-round sunshine. The city is experiencing significant in-migration from California retirees.

PORTFOLIO DETAILS:
• 6 ILF communities across Las Vegas valley
• Total units: 550
• Mix of rental and ownership models
• Properties range from 2008-2020 construction

COMMUNITY BREAKDOWN:
1. Summerlin Vistas (120 units) - Premium location
2. Henderson Heights (100 units) - Age-restricted HOA
3. Las Vegas Senior Village (95 units) - Value segment
4. Green Valley Estates (90 units) - Golf course adjacent
5. Paradise Palms (75 units) - Close to Strip entertainment
6. Centennial Pines (70 units) - Newer construction

PRELIMINARY FINANCIALS:
• Gross Revenue: $24.5M
• Operating Expenses: $13.2M
• NOI: $11.3M
• NOI Margin: 46%
• Average rent: $2,800/month

CONCERNS TO INVESTIGATE:
1. Las Vegas heat concerns for senior residents
2. Healthcare infrastructure in outlying communities
3. HOA model creates complexity in ownership structures
4. Several properties not purpose-built for seniors
5. Mixed ownership/rental structures complicate valuation

ANALYSIS PRIORITIES:
• Detailed breakdown by ownership type
• Unit-level profitability analysis
• Market rent comparison study
• Capital needs assessment
• Nevada regulatory compliance review

PRELIMINARY VIEW:
Interesting scale opportunity but complexity is high. Need to understand how ownership units would be valued vs rental units. Initial cap rate appears attractive at 4.9% but need to normalize for model differences.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
  {
    name: 'New England Active Adult',
    status: 'closed' as const,
    assetType: 'ILF' as const,
    askingPrice: '31000000',
    beds: 260,
    primaryState: 'MA',
    markets: ['Boston Metro', 'Cape Cod', 'Worcester'],
    brokerName: 'Susan Walsh',
    brokerFirm: 'Newmark',
    sellerName: 'New England Senior Housing Corp.',
    brokerCredibilityScore: 89,
    thesis: 'Closed acquisition of well-located Massachusetts ILF portfolio. Strong institutional quality with stable cash flows and limited capex requirements.',
    confidenceScore: 88,
    analysisNarrative: `CLOSED DEAL SUMMARY:

TRANSACTION COMPLETED:
• Closing Date: September 30, 2024
• Final Purchase Price: $29.8M
• Discount from Ask: 3.9%
• Financing: 60% LTV at 5.75% fixed, 10-year term

PORTFOLIO ACQUIRED:
1. Brookline Senior Residences (95 units)
   - Built 2015, Class A
   - 96% occupied at closing
   - Average rent: $4,200/month

2. Cape Cod Retirement Village (90 units)
   - Built 2018, Class A
   - 94% occupied at closing
   - Seasonal demand boost May-October

3. Worcester Senior Commons (75 units)
   - Built 2012, Class B+
   - 91% occupied at closing
   - Value-oriented positioning

INVESTMENT THESIS VALIDATED:
• Massachusetts has oldest population in US
• High barriers to entry in Boston metro
• Cape Cod has unique seasonal appeal
• Strong rental growth potential (3.5%/year)

CLOSING FINANCIALS:
• T12 Revenue: $11.8M
• T12 NOI: $5.4M
• NOI Margin: 46%
• In-place cap rate: 5.7%

POST-ACQUISITION PLAN:
1. Implement 5% rent increase (January 2025)
2. Add concierge services at Brookline
3. Expand Cape Cod common areas
4. Upgrade Worcester fitness center
5. Target NOI growth to $6.2M by Year 3

PERFORMANCE TO DATE:
• Occupancy stable at 94% blended
• November collections at 99.5%
• No deferred maintenance issues identified
• Staff retention 100% through transition`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
];

// ============================================================================
// HOSPICE DEALS (4 Complete Deals) - NEW!
// ============================================================================
const hospiceDeals = [
  {
    name: 'Comfort Care Hospice Network',
    status: 'due_diligence' as const,
    assetType: 'HOSPICE' as const,
    askingPrice: '35000000',
    beds: 0, // Hospice uses census, not beds
    primaryState: 'TX',
    markets: ['Houston', 'Dallas-Fort Worth', 'San Antonio', 'Austin'],
    brokerName: 'Richard Hayes',
    brokerFirm: 'VMG Health',
    sellerName: 'Comfort Care Holdings LLC',
    brokerCredibilityScore: 92,
    thesis: 'Premier Texas hospice network with strong Medicare census and efficient operations. Positioned for growth through geographic expansion and hospital partnerships.',
    confidenceScore: 77,
    analysisNarrative: `Due Diligence Report:

COMPANY OVERVIEW:
Comfort Care is a well-established hospice provider with 15 years of operating history across Texas. The company serves approximately 850 patients daily across 4 major markets and has developed strong referral relationships with major hospital systems.

OPERATIONAL METRICS:
• Average Daily Census (ADC): 850 patients
• Admissions per month: 280
• Average Length of Stay: 72 days (below Medicare average of 92)
• Live Discharge Rate: 14% (healthy range)
• Staff to patient ratio: 1:12

PAYER MIX:
• Medicare: 88%
• Medicaid: 7%
• Private Insurance: 4%
• Private Pay: 1%

CARE LEVEL DISTRIBUTION:
• Routine Home Care: 94%
• Continuous Home Care: 2%
• General Inpatient: 3%
• Respite: 1%

FINANCIAL PERFORMANCE:
• T12 Revenue: $58.2M
• Revenue per patient day: $188
• T12 EBITDA: $8.7M (15% margin)
• Medicare cap utilization: 82% (healthy buffer)

MEDICARE CAP ANALYSIS:
• 2024 Medicare cap per beneficiary: $33,494
• Total Medicare beneficiaries served: 1,420
• Aggregate cap: $47.6M
• Medicare revenue: $39.2M
• Cap utilization: 82.4% ✅

REFERRAL SOURCES:
• Hospital systems: 45%
• Physician offices: 28%
• Skilled nursing facilities: 15%
• Assisted living: 8%
• Other: 4%

KEY RELATIONSHIPS:
• Memorial Hermann Health System (Houston)
• Baylor Scott & White (Dallas)
• Methodist Healthcare (San Antonio)
• Seton Healthcare Family (Austin)

GROWTH OPPORTUNITIES:
1. Expand into underserved Rio Grande Valley
2. Add pediatric hospice service line
3. Develop SNF partnerships for GIP services
4. Implement palliative care program

DUE DILIGENCE STATUS:
✅ Financial verification complete
✅ Medicare billing audit - no issues
✅ State license review complete
🔄 Clinical quality review in progress
🔄 Employee matters review in progress
⏳ Environmental site assessments pending

VALUATION:
• Revenue multiple: 0.6x (in line with market)
• EBITDA multiple: 4.0x
• Recommended offer: $33M`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Serenity Hospice Group',
    status: 'under_loi' as const,
    assetType: 'HOSPICE' as const,
    askingPrice: '22000000',
    beds: 0,
    primaryState: 'FL',
    markets: ['Miami', 'Fort Lauderdale', 'West Palm Beach'],
    brokerName: 'Maria Santos',
    brokerFirm: 'HealthCare Appraisers',
    sellerName: 'Serenity Healthcare Services Inc.',
    brokerCredibilityScore: 87,
    thesis: 'South Florida hospice with strong demographics and established hospital relationships. Medicare-dominated payer mix with room for Medicaid expansion.',
    confidenceScore: 80,
    analysisNarrative: `LOI SUMMARY:

TRANSACTION TERMS:
• Purchase Price: $21M (negotiated from $22M)
• Structure: Asset purchase
• Earnest Money: $1.2M (refundable during DD)
• Due Diligence: 45 days
• Target Close: 60 days post DD completion

COMPANY PROFILE:
Serenity Hospice is a Medicare-certified hospice provider serving the tri-county South Florida market. Founded in 2010, the company has grown organically to become one of the largest independent hospices in the region.

KEY METRICS:
• Average Daily Census: 520 patients
• Monthly Admissions: 175
• Average Length of Stay: 68 days
• Live Discharge Rate: 11%
• Staff Count: 185 FTEs

GEOGRAPHIC COVERAGE:
• Miami-Dade County: 45% of census
• Broward County: 35% of census
• Palm Beach County: 20% of census

FINANCIAL SNAPSHOT:
• T12 Revenue: $35.8M
• Revenue per patient day: $189
• T12 EBITDA: $5.4M
• EBITDA Margin: 15%
• Medicare cap utilization: 78%

STRATEGIC FIT:
1. Complements existing Florida SNF operations
2. Provides continuum of care offering
3. Strong referral pipeline from owned facilities
4. Diversifies revenue streams

SYNERGY OPPORTUNITIES:
• Cross-referrals with 2 owned Florida SNFs: $1.5M revenue
• Shared back-office services: $400K savings
• Combined purchasing power: $200K savings
• Total identified synergies: $2.1M

RISKS:
• Florida Medicaid rates among lowest nationally
• Competitive market with national players
• Key employee retention critical
• Hurricane exposure for operations

NEXT STEPS:
1. Complete clinical operations review
2. Verify all Medicare certifications
3. Review staff contracts and compensation
4. Analyze referral source sustainability
5. Environmental due diligence`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Peaceful Journey Hospice',
    status: 'analyzing' as const,
    assetType: 'HOSPICE' as const,
    askingPrice: '15000000',
    beds: 0,
    primaryState: 'AZ',
    markets: ['Phoenix', 'Tucson', 'Mesa'],
    brokerName: 'James Wilson',
    brokerFirm: 'Houlihan Lokey',
    sellerName: 'Peaceful Journey Healthcare Inc.',
    brokerCredibilityScore: 84,
    thesis: 'Arizona hospice benefiting from retiree in-migration and aging population. Strong organic growth trajectory with opportunity to expand service area.',
    confidenceScore: 69,
    analysisNarrative: `INITIAL ANALYSIS:

MARKET OPPORTUNITY:
Arizona's explosive senior population growth creates compelling hospice demand fundamentals. Phoenix MSA has added 125,000 seniors in the past 5 years, with projections for continued 4%+ annual growth.

COMPANY BACKGROUND:
Peaceful Journey was founded in 2015 by former hospital administrators. The company has grown from 50 ADC to 320 ADC over 8 years through organic marketing and referral development.

CURRENT OPERATIONS:
• Average Daily Census: 320
• Monthly Admissions: 110
• Average Length of Stay: 84 days (slightly elevated)
• Live Discharge Rate: 16% (somewhat high)
• Medicare Patients: 92%

FINANCIAL OVERVIEW:
• T12 Revenue: $22.4M
• Revenue per patient day: $192
• T12 EBITDA: $2.9M
• EBITDA Margin: 13%

AREAS OF CONCERN:
1. ALOS of 84 days elevated vs. Medicare average of 68 days
2. Live discharge rate of 16% could attract audit attention
3. Limited General Inpatient capacity
4. Concentration in Phoenix (75% of census)

STRENGTHS:
• Clean Medicare billing history
• Strong administrator with 25 years experience
• Modern EMR system implemented 2023
• Good employee retention (25% annual turnover)

QUESTIONS FOR MANAGEMENT:
1. What drives the higher ALOS?
2. Plans for Tucson market expansion?
3. Interest in GIP unit development?
4. Key employee retention expectations?
5. Technology roadmap?

PRELIMINARY VALUATION:
• Asking price implies 5.2x EBITDA
• Industry comps suggest 4.0-5.0x for this size
• Quality concerns may warrant discount
• Preliminary range: $12-14M

NEXT STEPS:
• Schedule management presentation
• Request 3 years historical financials
• Obtain Medicare cap calculations
• Review patient mix by diagnosis
• Analyze geographic coverage map`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Midwest Compassion Hospice',
    status: 'new' as const,
    assetType: 'HOSPICE' as const,
    askingPrice: '18000000',
    beds: 0,
    primaryState: 'OH',
    markets: ['Cleveland', 'Columbus', 'Cincinnati'],
    brokerName: 'Patricia Nelson',
    brokerFirm: 'Sinaiko Healthcare Consulting',
    sellerName: 'Midwest Compassion Health Services',
    brokerCredibilityScore: 79,
    thesis: 'Ohio hospice with statewide presence and established hospital partnerships. Potential for margin improvement through operational optimization.',
    confidenceScore: 65,
    analysisNarrative: `NEW DEAL INTAKE:

DEAL SOURCE:
Received confidential information memorandum from Sinaiko Healthcare Consulting. Seller is a physician-led group seeking strategic partner for growth capital and operational support.

COMPANY SNAPSHOT:
• Founded: 2008
• Medicare Certification: All 3 locations certified
• State Licenses: Ohio hospice license current
• Accreditation: ACHC accredited

OPERATING STATISTICS:
• Average Daily Census: 410 patients
• Geographic Split:
  - Cleveland area: 180 ADC
  - Columbus area: 140 ADC
  - Cincinnati area: 90 ADC
• Monthly Admissions: 135
• Average Length of Stay: 78 days
• Live Discharge Rate: 13%

PRELIMINARY FINANCIALS:
• T12 Revenue: $28.5M
• Estimated EBITDA: $3.2M
• EBITDA Margin: 11% (below market of 13-15%)
• Revenue per patient day: $191

INITIAL OBSERVATIONS:

POSITIVES:
• Statewide presence creates scale advantages
• Long operating history indicates stability
• Hospital relationships with major systems
• Physician ownership may ease referrals

NEGATIVES:
• Below-market margins suggest inefficiencies
• Three separate markets creates complexity
• Cleveland market highly competitive
• Asking price appears full at 5.6x EBITDA

AREAS FOR INVESTIGATION:
1. Why are margins below peers?
2. Breakdown of costs by location
3. Staffing model efficiency
4. Technology infrastructure
5. Competitive dynamics in each market

SCREENING DECISION:
Proceed to next stage - request full data room access and schedule management call. Margin improvement opportunity could create significant value if execution risks manageable.`,
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
];

// Combine all deals
const allDeals = [...snfDeals, ...alfDeals, ...ilfDeals, ...hospiceDeals];

// ============================================================================
// FACILITIES DATA
// ============================================================================
const demoFacilities: Record<string, Array<{
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds: number;
  certifiedBeds: number;
  yearBuilt?: number;
  cmsRating?: number;
  occupancyRate?: number;
}>> = {
  // SNF Facilities
  'Sunrise Senior Living Portfolio': [
    { name: 'Sunrise at Preston Hollow', address: '8350 Park Lane', city: 'Dallas', state: 'TX', zipCode: '75231', assetType: 'SNF', licensedBeds: 120, certifiedBeds: 118, yearBuilt: 2008, cmsRating: 4, occupancyRate: 89 },
    { name: 'Sunrise of Katy', address: '1450 S Mason Rd', city: 'Katy', state: 'TX', zipCode: '77450', assetType: 'SNF', licensedBeds: 110, certifiedBeds: 110, yearBuilt: 2012, cmsRating: 4, occupancyRate: 87 },
    { name: 'Sunrise Health Austin', address: '5600 N Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78751', assetType: 'SNF', licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2015, cmsRating: 3, occupancyRate: 85 },
  ],
  'Valley Healthcare Partners': [
    { name: 'Valley Tampa Rehabilitation', address: '4200 N Dale Mabry Hwy', city: 'Tampa', state: 'FL', zipCode: '33614', assetType: 'SNF', licensedBeds: 120, certifiedBeds: 120, yearBuilt: 2010, cmsRating: 5, occupancyRate: 91 },
    { name: 'Valley Orlando Health Center', address: '2850 Sand Lake Rd', city: 'Orlando', state: 'FL', zipCode: '32819', assetType: 'SNF', licensedBeds: 100, certifiedBeds: 98, yearBuilt: 2014, cmsRating: 4, occupancyRate: 88 },
  ],
  'Midwest Care Centers': [
    { name: 'Columbus Care & Rehabilitation', address: '1280 Bethel Rd', city: 'Columbus', state: 'OH', zipCode: '43220', assetType: 'SNF', licensedBeds: 95, certifiedBeds: 90, yearBuilt: 1998, cmsRating: 3, occupancyRate: 78 },
  ],
  'Rocky Mountain Health Group': [
    { name: 'Highlands Rehab Center', address: '1500 High St', city: 'Denver', state: 'CO', zipCode: '80218', assetType: 'SNF', licensedBeds: 145, certifiedBeds: 145, yearBuilt: 2016, cmsRating: 5, occupancyRate: 92 },
    { name: 'Peak View SNF', address: '2200 Peak View Blvd', city: 'Colorado Springs', state: 'CO', zipCode: '80920', assetType: 'SNF', licensedBeds: 120, certifiedBeds: 118, yearBuilt: 2012, cmsRating: 4, occupancyRate: 88 },
    { name: 'Northern Colorado Care', address: '850 Lemay Ave', city: 'Fort Collins', state: 'CO', zipCode: '80524', assetType: 'SNF', licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2014, cmsRating: 4, occupancyRate: 87 },
    { name: 'Flatirons Nursing & Rehab', address: '3400 Broadway', city: 'Boulder', state: 'CO', zipCode: '80304', assetType: 'SNF', licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2018, cmsRating: 4, occupancyRate: 90 },
  ],
  'Magnolia Southern Care': [
    { name: 'Magnolia Atlanta Health', address: '3800 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zipCode: '30319', assetType: 'SNF', licensedBeds: 100, certifiedBeds: 95, yearBuilt: 2005, cmsRating: 2, occupancyRate: 75 },
    { name: 'Magnolia Savannah Center', address: '1200 Abercorn St', city: 'Savannah', state: 'GA', zipCode: '31401', assetType: 'SNF', licensedBeds: 80, certifiedBeds: 78, yearBuilt: 2008, cmsRating: 2, occupancyRate: 82 },
  ],
  // ALF Facilities
  'Coastal Living Group': [
    { name: 'Coastal La Jolla', address: '7550 Fay Ave', city: 'La Jolla', state: 'CA', zipCode: '92037', assetType: 'ALF', licensedBeds: 140, certifiedBeds: 140, yearBuilt: 2016, cmsRating: 5, occupancyRate: 95 },
    { name: 'Coastal Brentwood', address: '11900 San Vicente Blvd', city: 'Los Angeles', state: 'CA', zipCode: '90049', assetType: 'ALF', licensedBeds: 120, certifiedBeds: 118, yearBuilt: 2018, cmsRating: 5, occupancyRate: 93 },
    { name: 'Coastal Newport Beach', address: '350 Newport Center Dr', city: 'Newport Beach', state: 'CA', zipCode: '92660', assetType: 'ALF', licensedBeds: 110, certifiedBeds: 110, yearBuilt: 2014, cmsRating: 4, occupancyRate: 94 },
    { name: 'Coastal Santa Barbara', address: '1600 State St', city: 'Santa Barbara', state: 'CA', zipCode: '93101', assetType: 'ALF', licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2012, cmsRating: 4, occupancyRate: 92 },
  ],
  'Heartland Senior Communities': [
    { name: 'Heartland Phoenix', address: '4500 E Camelback Rd', city: 'Phoenix', state: 'AZ', zipCode: '85018', assetType: 'ALF', licensedBeds: 95, certifiedBeds: 95, yearBuilt: 2015, occupancyRate: 88 },
    { name: 'Heartland Scottsdale', address: '7500 E Doubletree Ranch Rd', city: 'Scottsdale', state: 'AZ', zipCode: '85258', assetType: 'ALF', licensedBeds: 85, certifiedBeds: 85, yearBuilt: 2018, occupancyRate: 91 },
    { name: 'Heartland Mesa', address: '1850 S Power Rd', city: 'Mesa', state: 'AZ', zipCode: '85206', assetType: 'ALF', licensedBeds: 70, certifiedBeds: 70, yearBuilt: 2012, occupancyRate: 82 },
    { name: 'Heartland Tucson', address: '5200 E Broadway Blvd', city: 'Tucson', state: 'AZ', zipCode: '85711', assetType: 'ALF', licensedBeds: 70, certifiedBeds: 70, yearBuilt: 2010, occupancyRate: 85 },
  ],
  'Pacific Northwest Senior Living': [
    { name: 'Bellevue Gardens', address: '1200 Bellevue Way NE', city: 'Bellevue', state: 'WA', zipCode: '98004', assetType: 'ALF', licensedBeds: 85, certifiedBeds: 85, yearBuilt: 2019, occupancyRate: 89 },
    { name: 'Seattle Heights', address: '500 E Pine St', city: 'Seattle', state: 'WA', zipCode: '98122', assetType: 'ALF', licensedBeds: 80, certifiedBeds: 78, yearBuilt: 2014, occupancyRate: 87 },
    { name: 'Tacoma Senior Living', address: '3200 S 23rd St', city: 'Tacoma', state: 'WA', zipCode: '98405', assetType: 'ALF', licensedBeds: 75, certifiedBeds: 75, yearBuilt: 2011, occupancyRate: 84 },
  ],
  'Sunshine State Assisted Living': [
    { name: 'Sunshine Jacksonville', address: '8200 Baymeadows Rd', city: 'Jacksonville', state: 'FL', zipCode: '32256', assetType: 'ALF', licensedBeds: 100, certifiedBeds: 100, yearBuilt: 2008, occupancyRate: 92 },
    { name: 'Sunshine St. Augustine', address: '150 Vilano Rd', city: 'St. Augustine', state: 'FL', zipCode: '32084', assetType: 'ALF', licensedBeds: 60, certifiedBeds: 60, yearBuilt: 2012, occupancyRate: 89 },
  ],
  // ILF Facilities
  'Silver Horizons Retirement': [
    { name: 'Silver Horizons Charlotte', address: '4400 Sharon Rd', city: 'Charlotte', state: 'NC', zipCode: '28211', assetType: 'ILF', licensedBeds: 150, certifiedBeds: 150, yearBuilt: 2017, occupancyRate: 95 },
    { name: 'Silver Horizons Raleigh', address: '2800 Glenwood Ave', city: 'Raleigh', state: 'NC', zipCode: '27608', assetType: 'ILF', licensedBeds: 130, certifiedBeds: 130, yearBuilt: 2019, occupancyRate: 93 },
    { name: 'Silver Horizons Wilmington', address: '1900 Eastwood Rd', city: 'Wilmington', state: 'NC', zipCode: '28403', assetType: 'ILF', licensedBeds: 100, certifiedBeds: 100, yearBuilt: 2014, occupancyRate: 88 },
  ],
  'Midwest Active Living Portfolio': [
    { name: 'Naperville Village', address: '1500 N Aurora Rd', city: 'Naperville', state: 'IL', zipCode: '60563', assetType: 'ILF', licensedBeds: 95, certifiedBeds: 95, yearBuilt: 1998, occupancyRate: 94 },
    { name: 'Oak Brook Residences', address: '700 Jorie Blvd', city: 'Oak Brook', state: 'IL', zipCode: '60523', assetType: 'ILF', licensedBeds: 88, certifiedBeds: 88, yearBuilt: 2002, occupancyRate: 92 },
    { name: 'Wheaton Senior Living', address: '450 W Roosevelt Rd', city: 'Wheaton', state: 'IL', zipCode: '60187', assetType: 'ILF', licensedBeds: 82, certifiedBeds: 82, yearBuilt: 1995, occupancyRate: 93 },
    { name: 'Downers Grove Place', address: '1200 Ogden Ave', city: 'Downers Grove', state: 'IL', zipCode: '60515', assetType: 'ILF', licensedBeds: 80, certifiedBeds: 80, yearBuilt: 1992, occupancyRate: 91 },
    { name: 'Hinsdale Gardens', address: '600 W Ogden Ave', city: 'Hinsdale', state: 'IL', zipCode: '60521', assetType: 'ILF', licensedBeds: 75, certifiedBeds: 75, yearBuilt: 2005, occupancyRate: 96 },
  ],
  'Sun Valley Retirement Communities': [
    { name: 'Summerlin Vistas', address: '2500 N Rampart Blvd', city: 'Las Vegas', state: 'NV', zipCode: '89145', assetType: 'ILF', licensedBeds: 120, certifiedBeds: 120, yearBuilt: 2018, occupancyRate: 87 },
    { name: 'Henderson Heights', address: '3000 St Rose Pkwy', city: 'Henderson', state: 'NV', zipCode: '89052', assetType: 'ILF', licensedBeds: 100, certifiedBeds: 100, yearBuilt: 2015, occupancyRate: 85 },
    { name: 'Las Vegas Senior Village', address: '5500 W Sahara Ave', city: 'Las Vegas', state: 'NV', zipCode: '89146', assetType: 'ILF', licensedBeds: 95, certifiedBeds: 95, yearBuilt: 2010, occupancyRate: 82 },
    { name: 'Green Valley Estates', address: '1800 Wigwam Pkwy', city: 'Henderson', state: 'NV', zipCode: '89074', assetType: 'ILF', licensedBeds: 90, certifiedBeds: 90, yearBuilt: 2012, occupancyRate: 89 },
    { name: 'Paradise Palms', address: '3800 Paradise Rd', city: 'Las Vegas', state: 'NV', zipCode: '89169', assetType: 'ILF', licensedBeds: 75, certifiedBeds: 75, yearBuilt: 2008, occupancyRate: 78 },
    { name: 'Centennial Pines', address: '6500 N Durango Dr', city: 'Las Vegas', state: 'NV', zipCode: '89149', assetType: 'ILF', licensedBeds: 70, certifiedBeds: 70, yearBuilt: 2020, occupancyRate: 92 },
  ],
  'New England Active Adult': [
    { name: 'Brookline Senior Residences', address: '300 Harvard St', city: 'Brookline', state: 'MA', zipCode: '02446', assetType: 'ILF', licensedBeds: 95, certifiedBeds: 95, yearBuilt: 2015, occupancyRate: 96 },
    { name: 'Cape Cod Retirement Village', address: '250 Main St', city: 'Hyannis', state: 'MA', zipCode: '02601', assetType: 'ILF', licensedBeds: 90, certifiedBeds: 90, yearBuilt: 2018, occupancyRate: 94 },
    { name: 'Worcester Senior Commons', address: '100 Front St', city: 'Worcester', state: 'MA', zipCode: '01608', assetType: 'ILF', licensedBeds: 75, certifiedBeds: 75, yearBuilt: 2012, occupancyRate: 91 },
  ],
  // HOSPICE Facilities (Offices/Locations)
  'Comfort Care Hospice Network': [
    { name: 'Comfort Care Houston', address: '2500 West Loop S', city: 'Houston', state: 'TX', zipCode: '77027', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Comfort Care Dallas', address: '5400 LBJ Freeway', city: 'Dallas', state: 'TX', zipCode: '75240', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Comfort Care San Antonio', address: '8000 IH-10 West', city: 'San Antonio', state: 'TX', zipCode: '78230', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Comfort Care Austin', address: '3600 N Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78756', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
  ],
  'Serenity Hospice Group': [
    { name: 'Serenity Miami', address: '9350 S Dixie Hwy', city: 'Miami', state: 'FL', zipCode: '33156', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Serenity Fort Lauderdale', address: '4800 N Federal Hwy', city: 'Fort Lauderdale', state: 'FL', zipCode: '33308', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Serenity West Palm Beach', address: '2400 Metrocentre Blvd', city: 'West Palm Beach', state: 'FL', zipCode: '33407', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
  ],
  'Peaceful Journey Hospice': [
    { name: 'Peaceful Journey Phoenix', address: '3300 N Central Ave', city: 'Phoenix', state: 'AZ', zipCode: '85012', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Peaceful Journey Tucson', address: '5055 E Broadway Blvd', city: 'Tucson', state: 'AZ', zipCode: '85711', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Peaceful Journey Mesa', address: '1620 S Stapley Dr', city: 'Mesa', state: 'AZ', zipCode: '85204', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
  ],
  'Midwest Compassion Hospice': [
    { name: 'Midwest Compassion Cleveland', address: '6100 Oak Tree Blvd', city: 'Cleveland', state: 'OH', zipCode: '44131', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Midwest Compassion Columbus', address: '4100 W Dublin Granville Rd', city: 'Columbus', state: 'OH', zipCode: '43017', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
    { name: 'Midwest Compassion Cincinnati', address: '312 Elm St', city: 'Cincinnati', state: 'OH', zipCode: '45202', assetType: 'HOSPICE', licensedBeds: 0, certifiedBeds: 0 },
  ],
};

// ============================================================================
// DOCUMENTS DATA
// ============================================================================
const demoDocuments: Record<string, Array<{
  filename: string;
  type: 'financial_statement' | 'rent_roll' | 'census_report' | 'staffing_report' | 'survey_report' | 'cost_report' | 'om_package' | 'lease_agreement' | 'appraisal' | 'environmental' | 'other';
  status: 'uploaded' | 'parsing' | 'analyzing' | 'extracting' | 'normalizing' | 'complete' | 'error';
  periodStart?: string;
  periodEnd?: string;
  extractionConfidence?: number;
}>> = {
  'Sunrise Senior Living Portfolio': [
    { filename: 'Sunrise_Portfolio_PL_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 92 },
    { filename: 'Sunrise_Census_Report_Q4_2024.xlsx', type: 'census_report', status: 'complete', periodStart: '2024-10-01', periodEnd: '2024-12-31', extractionConfidence: 88 },
    { filename: 'Sunrise_Offering_Memorandum.pdf', type: 'om_package', status: 'complete', extractionConfidence: 95 },
    { filename: 'Sunrise_Survey_History.pdf', type: 'survey_report', status: 'complete', extractionConfidence: 85 },
  ],
  'Valley Healthcare Partners': [
    { filename: 'Valley_Healthcare_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 89 },
    { filename: 'Valley_OM_Package.pdf', type: 'om_package', status: 'complete', extractionConfidence: 94 },
    { filename: 'Valley_Appraisal_Dec2024.pdf', type: 'appraisal', status: 'complete', extractionConfidence: 91 },
  ],
  'Midwest Care Centers': [
    { filename: 'Columbus_Care_TTM_PL.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-02-01', periodEnd: '2025-01-31', extractionConfidence: 78 },
    { filename: 'Columbus_Census_Monthly.xlsx', type: 'census_report', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 82 },
    { filename: 'Columbus_Offering_Package.pdf', type: 'om_package', status: 'complete', extractionConfidence: 86 },
  ],
  'Rocky Mountain Health Group': [
    { filename: 'RMHG_Consolidated_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 93 },
    { filename: 'RMHG_OM_Confidential.pdf', type: 'om_package', status: 'complete', extractionConfidence: 96 },
    { filename: 'RMHG_Census_By_Facility.xlsx', type: 'census_report', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 90 },
  ],
  'Coastal Living Group': [
    { filename: 'Coastal_Living_Audited_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 96 },
    { filename: 'Coastal_Portfolio_OM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 97 },
    { filename: 'Coastal_Appraisal_Report.pdf', type: 'appraisal', status: 'complete', extractionConfidence: 94 },
    { filename: 'Coastal_Lease_Agreement.pdf', type: 'lease_agreement', status: 'complete', extractionConfidence: 92 },
  ],
  'Heartland Senior Communities': [
    { filename: 'Heartland_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 88 },
    { filename: 'Heartland_OM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 91 },
  ],
  'Silver Horizons Retirement': [
    { filename: 'Silver_Horizons_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 90 },
    { filename: 'Silver_Horizons_OM_Final.pdf', type: 'om_package', status: 'complete', extractionConfidence: 93 },
    { filename: 'Silver_Horizons_Property_Reports.pdf', type: 'other', status: 'complete', extractionConfidence: 87 },
  ],
  'Midwest Active Living Portfolio': [
    { filename: 'Midwest_Active_Living_Financials.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 89 },
    { filename: 'Midwest_Active_OM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 92 },
  ],
  'New England Active Adult': [
    { filename: 'New_England_Audited_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 94 },
    { filename: 'New_England_OM_Confidential.pdf', type: 'om_package', status: 'complete', extractionConfidence: 95 },
  ],
  'Comfort Care Hospice Network': [
    { filename: 'Comfort_Care_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 91 },
    { filename: 'Comfort_Care_CIM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 94 },
    { filename: 'Comfort_Care_Medicare_Cost_Reports.pdf', type: 'other', status: 'complete', extractionConfidence: 88 },
  ],
  'Serenity Hospice Group': [
    { filename: 'Serenity_Hospice_Financials_2024.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 87 },
    { filename: 'Serenity_OM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 90 },
  ],
  'Peaceful Journey Hospice': [
    { filename: 'Peaceful_Journey_TTM.pdf', type: 'financial_statement', status: 'complete', periodStart: '2024-02-01', periodEnd: '2025-01-31', extractionConfidence: 82 },
    { filename: 'Peaceful_Journey_OM.pdf', type: 'om_package', status: 'complete', extractionConfidence: 86 },
  ],
  'Midwest Compassion Hospice': [
    { filename: 'Midwest_Compassion_CIM.pdf', type: 'om_package', status: 'uploaded', extractionConfidence: 0 },
    { filename: 'Midwest_Compassion_Financials_Summary.pdf', type: 'financial_statement', status: 'uploaded', periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 0 },
  ],
};

// ============================================================================
// CAPITAL PARTNERS
// ============================================================================
const demoPartners = [
  {
    name: 'Regional Healthcare Finance',
    type: 'lender' as const,
    assetTypes: ['SNF', 'ALF'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['TX', 'FL', 'OH', 'CA', 'PA', 'NY'],
    minDealSize: '5000000',
    maxDealSize: '75000000',
    targetYield: '0.085',
    maxLtv: '0.75',
    preferredStructure: 'Senior Secured Loan',
    termPreference: '5-7 years',
    riskTolerance: 'moderate' as const,
    contactName: 'Robert Thompson',
    contactEmail: 'rthompson@regionalhcf.com',
    notes: 'Strong appetite for stabilized SNF portfolios. Quick close capability with dedicated healthcare underwriting team.',
    status: 'active',
    minimumCoverageRatio: '1.35',
    preferredDealStructures: ['purchase', 'acquisition_financing'],
  },
  {
    name: 'Senior Housing Trust',
    type: 'reit' as const,
    assetTypes: ['SNF', 'ALF', 'ILF'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['CA', 'FL', 'TX', 'AZ', 'WA', 'OR'],
    minDealSize: '20000000',
    maxDealSize: '150000000',
    targetYield: '0.0725',
    preferredStructure: 'Sale-Leaseback',
    termPreference: '15-20 year triple net',
    riskTolerance: 'conservative' as const,
    contactName: 'Amanda Richards',
    contactEmail: 'arichards@seniorhousingtrust.com',
    notes: 'Public REIT focused on high-quality senior housing. Preference for coastal markets and Class A properties.',
    status: 'active',
    minimumCoverageRatio: '1.5',
    preferredDealStructures: ['sale_leaseback'],
    rentEscalation: '0.025',
  },
  {
    name: 'Carebridge Capital',
    type: 'equity' as const,
    assetTypes: ['SNF', 'ALF', 'HOSPICE'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['TX', 'FL', 'OH', 'PA', 'IL', 'GA'],
    minDealSize: '10000000',
    maxDealSize: '100000000',
    targetYield: '0.15',
    preferredStructure: 'JV Equity Partnership',
    termPreference: '5-7 year hold',
    riskTolerance: 'aggressive' as const,
    contactName: 'Marcus Johnson',
    contactEmail: 'mjohnson@carebridgecapital.com',
    notes: 'Value-add focused PE fund. Looking for 15%+ levered returns with operational upside. Recently added hospice to mandate.',
    status: 'active',
    minimumCoverageRatio: '1.1',
    preferredDealStructures: ['purchase'],
  },
  {
    name: 'MedCredit Partners',
    type: 'lender' as const,
    assetTypes: ['SNF', 'HOSPICE'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['OH', 'PA', 'MI', 'IN', 'WI', 'IL'],
    minDealSize: '3000000',
    maxDealSize: '40000000',
    targetYield: '0.095',
    maxLtv: '0.70',
    preferredStructure: 'Bridge to HUD/Fannie',
    termPreference: '2-3 years',
    riskTolerance: 'moderate' as const,
    contactName: 'Patricia Chen',
    contactEmail: 'pchen@medcreditpartners.com',
    notes: 'Specializes in Midwest healthcare lending. Active in hospice space post-COVID. Bridge loan focus with pathway to permanent financing.',
    status: 'active',
    minimumCoverageRatio: '1.25',
    preferredDealStructures: ['acquisition_financing'],
  },
  {
    name: 'Hospice Growth Partners',
    type: 'equity' as const,
    assetTypes: ['HOSPICE'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['TX', 'FL', 'AZ', 'CA', 'OH', 'PA', 'NC'],
    minDealSize: '8000000',
    maxDealSize: '60000000',
    targetYield: '0.18',
    preferredStructure: 'Majority Equity',
    termPreference: '4-6 year hold',
    riskTolerance: 'aggressive' as const,
    contactName: 'Dr. William Foster',
    contactEmail: 'wfoster@hospicegrowth.com',
    notes: 'Hospice-focused PE firm founded by former VITAS executive. Deep operational expertise. Seeking platforms for add-on acquisitions.',
    status: 'active',
    minimumCoverageRatio: '1.0',
    preferredDealStructures: ['purchase'],
  },
  {
    name: 'Pacific Senior Capital',
    type: 'lender' as const,
    assetTypes: ['ALF', 'ILF'] as ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[],
    geographies: ['CA', 'WA', 'OR', 'AZ', 'NV', 'HI'],
    minDealSize: '10000000',
    maxDealSize: '80000000',
    targetYield: '0.075',
    maxLtv: '0.70',
    preferredStructure: 'Fannie Mae Senior Housing',
    termPreference: '7-12 years',
    riskTolerance: 'conservative' as const,
    contactName: 'Jennifer Wong',
    contactEmail: 'jwong@pacificseniorcapital.com',
    notes: 'West Coast focused lender. Fannie Mae DUS lender with strong appetite for ALF and ILF. Quick execution for qualified borrowers.',
    status: 'active',
    minimumCoverageRatio: '1.30',
    preferredDealStructures: ['acquisition_financing', 'refinance'],
  },
];

// Cascadia Healthcare facilities from CHC Master Info (complete list)
const cascadiaFacilities = [
  // === OWNED FACILITIES ===
  { name: 'Clearwater Health', address: '1204 Shriver, Orofino, ID 83544', city: 'Orofino', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'CDA', address: '2514 N 7th St., CDA, ID 83814', city: 'Coeur d\'Alene', state: 'ID', assetType: 'SNF' as const, licensedBeds: 117, certifiedBeds: 83 },
  { name: 'The Cove SNF', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'SNF' as const, licensedBeds: 32, certifiedBeds: 32 },
  { name: 'The Cove ALF', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'ALF' as const, licensedBeds: 16, certifiedBeds: 16 },
  { name: 'Grangeville Health', address: 'Grangeville, Idaho', city: 'Grangeville', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'Cascadia of Lewiston', address: 'Lewiston, Idaho', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 34, certifiedBeds: 34 },
  { name: 'Libby Care', address: '308 E 3rd St., Libby, MT 59923', city: 'Libby', state: 'MT', assetType: 'SNF' as const, licensedBeds: 101, certifiedBeds: 89 },
  { name: 'Village Manor', address: '2060 NE 238th Dr., Wood Village, OR 97060', city: 'Wood Village', state: 'OR', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'Brookfield', address: '510 North Parkway Ave., Battle Ground, WA 98604', city: 'Battle Ground', state: 'WA', assetType: 'SNF' as const, licensedBeds: 83, certifiedBeds: 76 },
  { name: 'Colville Health', address: '1000 E Elep Ave, Colville, WA 99114', city: 'Colville', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, certifiedBeds: 92 },
  { name: 'Alderwood', address: '2726 Alderwood Avenue, Bellingham, WA 98225', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 102, certifiedBeds: 92 },
  { name: 'Snohomish Health', address: '800 10th Street, Snohomish, WA 98290', city: 'Snohomish', state: 'WA', assetType: 'SNF' as const, licensedBeds: 91, certifiedBeds: 91 },
  { name: 'Eagle Rock', address: '840 E Elva St, Idaho Falls, ID 83401', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 113, certifiedBeds: 113 },
  { name: 'Silverton Health', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'SNF' as const, licensedBeds: 50, certifiedBeds: 50 },
  { name: 'Paradise Creek', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 62, certifiedBeds: 62 },
  { name: 'Mountain View', address: '10 Mountain View Drive, Eureka, MT 59917', city: 'Eureka', state: 'MT', assetType: 'SNF' as const, licensedBeds: 49, certifiedBeds: 49 },
  { name: 'Curry Village', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'SNF' as const, licensedBeds: 59, certifiedBeds: 59 },
  { name: 'Creekside', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'SNF' as const, licensedBeds: 87, certifiedBeds: 56 },
  { name: 'Fairlawn', address: '3457 Division Street, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'SNF' as const, licensedBeds: 62, certifiedBeds: 62 },
  { name: 'Spokane Valley', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'SNF' as const, licensedBeds: 97, certifiedBeds: 97 },
  { name: 'Stafholt', address: '456 C Street, Blaine, WA 98230', city: 'Blaine', state: 'WA', assetType: 'SNF' as const, licensedBeds: 57, certifiedBeds: 57 },
  // Owned ILF
  { name: 'Silverton Retirement Living', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'ILF' as const, licensedBeds: 21, certifiedBeds: 21 },
  { name: 'Paradise Creek Retirement', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'ILF' as const, licensedBeds: 157, certifiedBeds: 157 },
  { name: 'Hillside Apartments', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'ILF' as const, licensedBeds: 13, certifiedBeds: 13 },
  { name: 'Creekside Retirement Living', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'ILF' as const, licensedBeds: 63, certifiedBeds: 63 },
  { name: 'Fairlawn Retirement', address: '1280 NE Kane Drive, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'ILF' as const, licensedBeds: 119, certifiedBeds: 119 },
  { name: 'Olympus Living of Spokane', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'ILF' as const, licensedBeds: 149, certifiedBeds: 149 },
  // Path to Ownership (Arizona)
  { name: 'Boswell', address: '10601 W Santa Fe Drive, Sun City AZ 85351', city: 'Sun City', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 115, certifiedBeds: 115 },
  { name: 'NorthPark', address: '2020 N 95th Ave, Phoenix, AZ 85037', city: 'Phoenix', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 54, certifiedBeds: 54 },

  // === LEASED FACILITIES ===
  { name: 'Shaw Mountain', address: '909 Reserve St., Boise, ID 83702', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 98, certifiedBeds: 98 },
  { name: 'Wellspring', address: '2105 12th Ave Rd., Nampa, ID 83686', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 120, certifiedBeds: 110 },
  { name: 'Canyon West', address: '2814 South Indiana Ave., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 103, certifiedBeds: 81 },
  { name: 'Mountain Valley', address: '601 West Cameron Ave., Kellogg, ID 83837', city: 'Kellogg', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, certifiedBeds: 68 },
  { name: 'Caldwell Care', address: '210 Cleveland Blvd., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, certifiedBeds: 66 },
  { name: 'Aspen Park', address: '420 Rowe St., Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 70, certifiedBeds: 66 },
  { name: 'Lewiston Transitional', address: '3315 8th St., Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 96, certifiedBeds: 71 },
  { name: 'Weiser Care', address: '331 East Park St., Weiser, ID 83672', city: 'Weiser', state: 'ID', assetType: 'SNF' as const, licensedBeds: 71, certifiedBeds: 62 },
  { name: 'The Orchards', address: '404 North Horton St., Nampa, ID 83651', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 100, certifiedBeds: 92 },
  { name: 'Cascadia of Nampa', address: '900 N Happy Valley Rd., Nampa, ID 83687', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, certifiedBeds: 99 },
  { name: 'Cascadia of Boise', address: '6000 W Denton St., Boise, ID 83706', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, certifiedBeds: 99 },
  { name: 'Twin Falls Transitional', address: '674 Eastland Drive, Twin Falls, ID 83301', city: 'Twin Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 116, certifiedBeds: 114 },
  { name: 'Arbor Valley', address: '8211 Ustick Rd, Boise, ID 83704', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 148, certifiedBeds: 148 },
  { name: 'Payette Health', address: '1019 3rd Avenue S., Payette, ID 83661', city: 'Payette', state: 'ID', assetType: 'SNF' as const, licensedBeds: 80, certifiedBeds: 60 },
  { name: 'Cherry Ridge', address: '501 W. Idaho Blvd., Emmett, ID 83617', city: 'Emmett', state: 'ID', assetType: 'SNF' as const, licensedBeds: 40, certifiedBeds: 38 },
  { name: 'Royal Plaza', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 63, certifiedBeds: 63 },
  { name: 'Royal Plaza Senior Living', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'ALF' as const, licensedBeds: 110, certifiedBeds: 110 },
  { name: 'Teton Healthcare', address: '3111 Channing Way, Idaho Falls, ID 83403', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 88, certifiedBeds: 78 },
  { name: 'Mount Ascension', address: '2475 Winne Ave, Helena, MT 59601', city: 'Helena', state: 'MT', assetType: 'SNF' as const, licensedBeds: 108, certifiedBeds: 108 },
  { name: 'Secora Rehab', address: '10435 SE Cora St., Portland, OR 97266', city: 'Portland', state: 'OR', assetType: 'SNF' as const, licensedBeds: 53, certifiedBeds: 53 },
  { name: 'Clarkston Health', address: '1242 11th St., Clarkston, WA 99403', city: 'Clarkston', state: 'WA', assetType: 'SNF' as const, licensedBeds: 90, certifiedBeds: 87 },
  { name: 'Hudson Bay', address: '8507 NE 8th Way, Vancouver, WA 98664', city: 'Vancouver', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, certifiedBeds: 89 },
  { name: 'Colfax Health', address: '1150 W. Fairview Street, Colfax, WA 99111', city: 'Colfax', state: 'WA', assetType: 'SNF' as const, licensedBeds: 55, certifiedBeds: 55 },
  { name: 'Highland', address: '2400 Samish Way, Bellingham, WA 98229', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 44, certifiedBeds: 44 },

  // === HOSPICE (Shores Hospice in San Diego) ===
  { name: 'Shores Hospice', address: '4350 La Jolla Village Dr', city: 'San Diego', state: 'CA', assetType: 'HOSPICE' as const, licensedBeds: 0, certifiedBeds: 0 },
];

export async function POST() {
  try {
    console.log('Starting database reset with comprehensive demo data...');

    // Clear all deals (cascades to related tables)
    await db.delete(deals);
    console.log('Cleared deals');

    // Clear facilities
    await db.delete(facilities);
    console.log('Cleared facilities');

    // Clear capital partners
    await db.delete(capitalPartners);
    console.log('Cleared capital partners');

    // Clear documents
    await db.delete(documents);
    console.log('Cleared documents');

    // Insert Cascadia facilities (standalone)
    for (const facility of cascadiaFacilities) {
      await db.insert(facilities).values(facility);
    }
    console.log(`Inserted ${cascadiaFacilities.length} Cascadia facilities`);

    // Insert all deals and their associated facilities/documents
    const dealIdMap: Record<string, string> = {};

    for (const deal of allDeals) {
      const [insertedDeal] = await db.insert(deals).values(deal).returning({ id: deals.id });
      dealIdMap[deal.name] = insertedDeal.id;
      console.log(`Inserted deal: ${deal.name} (${deal.assetType})`);

      // Insert facilities for this deal
      const dealFacilities = demoFacilities[deal.name];
      if (dealFacilities) {
        for (const facility of dealFacilities) {
          await db.insert(facilities).values({
            ...facility,
            dealId: insertedDeal.id,
          });
        }
        console.log(`  - ${dealFacilities.length} facilities`);
      }

      // Insert documents for this deal
      const dealDocs = demoDocuments[deal.name];
      if (dealDocs) {
        for (const doc of dealDocs) {
          await db.insert(documents).values({
            ...doc,
            dealId: insertedDeal.id,
            periodStart: doc.periodStart || null,
            periodEnd: doc.periodEnd || null,
          });
        }
        console.log(`  - ${dealDocs.length} documents`);
      }
    }

    // Insert capital partners
    for (const partner of demoPartners) {
      await db.insert(capitalPartners).values(partner);
    }
    console.log(`Inserted ${demoPartners.length} capital partners`);

    // Get counts
    const facilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    const dealCount = await db.select({ count: sql<number>`count(*)` }).from(deals);
    const partnerCount = await db.select({ count: sql<number>`count(*)` }).from(capitalPartners);
    const documentCount = await db.select({ count: sql<number>`count(*)` }).from(documents);

    // Count by asset type
    const snfCount = allDeals.filter(d => d.assetType === 'SNF').length;
    const alfCount = allDeals.filter(d => d.assetType === 'ALF').length;
    const ilfCount = allDeals.filter(d => d.assetType === 'ILF').length;
    const hospiceCount = allDeals.filter(d => d.assetType === 'HOSPICE').length;

    return NextResponse.json({
      success: true,
      message: 'Database reset complete with comprehensive demo data',
      data: {
        totalDeals: Number(dealCount[0].count),
        dealsByType: {
          SNF: snfCount,
          ALF: alfCount,
          ILF: ilfCount,
          HOSPICE: hospiceCount,
        },
        facilities: Number(facilityCount[0].count),
        documents: Number(documentCount[0].count),
        capitalPartners: Number(partnerCount[0].count),
      },
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const snfCount = snfDeals.length;
  const alfCount = alfDeals.length;
  const ilfCount = ilfDeals.length;
  const hospiceCount = hospiceDeals.length;

  return NextResponse.json({
    message: 'POST to this endpoint to reset the database with comprehensive demo data.',
    description: 'This will clear existing data and populate with fully-baked deals for each asset type.',
    demoData: {
      summary: {
        totalDeals: snfCount + alfCount + ilfCount + hospiceCount,
        dealsByType: { SNF: snfCount, ALF: alfCount, ILF: ilfCount, HOSPICE: hospiceCount },
      },
      snfDeals: snfDeals.map(d => `${d.name} - ${d.primaryState}, ${d.beds} beds, $${(parseInt(d.askingPrice)/1000000).toFixed(0)}M, ${d.status}`),
      alfDeals: alfDeals.map(d => `${d.name} - ${d.primaryState}, ${d.beds} units, $${(parseInt(d.askingPrice)/1000000).toFixed(0)}M, ${d.status}`),
      ilfDeals: ilfDeals.map(d => `${d.name} - ${d.primaryState}, ${d.beds} units, $${(parseInt(d.askingPrice)/1000000).toFixed(0)}M, ${d.status}`),
      hospiceDeals: hospiceDeals.map(d => `${d.name} - ${d.primaryState}, $${(parseInt(d.askingPrice)/1000000).toFixed(0)}M, ${d.status}`),
      partners: demoPartners.map(p => `${p.name} (${p.type}) - ${p.assetTypes.join(', ')}`),
    },
    warning: 'This action cannot be undone!',
  });
}
