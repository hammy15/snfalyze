-- Deal Analysis Framework Database Schema
-- For Cascadia Healthcare SNFalyze Platform

-- Deals table - the core container for each deal
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id VARCHAR(20) UNIQUE NOT NULL, -- Human-readable ID like "CAS-2024-001"
  name VARCHAR(255) NOT NULL,

  -- Asset Information
  asset_types TEXT[] NOT NULL DEFAULT '{}', -- Array of 'snf', 'alf', 'ilf'
  is_portfolio BOOLEAN DEFAULT FALSE,
  facility_count INTEGER DEFAULT 1,
  total_beds INTEGER,
  states TEXT[] DEFAULT '{}',

  -- Deal Source & Timing
  source VARCHAR(50) NOT NULL, -- 'broker', 'seller_direct', 'off_market', 'auction', 'other'
  source_name VARCHAR(255),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_deadline DATE,

  -- Working Hypothesis
  initial_hypothesis VARCHAR(50) NOT NULL,
  current_hypothesis VARCHAR(50),
  hypothesis_updated_at TIMESTAMP,
  hypothesis_notes TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  current_stage VARCHAR(50) DEFAULT 'document_understanding',

  -- Financial Summary (populated during analysis)
  asking_price DECIMAL(15,2),
  normalized_t12_revenue DECIMAL(15,2),
  normalized_t12_ebitdar DECIMAL(15,2),
  implied_cap_rate DECIMAL(5,4),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  assigned_to TEXT[] DEFAULT '{}'
);

-- Analysis Stage Progress
CREATE TABLE IF NOT EXISTS deal_stage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by VARCHAR(255),
  notes TEXT,
  blockers TEXT[] DEFAULT '{}',

  UNIQUE(deal_id, stage)
);

-- Assumptions logged during analysis
CREATE TABLE IF NOT EXISTS deal_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,

  type VARCHAR(50) NOT NULL, -- 'minor', 'census', 'labor', 'regulatory', 'capital', 'market'
  description TEXT NOT NULL,
  value VARCHAR(255),
  rationale TEXT,

  confidence VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  impact VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'

  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Documents attached to deal
CREATE TABLE IF NOT EXISTS deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  size INTEGER,
  url TEXT,

  -- Extraction status
  extracted BOOLEAN DEFAULT FALSE,
  extraction_confidence DECIMAL(3,2),
  extracted_data JSONB,

  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by VARCHAR(255)
);

-- Risks identified during analysis
CREATE TABLE IF NOT EXISTS deal_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  mitigation TEXT,

  is_deal_breaker BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Final synthesis
CREATE TABLE IF NOT EXISTS deal_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE UNIQUE,

  -- Hypothesis Review
  final_hypothesis VARCHAR(50) NOT NULL,
  hypothesis_changed BOOLEAN DEFAULT FALSE,
  hypothesis_change_reason TEXT,

  -- Key Success Factors
  must_go_right_first TEXT[] DEFAULT '{}',
  cannot_go_wrong TEXT[] DEFAULT '{}',
  deal_breakers TEXT[] DEFAULT '{}',

  -- Valuation
  suggested_price_low DECIMAL(15,2),
  suggested_price_high DECIMAL(15,2),
  suggested_starting_point DECIMAL(15,2),
  valuation_rationale TEXT,

  -- Walk-Away
  walk_away_condition TEXT,
  walk_away_price DECIMAL(15,2),

  -- Confidence
  overall_confidence VARCHAR(20),
  confidence_factors TEXT[] DEFAULT '{}',

  -- Capital Partner View
  capital_partner_concerns TEXT[] DEFAULT '{}',
  capital_partner_price_adjustment DECIMAL(15,2),

  -- Recommendation
  recommendation VARCHAR(50),
  recommendation_summary TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Deal Outcomes (for learning/memory)
CREATE TABLE IF NOT EXISTS deal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE UNIQUE,

  outcome VARCHAR(50) NOT NULL,
  final_price DECIMAL(15,2),
  close_date DATE,

  what_we_got_right TEXT[] DEFAULT '{}',
  what_we_got_wrong TEXT[] DEFAULT '{}',
  surprises TEXT[] DEFAULT '{}',

  comparable_deal_tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_current_stage ON deals(current_stage);
CREATE INDEX IF NOT EXISTS idx_deal_assumptions_deal_id ON deal_assumptions(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_risks_deal_id ON deal_risks(deal_id);

-- Update trigger for deals.updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_updated_at_trigger ON deals;
CREATE TRIGGER deals_updated_at_trigger
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();
