# SNF Ownership Intelligence Implementation Plan
## 90-Day Systematic Intelligence Gathering and Database Population Strategy

---

## PHASE 1: FOUNDATION SETUP (Days 1-30)

### Week 1: Infrastructure Development

#### **Day 1-3: Database Setup**
- [ ] Deploy MySQL/PostgreSQL database instance
- [ ] Implement database schema from SNF_Ownership_Database_Schema.md
- [ ] Create initial indexes and constraints
- [ ] Set up automated backup procedures
- [ ] Establish data security protocols

#### **Day 4-5: Data Sources Identification**
- [ ] **Primary Government Sources:**
  - CMS Nursing Home Compare data API setup
  - State health department licensing databases
  - SEC EDGAR database access for public companies
  - Census Bureau demographic data integration

- [ ] **Industry Sources:**
  - AHCA/NCAL membership and data access
  - NIC (National Investment Center) research subscriptions
  - Irving Levin Associates transaction database
  - Skilled Nursing News publication monitoring

- [ ] **Financial Sources:**
  - Yahoo Finance API for public companies
  - Bloomberg Terminal access (if available)
  - Healthcare M&A advisory firm relationships
  - Private equity firm portfolio monitoring

#### **Day 6-7: Automation Framework**
- [ ] Set up web scraping infrastructure for public data
- [ ] Create automated data ingestion pipelines
- [ ] Establish data validation and quality checks
- [ ] Implement error handling and logging systems

### Week 2: Core Data Population

#### **Day 8-10: Operator Master File Creation**
```bash
# Priority 1: Top 50 National/Regional Operators
Target Operators for Initial Population:
1. Genesis Healthcare - 300+ facilities
2. Life Care Centers - 200+ facilities  
3. Ensign Group - 250+ facilities
4. HCR ManorCare - 150+ facilities
5. Trilogy Health Services - 120+ facilities
6. Skilled Healthcare Group - 90+ facilities
7. Signature HealthCARE - 100+ facilities
8. Petersen Health Care - 50+ facilities
9. Pruitt Health - 80+ facilities
10. American Senior Communities - 60+ facilities
[Continue for all 50 operators]
```

**Data Collection Process:**
- [ ] Web scraping of company websites for facility lists
- [ ] CMS Provider Data extraction for ownership mapping
- [ ] LinkedIn research for executive team information
- [ ] Financial data gathering from public sources
- [ ] Industry publication research for recent news/transactions

#### **Day 11-14: Facility Data Integration**
- [ ] **CMS Data Integration**: Download and process complete nursing home compare dataset
- [ ] **Geographic Coding**: Implement lat/long geocoding for all facilities
- [ ] **Market Assignment**: Map facilities to MSA/county geographic markets
- [ ] **Ownership Matching**: Link facilities to parent operators in database
- [ ] **Quality Metrics**: Import star ratings, deficiencies, inspection data

### Week 3: Market Analysis Development

#### **Day 15-17: Geographic Market Definition**
- [ ] **Primary Markets**: Top 50 MSAs by senior population
- [ ] **Secondary Markets**: High-growth suburban counties
- [ ] **Rural Markets**: State-level aggregation for rural facilities
- [ ] **Market Boundaries**: Consistent geographic definitions across data sources

#### **Day 18-21: Market Intelligence Baseline**
- [ ] **Demographic Analysis**: Population 65+, 85+, income levels by market
- [ ] **Competitive Mapping**: Market share calculations by operator
- [ ] **Concentration Analysis**: HHI calculations for each market
- [ ] **Supply Analysis**: Bed counts, occupancy rates, new development pipeline

### Week 4: Transaction Tracking Setup

#### **Day 22-24: Historical Transaction Database**
- [ ] **Irving Levin Data**: License and import 2022-2026 transaction data
- [ ] **News Scraping**: Automated monitoring of M&A announcements
- [ ] **Public Filing Monitoring**: SEC 8-K filings for material transactions
- [ ] **Industry Publication Tracking**: Skilled Nursing News, Modern Healthcare, etc.

#### **Day 25-28: Intelligence Monitoring System**
- [ ] **Google Alerts Setup**: Company names, key executives, market terms
- [ ] **LinkedIn Monitoring**: Executive job changes, company updates
- [ ] **Financial News Tracking**: Earnings releases, analyst reports
- [ ] **Regulatory Monitoring**: CMS updates, state regulatory changes

#### **Day 29-30: Quality Assurance and Testing**
- [ ] **Data Validation**: Cross-reference multiple sources for accuracy
- [ ] **System Testing**: End-to-end data flow testing
- [ ] **Performance Optimization**: Database indexing and query optimization
- [ ] **Documentation**: User guides and operational procedures

---

## PHASE 2: INTELLIGENCE GATHERING (Days 31-60)

### Week 5-6: Target Identification Framework

#### **Strategic Target Categories:**

##### **Tier 1 Strategic Targets (High Priority)**
**Identification Criteria:**
- Family-owned operators with 5+ facilities
- Operators approaching generational transitions (founders age 65+)
- Strong markets with barriers to entry
- EBITDA margins >15%, occupancy >85%
- Limited deferred maintenance issues

**Target Research Process:**
1. **Ownership Research**: Property records, business registrations, family trusts
2. **Financial Analysis**: Estimated revenue, profitability, debt levels
3. **Operational Assessment**: Quality ratings, occupancy trends, staff turnover
4. **Market Position**: Competitive advantages, referral relationships
5. **Succession Planning**: Family involvement, management succession plans

##### **Initial Target List (Week 5-6 Focus):**
```
Southeast Region:
- Regional Family Operations in GA, NC, SC (15-25 facilities each)
- Suburban Atlanta/Charlotte/Raleigh operators
- Legacy family businesses (2nd/3rd generation ownership)

Midwest Region:  
- Ohio Valley family operators (10-20 facilities)
- Indianapolis/Cincinnati suburban operators
- Wisconsin/Minnesota regional chains

Southwest Region:
- Texas suburban operators (Dallas, Houston, Austin metros)
- Oklahoma/Arkansas regional players
- New Mexico family operations
```

#### **Target Research Methodology:**

**Week 5: Southeast Region Deep Dive**
- [ ] **Day 31-33**: Georgia market mapping and target identification
- [ ] **Day 34-35**: North Carolina operator research
- [ ] **Day 36-37**: South Carolina and Florida panhandle analysis

**Week 6: Midwest Region Analysis**  
- [ ] **Day 38-40**: Ohio/Indiana/Michigan target identification
- [ ] **Day 41-42**: Illinois/Wisconsin operator mapping
- [ ] **Day 43-44**: Regional consolidation opportunity analysis

### Week 7-8: Competitive Intelligence Development

#### **Competitor Tracking Setup:**
- [ ] **Public Company Monitoring**: Quarterly earnings call transcriptions
- [ ] **Private Operator Tracking**: Industry conference attendance, speaking engagements
- [ ] **Acquisition Activity**: Real-time deal monitoring and analysis
- [ ] **Market Share Shifts**: Quarterly market position updates

#### **Intelligence Collection Framework:**

**Primary Intelligence Sources:**
1. **Industry Conferences**: AHCA, NIC, state association events
2. **Trade Publications**: Subscriber lists, article mentions, advertising spend
3. **Professional Networks**: LinkedIn relationship mapping
4. **Vendor Relationships**: Shared service providers, consultants
5. **Financial Advisors**: Investment bankers, business brokers

**Secondary Intelligence Sources:**
1. **Public Records**: Property transactions, litigation, licenses
2. **Media Monitoring**: Local news, industry publications
3. **Social Media**: Executive LinkedIn activity, company updates
4. **Regulatory Filings**: Quality reports, enforcement actions
5. **Financial Data**: Credit reports, vendor payment patterns

### Week 9-10: Relationship Mapping and Contact Development

#### **Contact Database Population:**

**Target Contact Categories:**
1. **Facility Owners**: Family members, partners, key decision makers
2. **Executive Team**: CEOs, COOs, CFOs, regional directors  
3. **Facility Administrators**: Site-level management, operations leaders
4. **Industry Advisors**: Healthcare attorneys, CPAs, consultants
5. **Intermediaries**: Business brokers, investment bankers, advisors

**Contact Development Strategy:**
- [ ] **Industry Events**: Conference attendance and networking
- [ ] **Professional Introductions**: Warm introductions through mutual contacts
- [ ] **Advisory Relationships**: Engagement with trusted industry advisors
- [ ] **Thought Leadership**: Content creation and industry participation
- [ ] **Direct Outreach**: Strategic cold outreach with value propositions

#### **Relationship Development Framework:**

**Week 9: Primary Contact Identification**
- [ ] **Day 59-61**: Executive team mapping for top 25 targets
- [ ] **Day 62-63**: Industry advisor relationship identification
- [ ] **Day 64-65**: Intermediary network development

**Week 10: Initial Outreach Strategy**
- [ ] **Day 66-68**: Warm introduction request deployment
- [ ] **Day 69-70**: Industry conference outreach preparation
- [ ] **Day 71-72**: Content strategy for thought leadership positioning

---

## PHASE 3: MARKET POSITIONING & ACTION (Days 61-90)

### Week 11-12: Target Engagement Execution

#### **Direct Outreach Campaign:**

**Tier 1 Target Engagement Process:**
1. **Research Phase**: Deep dive on specific target (2-3 days per target)
2. **Approach Strategy**: Customized value proposition development
3. **Initial Contact**: Executive-level introduction call
4. **Relationship Building**: Follow-up meetings and ongoing dialogue
5. **Opportunity Development**: Preliminary financial discussions

#### **Week 11 Action Items:**
- [ ] **Day 73-75**: Southeast region target outreach (5 targets)
- [ ] **Day 76-78**: Midwest region target outreach (5 targets)
- [ ] **Day 79**: Outreach results analysis and strategy refinement

#### **Week 12 Action Items:**
- [ ] **Day 80-82**: Second wave outreach execution (10 additional targets)
- [ ] **Day 83-84**: Industry conference attendance and networking
- [ ] **Day 85**: Relationship pipeline assessment and planning

### Week 13-14: Intelligence System Optimization

#### **System Performance Review:**
- [ ] **Data Quality Assessment**: Accuracy, completeness, timeliness metrics
- [ ] **Process Efficiency**: Automation opportunities, workflow optimization
- [ ] **Intelligence Value**: Decision support effectiveness, actionable insights
- [ ] **ROI Analysis**: Cost-benefit assessment of intelligence gathering efforts

#### **Continuous Improvement Implementation:**
- [ ] **Week 13 Focus**: Database optimization and reporting enhancement
- [ ] **Week 14 Focus**: Intelligence workflow automation and quality improvements

### Week 15: Strategic Planning and Next Phase Development

#### **90-Day Results Analysis:**
- [ ] **Target Pipeline Assessment**: Quality and quantity of identified opportunities
- [ ] **Market Intelligence Baseline**: Comprehensive market knowledge established
- [ ] **Relationship Development**: Contact database and engagement status
- [ ] **Competitive Positioning**: Market awareness and strategic advantages

#### **Next 90-Day Strategy Development:**
- [ ] **Phase 2 Planning**: Expansion of target markets and opportunity development
- [ ] **Due Diligence Preparation**: Framework development for active opportunities
- [ ] **Capital Strategy Refinement**: Financing approach and investment criteria
- [ ] **Team Development**: Skill building and resource allocation planning

---

## INTELLIGENCE GATHERING TOOLS & RESOURCES

### **Essential Software Stack:**

#### **Data Management:**
- **Database**: PostgreSQL or MySQL for core data storage
- **ETL Tools**: Python/Pandas for data processing and integration
- **BI Platform**: Tableau or Power BI for analytics and reporting
- **CRM System**: Salesforce or HubSpot for contact and pipeline management

#### **Intelligence Gathering:**
- **Web Scraping**: Beautiful Soup, Scrapy for automated data collection
- **News Monitoring**: Google Alerts, Mention.com for real-time monitoring
- **Social Media**: LinkedIn Sales Navigator for relationship mapping
- **Document Management**: SharePoint or Google Workspace for file organization

#### **Analysis Tools:**
- **Financial Modeling**: Excel with specialized healthcare valuation models
- **Geographic Analysis**: ArcGIS or QGIS for market mapping and analysis
- **Statistical Analysis**: R or Python for advanced analytics
- **Reporting**: Automated dashboard generation and executive reporting

### **Key Industry Resources:**

#### **Data Providers:**
1. **Irving Levin Associates**: Healthcare M&A transaction database
2. **National Investment Center (NIC)**: Senior housing market data
3. **AHCA/NCAL**: Industry benchmarking and operational data
4. **CMS**: Provider quality and ownership data
5. **Census Bureau**: Demographic and economic data

#### **Intelligence Sources:**
1. **Skilled Nursing News**: Industry news and transaction coverage
2. **Modern Healthcare**: Broad healthcare industry coverage
3. **McKnight's Senior Living**: Operational and regulatory news
4. **ASHA (American Seniors Housing Association)**: Market research
5. **Healthcare Finance News**: Financial and investment coverage

#### **Professional Networks:**
1. **AHCA/NCAL Conferences**: Annual convention and regional meetings
2. **NIC Conferences**: Spring and fall national conferences
3. **State Association Events**: Local networking and market intelligence
4. **Healthcare Finance Forums**: Investment and M&A focused events
5. **Senior Living Executive Networks**: Professional association meetings

---

## SUCCESS METRICS AND KPIs

### **Phase 1 (Days 1-30) Success Criteria:**
- [ ] Database fully operational with 95%+ uptime
- [ ] Core operator database populated (500+ operators)
- [ ] Facility database populated (15,000+ facilities)
- [ ] Market analysis framework operational (100+ markets)
- [ ] Automated data feeds functional

### **Phase 2 (Days 31-60) Success Criteria:**
- [ ] Strategic target database populated (100+ targets)
- [ ] Tier 1 target list identified (25+ high-priority targets)
- [ ] Contact database established (500+ industry contacts)
- [ ] Intelligence monitoring system operational
- [ ] Market opportunity assessment completed

### **Phase 3 (Days 61-90) Success Criteria:**
- [ ] Active target engagement initiated (15+ targets)
- [ ] Qualified opportunities identified (5+ serious prospects)
- [ ] Industry relationship network established
- [ ] Competitive market positioning achieved
- [ ] Pipeline for ongoing deal flow established

### **Ongoing Performance Metrics:**

#### **Database Quality Metrics:**
- **Data Completeness**: >90% of key fields populated
- **Data Freshness**: Updates within specified timeframes
- **Data Accuracy**: <5% error rate on key metrics
- **System Performance**: Query response times <3 seconds

#### **Intelligence Effectiveness Metrics:**
- **Target Identification Rate**: New qualified targets per month
- **Intelligence Actionability**: Percentage leading to business actions
- **Market Coverage**: Geographic and operator comprehensiveness
- **Predictive Accuracy**: Transaction prediction success rate

#### **Business Impact Metrics:**
- **Deal Flow Generation**: Opportunities entering active pipeline
- **Relationship Development**: New meaningful industry relationships
- **Market Share Intelligence**: Competitive positioning insights
- **Strategic Decision Support**: Intelligence-driven business decisions

---

## RISK MITIGATION AND CONTINGENCY PLANNING

### **Data Security and Compliance:**
- [ ] **HIPAA Compliance**: Healthcare data handling procedures
- [ ] **Data Privacy**: PII protection and consent management
- [ ] **Information Security**: Database access controls and encryption
- [ ] **Competitive Intelligence Ethics**: Legal and ethical guidelines

### **Operational Risk Management:**
- [ ] **Data Source Disruption**: Multiple source redundancy
- [ ] **System Failure**: Backup and disaster recovery procedures
- [ ] **Resource Constraints**: Outsourcing and automation strategies
- [ ] **Market Changes**: Adaptive intelligence framework

### **Quality Assurance Procedures:**
- [ ] **Data Validation**: Multi-source cross-verification
- [ ] **Regular Audits**: Monthly database quality reviews
- [ ] **Feedback Loops**: User feedback integration and improvement
- [ ] **Continuous Improvement**: Quarterly process optimization

---

*Implementation Plan Version: 1.0*
*Plan Start Date: February 11, 2026*
*Phase 1 Completion Target: March 13, 2026*
*Phase 2 Completion Target: April 12, 2026*
*Phase 3 Completion Target: May 12, 2026*