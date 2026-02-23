# SNF Ownership Intelligence Database Schema
## Comprehensive Ownership Landscape Database Structure

---

## Database Architecture Overview

This database schema is designed to capture, organize, and analyze skilled nursing facility and assisted living ownership data for strategic acquisition intelligence.

### Core Tables Structure:

---

## 1. OPERATORS TABLE
*Master list of all SNF/ALF operators*

```sql
CREATE TABLE operators (
    operator_id INT PRIMARY KEY AUTO_INCREMENT,
    operator_name VARCHAR(255) NOT NULL,
    operator_type ENUM('Public', 'Private', 'Private_Equity', 'Family_Owned', 'Non_Profit', 'REIT', 'Government'),
    parent_company VARCHAR(255),
    headquarters_city VARCHAR(100),
    headquarters_state CHAR(2),
    founded_year INT,
    ticker_symbol VARCHAR(10),
    website_url VARCHAR(255),
    total_facilities INT DEFAULT 0,
    total_beds INT DEFAULT 0,
    annual_revenue DECIMAL(15,2),
    ebitda_margin DECIMAL(5,2),
    debt_to_equity DECIMAL(5,2),
    acquisition_appetite ENUM('Active', 'Selective', 'Opportunistic', 'Inactive'),
    financial_strength ENUM('Strong', 'Moderate', 'Weak', 'Distressed'),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    data_quality_score INT DEFAULT 0,
    notes TEXT,
    INDEX idx_operator_type (operator_type),
    INDEX idx_state (headquarters_state),
    INDEX idx_beds (total_beds),
    INDEX idx_acquisition (acquisition_appetite)
);
```

## 2. FACILITIES TABLE
*Individual facility details*

```sql
CREATE TABLE facilities (
    facility_id INT PRIMARY KEY AUTO_INCREMENT,
    cms_provider_number VARCHAR(10) UNIQUE,
    facility_name VARCHAR(255) NOT NULL,
    operator_id INT,
    street_address VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    msa_name VARCHAR(150),
    facility_type ENUM('SNF', 'ALF', 'Memory_Care', 'CCRC', 'Independent_Living', 'Hybrid'),
    ownership_type ENUM('For_Profit', 'Non_Profit', 'Government'),
    bed_count INT,
    certified_beds INT,
    medicare_beds INT,
    medicaid_beds INT,
    private_pay_beds INT,
    occupancy_rate DECIMAL(5,2),
    average_daily_rate DECIMAL(8,2),
    star_rating DECIMAL(2,1),
    opened_date DATE,
    acquisition_date DATE,
    acquisition_price DECIMAL(15,2),
    annual_revenue DECIMAL(12,2),
    ebitda DECIMAL(12,2),
    financial_performance ENUM('Excellent', 'Good', 'Average', 'Below_Average', 'Poor'),
    condition_rating ENUM('Excellent', 'Good', 'Fair', 'Poor'),
    deferred_maintenance DECIMAL(12,2),
    longitude DECIMAL(10, 8),
    latitude DECIMAL(11, 8),
    last_survey_date DATE,
    deficiency_count INT DEFAULT 0,
    administrator_name VARCHAR(255),
    administrator_tenure_months INT,
    for_sale BOOLEAN DEFAULT FALSE,
    asking_price DECIMAL(15,2),
    listing_date DATE,
    days_on_market INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
    INDEX idx_operator (operator_id),
    INDEX idx_state (state),
    INDEX idx_msa (msa_name),
    INDEX idx_type (facility_type),
    INDEX idx_beds (bed_count),
    INDEX idx_star_rating (star_rating),
    INDEX idx_for_sale (for_sale)
);
```

## 3. MARKET_ANALYSIS TABLE
*Geographic market intelligence*

```sql
CREATE TABLE market_analysis (
    market_id INT PRIMARY KEY AUTO_INCREMENT,
    market_name VARCHAR(150) NOT NULL,
    market_type ENUM('MSA', 'State', 'County', 'Region'),
    state CHAR(2),
    total_facilities INT DEFAULT 0,
    total_beds INT DEFAULT 0,
    total_population INT,
    population_65_plus INT,
    population_85_plus INT,
    median_income DECIMAL(10,2),
    medicaid_reimbursement_rate DECIMAL(8,2),
    certificate_of_need BOOLEAN DEFAULT FALSE,
    market_concentration_hhi INT,
    concentration_level ENUM('Low', 'Moderate', 'High', 'Very_High'),
    top_operator_1 INT,
    top_operator_1_share DECIMAL(5,2),
    top_operator_2 INT,
    top_operator_2_share DECIMAL(5,2),
    top_operator_3 INT,
    top_operator_3_share DECIMAL(5,2),
    average_occupancy DECIMAL(5,2),
    average_daily_rate DECIMAL(8,2),
    new_supply_pipeline INT DEFAULT 0,
    acquisition_activity_score INT DEFAULT 0,
    regulatory_environment ENUM('Favorable', 'Neutral', 'Challenging', 'Restrictive'),
    demographic_growth_rate DECIMAL(5,2),
    market_attractiveness ENUM('Prime', 'Growth', 'Stable', 'Declining'),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (top_operator_1) REFERENCES operators(operator_id),
    FOREIGN KEY (top_operator_2) REFERENCES operators(operator_id),
    FOREIGN KEY (top_operator_3) REFERENCES operators(operator_id),
    INDEX idx_state (state),
    INDEX idx_concentration (concentration_level),
    INDEX idx_attractiveness (market_attractiveness)
);
```

## 4. TRANSACTIONS TABLE
*M&A and transaction tracking*

```sql
CREATE TABLE transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_date DATE,
    transaction_type ENUM('Acquisition', 'Merger', 'Asset_Sale', 'Bankruptcy', 'Closure', 'New_Development'),
    buyer_operator_id INT,
    seller_operator_id INT,
    facility_ids JSON, -- Array of facility IDs involved
    transaction_value DECIMAL(15,2),
    value_per_bed DECIMAL(10,2),
    total_beds_transacted INT,
    total_facilities_transacted INT,
    financing_type ENUM('Cash', 'Debt', 'Equity', 'Mixed', 'Unknown'),
    announced_date DATE,
    closed_date DATE,
    deal_status ENUM('Announced', 'Pending', 'Closed', 'Terminated'),
    strategic_rationale TEXT,
    geographic_markets JSON, -- Array of markets involved
    revenue_multiple DECIMAL(5,2),
    ebitda_multiple DECIMAL(5,2),
    integration_status ENUM('Not_Started', 'In_Progress', 'Completed', 'Challenged'),
    post_acquisition_performance ENUM('Exceeding', 'Meeting', 'Below', 'Poor', 'Too_Early'),
    data_source VARCHAR(255),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (buyer_operator_id) REFERENCES operators(operator_id),
    FOREIGN KEY (seller_operator_id) REFERENCES operators(operator_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_buyer (buyer_operator_id),
    INDEX idx_seller (seller_operator_id),
    INDEX idx_value (transaction_value),
    INDEX idx_status (deal_status)
);
```

## 5. ACQUISITION_TARGETS TABLE
*Strategic acquisition target tracking*

```sql
CREATE TABLE acquisition_targets (
    target_id INT PRIMARY KEY AUTO_INCREMENT,
    operator_id INT,
    facility_id INT, -- For single-facility targets
    target_name VARCHAR(255) NOT NULL,
    target_type ENUM('Single_Facility', 'Portfolio', 'Operator', 'Platform'),
    priority_tier ENUM('Tier_1_Strategic', 'Tier_2_Opportunistic', 'Tier_3_Platform'),
    total_beds INT,
    total_facilities INT,
    geographic_markets JSON,
    estimated_value DECIMAL(15,2),
    estimated_value_per_bed DECIMAL(10,2),
    ownership_structure VARCHAR(255),
    owner_motivation ENUM('Succession_Planning', 'Financial_Distress', 'Strategic_Exit', 'Opportunistic', 'Unknown'),
    likelihood_to_sell ENUM('High', 'Moderate', 'Low', 'Unknown'),
    timeline_to_market ENUM('0-6_Months', '6-12_Months', '1-2_Years', '2+_Years', 'Unknown'),
    key_decision_maker VARCHAR(255),
    contact_established BOOLEAN DEFAULT FALSE,
    relationship_strength ENUM('Strong', 'Moderate', 'Weak', 'None'),
    due_diligence_status ENUM('Not_Started', 'Preliminary', 'Full_DD', 'Completed'),
    strategic_fit_score INT DEFAULT 0, -- 1-10 scale
    financial_attractiveness_score INT DEFAULT 0, -- 1-10 scale
    competitive_positioning_score INT DEFAULT 0, -- 1-10 scale
    overall_target_score INT DEFAULT 0, -- 1-10 scale
    last_contact_date DATE,
    next_action_date DATE,
    assigned_team_member VARCHAR(255),
    target_status ENUM('Active', 'On_Hold', 'Passed', 'Under_LOI', 'Closed'),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    INDEX idx_priority (priority_tier),
    INDEX idx_likelihood (likelihood_to_sell),
    INDEX idx_score (overall_target_score),
    INDEX idx_status (target_status),
    INDEX idx_timeline (timeline_to_market)
);
```

## 6. CONTACTS TABLE
*Industry relationship tracking*

```sql
CREATE TABLE contacts (
    contact_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(255),
    company VARCHAR(255),
    operator_id INT,
    email VARCHAR(255),
    phone VARCHAR(20),
    linkedin_url VARCHAR(255),
    contact_type ENUM('Owner', 'Executive', 'Administrator', 'Broker', 'Advisor', 'Other'),
    relationship_strength ENUM('Strong', 'Moderate', 'Weak', 'Cold'),
    influence_level ENUM('High', 'Medium', 'Low'),
    last_contact_date DATE,
    next_contact_date DATE,
    contact_frequency ENUM('Weekly', 'Monthly', 'Quarterly', 'Annually', 'As_Needed'),
    preferred_contact_method ENUM('Email', 'Phone', 'Text', 'LinkedIn', 'In_Person'),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
    INDEX idx_operator (operator_id),
    INDEX idx_relationship (relationship_strength),
    INDEX idx_influence (influence_level),
    INDEX idx_last_contact (last_contact_date)
);
```

## 7. MARKET_INTELLIGENCE TABLE
*Ongoing intelligence gathering*

```sql
CREATE TABLE market_intelligence (
    intel_id INT PRIMARY KEY AUTO_INCREMENT,
    intel_date DATE,
    intel_type ENUM('M&A_Rumor', 'Financial_Distress', 'Leadership_Change', 'Regulatory_Issue', 'Market_News', 'Competitor_Activity'),
    operator_id INT,
    facility_id INT,
    market_id INT,
    headline VARCHAR(255),
    summary TEXT,
    source VARCHAR(255),
    source_url VARCHAR(255),
    credibility_score INT DEFAULT 0, -- 1-10 scale
    strategic_importance ENUM('High', 'Medium', 'Low'),
    actionable BOOLEAN DEFAULT FALSE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    assigned_to VARCHAR(255),
    follow_up_date DATE,
    status ENUM('New', 'Under_Review', 'Actioned', 'Archived'),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    FOREIGN KEY (market_id) REFERENCES market_analysis(market_id),
    INDEX idx_intel_date (intel_date),
    INDEX idx_type (intel_type),
    INDEX idx_operator (operator_id),
    INDEX idx_importance (strategic_importance),
    INDEX idx_follow_up (follow_up_date)
);
```

## 8. FINANCIAL_PERFORMANCE TABLE
*Historical financial tracking*

```sql
CREATE TABLE financial_performance (
    performance_id INT PRIMARY KEY AUTO_INCREMENT,
    operator_id INT,
    facility_id INT,
    performance_period DATE, -- First day of reporting period
    period_type ENUM('Annual', 'Quarterly', 'Monthly'),
    revenue DECIMAL(15,2),
    gross_revenue DECIMAL(15,2),
    net_revenue DECIMAL(15,2),
    operating_expenses DECIMAL(15,2),
    labor_costs DECIMAL(15,2),
    ebitda DECIMAL(15,2),
    net_income DECIMAL(15,2),
    occupancy_rate DECIMAL(5,2),
    average_daily_rate DECIMAL(8,2),
    revenue_per_bed DECIMAL(10,2),
    expense_per_bed DECIMAL(10,2),
    staff_hours_per_resident_day DECIMAL(5,2),
    turnover_rate DECIMAL(5,2),
    quality_measures JSON, -- Various quality metrics
    regulatory_scores JSON, -- Star ratings, deficiencies, etc.
    data_source VARCHAR(255),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id),
    INDEX idx_operator (operator_id),
    INDEX idx_facility (facility_id),
    INDEX idx_period (performance_period),
    INDEX idx_period_type (period_type)
);
```

---

## Data Analysis Views

### 1. Market Opportunity Dashboard
```sql
CREATE VIEW market_opportunity_dashboard AS
SELECT 
    m.market_name,
    m.state,
    m.total_facilities,
    m.total_beds,
    m.market_concentration_hhi,
    m.concentration_level,
    m.average_occupancy,
    m.average_daily_rate,
    m.demographic_growth_rate,
    m.market_attractiveness,
    COUNT(at.target_id) as active_targets,
    AVG(at.overall_target_score) as avg_target_score
FROM market_analysis m
LEFT JOIN acquisition_targets at ON JSON_CONTAINS(at.geographic_markets, CONCAT('"', m.market_name, '"'))
WHERE at.target_status = 'Active'
GROUP BY m.market_id
ORDER BY m.market_attractiveness, m.demographic_growth_rate DESC;
```

### 2. Target Pipeline Summary
```sql
CREATE VIEW target_pipeline_summary AS
SELECT 
    priority_tier,
    COUNT(*) as target_count,
    SUM(total_beds) as total_beds,
    AVG(estimated_value_per_bed) as avg_value_per_bed,
    SUM(estimated_value) as total_estimated_value,
    AVG(overall_target_score) as avg_target_score,
    COUNT(CASE WHEN likelihood_to_sell = 'High' THEN 1 END) as high_likelihood_count,
    COUNT(CASE WHEN contact_established = TRUE THEN 1 END) as contacts_established
FROM acquisition_targets
WHERE target_status = 'Active'
GROUP BY priority_tier
ORDER BY 
    CASE priority_tier 
        WHEN 'Tier_1_Strategic' THEN 1
        WHEN 'Tier_2_Opportunistic' THEN 2 
        WHEN 'Tier_3_Platform' THEN 3
    END;
```

### 3. Operator Competitive Analysis
```sql
CREATE VIEW operator_competitive_analysis AS
SELECT 
    o.operator_name,
    o.operator_type,
    o.headquarters_state,
    o.total_facilities,
    o.total_beds,
    o.acquisition_appetite,
    COUNT(DISTINCT f.state) as states_present,
    AVG(f.occupancy_rate) as avg_occupancy,
    AVG(f.star_rating) as avg_star_rating,
    COUNT(t_buyer.transaction_id) as acquisitions_last_2_years,
    SUM(t_buyer.total_beds_transacted) as beds_acquired_last_2_years
FROM operators o
LEFT JOIN facilities f ON o.operator_id = f.operator_id
LEFT JOIN transactions t_buyer ON o.operator_id = t_buyer.buyer_operator_id 
    AND t_buyer.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
WHERE o.total_beds >= 1000
GROUP BY o.operator_id
ORDER BY o.total_beds DESC;
```

### 4. Market Transaction Activity
```sql
CREATE VIEW market_transaction_activity AS
SELECT 
    m.market_name,
    m.state,
    COUNT(t.transaction_id) as transaction_count_2_years,
    SUM(t.total_beds_transacted) as beds_transacted_2_years,
    AVG(t.value_per_bed) as avg_value_per_bed,
    SUM(t.transaction_value) as total_transaction_value,
    COUNT(CASE WHEN t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR) THEN 1 END) as recent_activity
FROM market_analysis m
LEFT JOIN transactions t ON JSON_CONTAINS(t.geographic_markets, CONCAT('"', m.market_name, '"'))
    AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
    AND t.deal_status = 'Closed'
GROUP BY m.market_id
HAVING transaction_count_2_years > 0
ORDER BY beds_transacted_2_years DESC;
```

---

## Data Update Procedures

### 1. CMS Data Integration
```sql
-- Procedure to update facility data from CMS feeds
DELIMITER //
CREATE PROCEDURE UpdateCMSData()
BEGIN
    -- Update facility basic information
    -- Update star ratings
    -- Update ownership changes
    -- Update deficiency data
    UPDATE facilities SET last_updated = NOW() WHERE cms_provider_number IN (...);
END //
DELIMITER ;
```

### 2. Market Analysis Refresh
```sql
-- Procedure to recalculate market metrics
DELIMITER //
CREATE PROCEDURE RefreshMarketAnalysis()
BEGIN
    -- Recalculate HHI scores
    -- Update operator market shares
    -- Refresh demographic data
    -- Update concentration levels
    UPDATE market_analysis SET last_updated = NOW();
END //
DELIMITER ;
```

### 3. Target Scoring Updates
```sql
-- Procedure to refresh target scores based on latest data
DELIMITER //
CREATE PROCEDURE UpdateTargetScores()
BEGIN
    -- Recalculate strategic fit scores
    -- Update financial attractiveness scores
    -- Refresh competitive positioning scores
    -- Update overall target scores
    UPDATE acquisition_targets SET last_updated = NOW();
END //
DELIMITER ;
```

---

## Reporting Framework

### 1. Weekly Target Pipeline Report
- Active targets by priority tier
- Target score changes
- New intelligence gathered
- Contact activity summary
- Next actions required

### 2. Monthly Market Analysis Report
- Market concentration changes
- Transaction activity updates
- New target identification
- Competitive landscape shifts
- Demographic trend analysis

### 3. Quarterly Strategic Review Report
- Portfolio performance analysis
- Acquisition strategy effectiveness
- Market opportunity assessment
- Competitive positioning review
- Strategic plan updates

---

## Data Quality Management

### Quality Metrics:
- **Completeness Score**: Percentage of required fields populated
- **Freshness Score**: Recency of last update relative to data type
- **Accuracy Score**: Validation against external sources
- **Consistency Score**: Internal data relationship validation

### Data Sources Priority:
1. **Primary Sources**: Direct contact, site visits, financial statements
2. **Secondary Sources**: CMS data, industry reports, public filings
3. **Tertiary Sources**: News articles, industry publications, rumors

### Update Frequency:
- **Daily**: Market intelligence, transaction announcements
- **Weekly**: Target activity, contact updates, financial performance
- **Monthly**: Facility operations, market analysis, competitor tracking
- **Quarterly**: Strategic scores, market positioning, portfolio analysis

---

*Database Schema Version: 1.0*
*Last Updated: February 11, 2026*
*Next Review: May 11, 2026*