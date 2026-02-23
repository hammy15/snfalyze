# MEDICAID SPENDING DATA SOURCES FOR SNF FACILITIES

## ANALYSIS FOR OWEN: MEDICAID DOLLARS BY FACILITY

### Current Data in Our Database:
❌ **NO** - Our current database includes estimated Medicaid revenue percentages (61.8% of PPD revenue) but not actual total Medicaid dollars spent by CMS.

### Available Federal Data Sources:

#### 1. **CMS Provider Data** (Currently Downloaded)
- **What we have**: Facility details, ownership, quality ratings, census data
- **What's missing**: Actual Medicaid payments/spending per facility
- **Files**: NH_ProviderInfo_Jan2026.csv, NH_Ownership_Jan2026.csv

#### 2. **Medicare Provider Utilization and Payment Data**
- **URL**: https://data.cms.gov/provider-summary-by-type-of-service
- **Contains**: Actual Medicare payments by provider
- **Coverage**: Medicare Part A & B payments, but limited SNF Part A data

#### 3. **Medicaid State Drug Utilization Data**
- **URL**: https://data.medicaid.gov/
- **Contains**: State-level Medicaid spending, but not facility-specific

#### 4. **MSIS (Medicaid Statistical Information System)**
- **Managed by**: CMS Center for Medicaid and CHIP Services  
- **Contains**: Comprehensive Medicaid claims and spending data
- **Access**: Restricted - requires data use agreement with CMS
- **Facility-Level**: Yes, includes provider-specific spending

#### 5. **Nursing Home Compare Data** 
- **URL**: https://data.cms.gov/provider-data/dataset/4pq5-n9py
- **Contains**: Quality measures, some utilization data
- **Spending Data**: Limited financial information

### RECOMMENDATION:

**For Complete Medicaid Spending by Facility:**

1. **MSIS Data Request** - This is the gold standard
   - File formal data use agreement with CMS
   - Get actual Medicaid claims and payments by provider
   - 6-12 month approval process
   - Comprehensive facility-level spending data

2. **State Medicaid Agencies** - Alternative approach
   - Each state maintains provider payment data
   - FOIA requests to individual state Medicaid programs
   - Faster than MSIS but requires 50 separate requests

3. **Enhanced Estimation Model** - Immediate solution
   - Use census data + state Medicaid rates
   - Apply occupancy patterns and resident mix
   - Estimate based on bed-days and reimbursement rates

### CURRENT STATUS:
- ✅ Have comprehensive facility data (15,000+ facilities)
- ✅ Have quality and operational metrics  
- ❌ Missing actual Medicaid spending totals per facility
- ⚡ Can enhance database with estimated spending using census + rates

**Bottom Line: True Medicaid spending by facility requires MSIS data or state-by-state FOIA requests. Current public CMS data does not include facility-specific spending totals.**