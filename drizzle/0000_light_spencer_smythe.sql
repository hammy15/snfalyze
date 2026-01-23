CREATE TYPE "public"."agent_session_status" AS ENUM('active', 'paused', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."agent_tool_status" AS ENUM('pending', 'approved', 'rejected', 'executing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."analysis_stage_status" AS ENUM('pending', 'in_progress', 'completed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."analysis_stage_type" AS ENUM('document_upload', 'census_validation', 'revenue_analysis', 'expense_analysis', 'cms_integration', 'valuation_coverage');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('SNF', 'ALF', 'ILF');--> statement-breakpoint
CREATE TYPE "public"."assumption_category" AS ENUM('minor', 'census', 'labor', 'regulatory');--> statement-breakpoint
CREATE TYPE "public"."capex_category" AS ENUM('immediate', 'deferred', 'competitive');--> statement-breakpoint
CREATE TYPE "public"."clarification_status" AS ENUM('pending', 'resolved', 'skipped', 'auto_resolved');--> statement-breakpoint
CREATE TYPE "public"."clarification_type" AS ENUM('low_confidence', 'out_of_range', 'conflict', 'missing', 'validation_error');--> statement-breakpoint
CREATE TYPE "public"."conflict_resolution" AS ENUM('pending', 'use_first', 'use_second', 'use_average', 'manual_value', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('new', 'analyzing', 'reviewed', 'under_loi', 'due_diligence', 'closed', 'passed');--> statement-breakpoint
CREATE TYPE "public"."deal_structure" AS ENUM('purchase', 'lease', 'sale_leaseback', 'acquisition_financing');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'parsing', 'normalizing', 'analyzing', 'complete', 'error');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('financial_statement', 'rent_roll', 'census_report', 'staffing_report', 'survey_report', 'cost_report', 'om_package', 'lease_agreement', 'appraisal', 'environmental', 'other');--> statement-breakpoint
CREATE TYPE "public"."extraction_stage" AS ENUM('pending', 'in_progress', 'review_needed', 'complete');--> statement-breakpoint
CREATE TYPE "public"."folder_type" AS ENUM('financial', 'census', 'survey', 'legal', 'other');--> statement-breakpoint
CREATE TYPE "public"."mapping_method" AS ENUM('auto', 'suggested', 'manual');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('lender', 'reit', 'equity');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('extraction', 'normalization', 'validation', 'classification');--> statement-breakpoint
CREATE TYPE "public"."risk_tolerance" AS ENUM('conservative', 'moderate', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."scenario_type" AS ENUM('baseline', 'upside', 'downside', 'custom');--> statement-breakpoint
CREATE TYPE "public"."settings_category" AS ENUM('valuation', 'financial', 'risk', 'market', 'proforma', 'display');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."valuation_method" AS ENUM('cap_rate', 'price_per_bed', 'comparable_sales', 'dcf', 'noi_multiple', 'proprietary');--> statement-breakpoint
CREATE TYPE "public"."wizard_stage_type" AS ENUM('deal_structure_setup', 'facility_identification', 'document_organization', 'document_extraction', 'coa_mapping_review', 'financial_consolidation');--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"tokens_used" integer,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"user_id" varchar(255),
	"status" "agent_session_status" DEFAULT 'active',
	"context" jsonb,
	"system_prompt" text,
	"model" varchar(100) DEFAULT 'claude-sonnet-4-20250514',
	"total_tokens_used" integer DEFAULT 0,
	"message_count" integer DEFAULT 0,
	"started_at" timestamp with time zone DEFAULT now(),
	"last_active_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"message_id" uuid,
	"tool_name" varchar(100) NOT NULL,
	"tool_input" jsonb NOT NULL,
	"tool_output" jsonb,
	"status" "agent_tool_status" DEFAULT 'pending',
	"requires_confirmation" boolean DEFAULT false,
	"confirmed_by" varchar(255),
	"confirmed_at" timestamp with time zone,
	"error_message" text,
	"execution_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_adjustment_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"session_id" uuid,
	"suggestion_type" varchar(50) NOT NULL,
	"current_value" jsonb,
	"suggested_value" jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"confidence_score" integer,
	"based_on_deals" uuid[],
	"market_factors" jsonb,
	"status" "suggestion_status" DEFAULT 'pending',
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"impact_estimate" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "algorithm_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"preset_type" varchar(50) NOT NULL,
	"applicable_asset_types" "asset_type"[],
	"applicable_states" text[],
	"settings" jsonb NOT NULL,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp with time zone,
	"created_by" varchar(255),
	"is_public" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "algorithm_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"category" "settings_category" NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "analysis_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"stage" "analysis_stage_type" NOT NULL,
	"status" "analysis_stage_status" DEFAULT 'pending',
	"order" integer NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"pending_clarifications" integer DEFAULT 0,
	"stage_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"financial_period_id" uuid,
	"valuation_id" uuid,
	"field" varchar(255) NOT NULL,
	"original_value" text,
	"assumed_value" text NOT NULL,
	"reason" text,
	"confidence_impact" integer,
	"category" "assumption_category",
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capex_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"facility_id" uuid,
	"category" "capex_category" NOT NULL,
	"description" text,
	"estimated_cost" numeric(15, 2),
	"per_bed_cost" numeric(15, 2),
	"timeline" varchar(100),
	"priority" varchar(20),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capital_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "partner_type" NOT NULL,
	"asset_types" "asset_type"[],
	"geographies" text[],
	"min_deal_size" numeric(15, 2),
	"max_deal_size" numeric(15, 2),
	"target_yield" numeric(5, 4),
	"max_ltv" numeric(5, 4),
	"preferred_structure" varchar(100),
	"term_preference" varchar(100),
	"risk_tolerance" "risk_tolerance",
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"notes" text,
	"status" varchar(20) DEFAULT 'active',
	"minimum_coverage_ratio" numeric(5, 4),
	"preferred_deal_structures" text[],
	"lease_term_preference" varchar(50),
	"rent_escalation" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_provider_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ccn" varchar(20) NOT NULL,
	"provider_name" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(10),
	"phone_number" varchar(20),
	"ownership_type" varchar(50),
	"number_of_beds" integer,
	"average_residents_per_day" numeric(10, 2),
	"overall_rating" integer,
	"health_inspection_rating" integer,
	"staffing_rating" integer,
	"quality_measure_rating" integer,
	"reported_rn_hppd" numeric(5, 2),
	"reported_lpn_hppd" numeric(5, 2),
	"reported_cna_hppd" numeric(5, 2),
	"total_nursing_hppd" numeric(5, 2),
	"total_deficiencies" integer,
	"health_deficiencies" integer,
	"fire_deficiencies" integer,
	"is_sff" boolean DEFAULT false,
	"is_sff_candidate" boolean DEFAULT false,
	"special_focus_facility_date" date,
	"abuse_icon" boolean DEFAULT false,
	"incident_date" date,
	"fines_total" numeric(15, 2),
	"payment_denial_days" integer,
	"data_date" date,
	"synced_at" timestamp with time zone DEFAULT now(),
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cms_provider_data_ccn_unique" UNIQUE("ccn")
);
--> statement-breakpoint
CREATE TABLE "coa_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_term" varchar(255) NOT NULL,
	"cascadia_term" varchar(255) NOT NULL,
	"category" varchar(100),
	"subcategory" varchar(100),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comparable_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"asset_type" "asset_type",
	"beds" integer,
	"square_footage" integer,
	"sale_date" date,
	"sale_price" numeric(15, 2),
	"price_per_bed" numeric(15, 2),
	"cap_rate" numeric(5, 4),
	"noi_at_sale" numeric(15, 2),
	"occupancy_at_sale" numeric(5, 4),
	"buyer" varchar(255),
	"seller" varchar(255),
	"broker" varchar(255),
	"source" varchar(100),
	"notes" text,
	"verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_algorithm_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"category" "settings_category" NOT NULL,
	"key" varchar(255) NOT NULL,
	"override_value" jsonb NOT NULL,
	"original_value" jsonb,
	"reason" text,
	"source" varchar(50) DEFAULT 'manual',
	"suggested_by" varchar(255),
	"applied_by" varchar(255),
	"applied_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_coa_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"facility_id" uuid,
	"document_id" uuid,
	"source_label" varchar(500) NOT NULL,
	"source_value" numeric(15, 2),
	"source_month" varchar(20),
	"coa_code" varchar(20),
	"coa_name" varchar(255),
	"mapping_confidence" numeric(5, 4),
	"mapping_method" "mapping_method",
	"is_mapped" boolean DEFAULT false,
	"proforma_destination" varchar(100),
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"embedding_type" varchar(50) NOT NULL,
	"embedding" jsonb NOT NULL,
	"embedding_model" varchar(100),
	"text_content" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"version" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"thesis" text,
	"outcome" varchar(100),
	"outcome_notes" text,
	"post_mortem" text,
	"analog_deal_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "deal_portfolio_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"total_beds" integer,
	"total_facilities" integer,
	"snf_count" integer DEFAULT 0,
	"alf_count" integer DEFAULT 0,
	"ilf_count" integer DEFAULT 0,
	"portfolio_revenue" numeric(15, 2),
	"portfolio_expenses" numeric(15, 2),
	"portfolio_noi" numeric(15, 2),
	"portfolio_value" numeric(15, 2),
	"blended_cap_rate" numeric(5, 4),
	"weighted_occupancy" numeric(5, 4),
	"total_square_footage" integer,
	"average_price_per_bed" numeric(15, 2),
	"state_breakdown" jsonb,
	"asset_type_breakdown" jsonb,
	"calculated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "deal_portfolio_metrics_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "deal_status" DEFAULT 'new',
	"asset_type" "asset_type" NOT NULL,
	"asking_price" numeric(15, 2),
	"beds" integer,
	"primary_state" varchar(2),
	"markets" text[],
	"broker_name" varchar(255),
	"broker_firm" varchar(255),
	"seller_name" varchar(255),
	"broker_credibility_score" integer,
	"thesis" text,
	"confidence_score" integer,
	"analysis_narrative" text,
	"extraction_quality_score" integer,
	"has_unresolved_conflicts" boolean DEFAULT false,
	"deal_structure" "deal_structure" DEFAULT 'purchase',
	"is_all_or_nothing" boolean DEFAULT true,
	"buyer_partner_id" uuid,
	"special_circumstances" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"analyzed_at" timestamp with time zone,
	"version" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "document_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"document1_id" uuid NOT NULL,
	"document2_id" uuid NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"value1" text,
	"value2" text,
	"variance_percent" numeric(10, 4),
	"resolution" "conflict_resolution" DEFAULT 'pending',
	"resolved_value" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp with time zone,
	"resolution_rationale" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"folder_type" "folder_type" NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"filename" varchar(255) NOT NULL,
	"type" "document_type",
	"status" "document_status" DEFAULT 'uploaded',
	"period_start" date,
	"period_end" date,
	"facility_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now(),
	"processed_at" timestamp with time zone,
	"extracted_data" jsonb,
	"raw_text" text,
	"errors" text[],
	"clarification_status" "clarification_status",
	"pending_clarifications" integer DEFAULT 0,
	"extraction_confidence" integer,
	"folder_id" uuid,
	"user_confirmed_type" boolean DEFAULT false,
	"extraction_stage" "extraction_stage",
	"ocr_quality_score" integer
);
--> statement-breakpoint
CREATE TABLE "extraction_clarifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"deal_id" uuid,
	"field_name" varchar(255) NOT NULL,
	"field_path" varchar(500),
	"extracted_value" text,
	"suggested_values" jsonb,
	"benchmark_value" text,
	"benchmark_range" jsonb,
	"clarification_type" "clarification_type" NOT NULL,
	"status" "clarification_status" DEFAULT 'pending',
	"confidence_score" integer,
	"reason" text,
	"resolved_value" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"priority" integer DEFAULT 5,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extraction_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" "document_type" NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_extractions" integer DEFAULT 0,
	"correct_extractions" integer DEFAULT 0,
	"average_confidence" numeric(5, 4),
	"clarifications_generated" integer DEFAULT 0,
	"clarifications_resolved" integer DEFAULT 0,
	"corrections_applied" integer DEFAULT 0,
	"accuracy_rate" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"name" varchar(255) NOT NULL,
	"ccn" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(10),
	"asset_type" "asset_type" NOT NULL,
	"licensed_beds" integer,
	"certified_beds" integer,
	"year_built" integer,
	"last_renovation" integer,
	"square_footage" integer,
	"acres" numeric(10, 2),
	"cms_rating" integer,
	"health_rating" integer,
	"staffing_rating" integer,
	"quality_rating" integer,
	"is_sff" boolean DEFAULT false,
	"is_sff_watch" boolean DEFAULT false,
	"has_immediate_jeopardy" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp with time zone,
	"verified_by" varchar(255),
	"cms_data_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "field_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"deal_id" uuid,
	"document_type" "document_type",
	"field_name" varchar(255) NOT NULL,
	"original_value" text,
	"corrected_value" text NOT NULL,
	"correction_source" varchar(100),
	"corrected_by" varchar(255),
	"corrected_at" timestamp with time zone DEFAULT now(),
	"context_snippet" text,
	"was_pattern_learned" boolean DEFAULT false,
	"learned_pattern_id" uuid
);
--> statement-breakpoint
CREATE TABLE "financial_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"facility_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"is_annualized" boolean DEFAULT false,
	"total_revenue" numeric(15, 2),
	"medicare_revenue" numeric(15, 2),
	"medicaid_revenue" numeric(15, 2),
	"managed_care_revenue" numeric(15, 2),
	"private_pay_revenue" numeric(15, 2),
	"other_revenue" numeric(15, 2),
	"total_expenses" numeric(15, 2),
	"labor_cost" numeric(15, 2),
	"core_labor" numeric(15, 2),
	"agency_labor" numeric(15, 2),
	"food_cost" numeric(15, 2),
	"supplies_cost" numeric(15, 2),
	"utilities_cost" numeric(15, 2),
	"insurance_cost" numeric(15, 2),
	"management_fee" numeric(15, 2),
	"other_expenses" numeric(15, 2),
	"noi" numeric(15, 2),
	"ebitdar" numeric(15, 2),
	"normalized_noi" numeric(15, 2),
	"licensed_beds" integer,
	"average_daily_census" numeric(10, 2),
	"occupancy_rate" numeric(5, 4),
	"hppd" numeric(5, 2),
	"agency_percentage" numeric(5, 4),
	"confidence_score" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learned_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" "pattern_type" NOT NULL,
	"document_type" "document_type",
	"field_name" varchar(255),
	"pattern" text NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0.5',
	"occurrence_count" integer DEFAULT 1,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"last_used_at" timestamp with time zone,
	"example_inputs" jsonb,
	"example_outputs" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcr_cost_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ccn" varchar(20) NOT NULL,
	"provider_name" varchar(255),
	"fiscal_year_begin" date,
	"fiscal_year_end" date,
	"report_status" varchar(50),
	"total_beds" integer,
	"total_patient_days" integer,
	"medicare_days" integer,
	"medicaid_days" integer,
	"total_costs" numeric(15, 2),
	"net_patient_revenue" numeric(15, 2),
	"medicare_revenue" numeric(15, 2),
	"medicaid_revenue" numeric(15, 2),
	"total_salaries" numeric(15, 2),
	"contract_labor_cost" numeric(15, 2),
	"rent_cost" numeric(15, 2),
	"depreciation_cost" numeric(15, 2),
	"cost_per_day" numeric(10, 2),
	"raw_data" jsonb,
	"synced_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"field" varchar(255) NOT NULL,
	"original_value" jsonb,
	"override_value" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"overridden_by" varchar(255),
	"overridden_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_deal_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"deal_name" varchar(255),
	"deal_date" date,
	"deal_size" numeric(15, 2),
	"outcome" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"partner_id" uuid,
	"match_score" integer,
	"expected_yield" numeric(5, 4),
	"probability_of_close" numeric(5, 4),
	"concerns" text[],
	"strengths" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proforma_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"facility_id" uuid,
	"name" varchar(255) NOT NULL,
	"scenario_type" "scenario_type" DEFAULT 'baseline',
	"description" text,
	"start_date" date,
	"end_date" date,
	"projection_years" integer DEFAULT 5,
	"assumptions" jsonb,
	"revenue_growth_rate" numeric(5, 4),
	"expense_growth_rate" numeric(5, 4),
	"target_occupancy" numeric(5, 4),
	"data" jsonb,
	"is_base_case" boolean DEFAULT false,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risk_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20),
	"mitigation_strategy" text,
	"is_underpriced" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_leaseback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"facility_id" uuid,
	"property_noi" numeric(15, 2),
	"applied_cap_rate" numeric(5, 4),
	"purchase_price" numeric(15, 2),
	"buyer_yield_requirement" numeric(5, 4),
	"annual_rent" numeric(15, 2),
	"lease_term_years" integer,
	"rent_escalation" numeric(5, 4),
	"facility_ebitdar" numeric(15, 2),
	"coverage_ratio" numeric(5, 4),
	"coverage_pass_fail" boolean,
	"operator_cash_flow_after_rent" numeric(15, 2),
	"effective_rent_per_bed" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_id" uuid,
	"category" "settings_category" NOT NULL,
	"key" varchar(255) NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb NOT NULL,
	"change_reason" text,
	"changed_by" varchar(255) NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"settings" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "survey_deficiencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"tag" varchar(20),
	"scope" varchar(50),
	"severity" varchar(50),
	"description" text,
	"correction_date" date,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"facility_id" uuid,
	"view_type" varchar(20) NOT NULL,
	"method" "valuation_method" DEFAULT 'cap_rate',
	"value_low" numeric(15, 2),
	"value_base" numeric(15, 2),
	"value_high" numeric(15, 2),
	"cap_rate_low" numeric(5, 4),
	"cap_rate_base" numeric(5, 4),
	"cap_rate_high" numeric(5, 4),
	"noi_used" numeric(15, 2),
	"price_per_bed" numeric(15, 2),
	"suggested_offer" numeric(15, 2),
	"walk_away_threshold" numeric(15, 2),
	"upside_scenario" jsonb,
	"inputs_used" jsonb,
	"comparable_sale_ids" uuid[],
	"confidence_score" integer,
	"confidence_narrative" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wizard_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"current_stage" "wizard_stage_type" DEFAULT 'deal_structure_setup' NOT NULL,
	"stage_data" jsonb DEFAULT '{}',
	"is_complete" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_executions" ADD CONSTRAINT "agent_tool_executions_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_executions" ADD CONSTRAINT "agent_tool_executions_message_id_agent_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."agent_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_adjustment_suggestions" ADD CONSTRAINT "ai_adjustment_suggestions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_adjustment_suggestions" ADD CONSTRAINT "ai_adjustment_suggestions_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_stages" ADD CONSTRAINT "analysis_stages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_financial_period_id_financial_periods_id_fk" FOREIGN KEY ("financial_period_id") REFERENCES "public"."financial_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_valuation_id_valuations_id_fk" FOREIGN KEY ("valuation_id") REFERENCES "public"."valuations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capex_items" ADD CONSTRAINT "capex_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capex_items" ADD CONSTRAINT "capex_items_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_algorithm_overrides" ADD CONSTRAINT "deal_algorithm_overrides_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_coa_mappings" ADD CONSTRAINT "deal_coa_mappings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_coa_mappings" ADD CONSTRAINT "deal_coa_mappings_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_coa_mappings" ADD CONSTRAINT "deal_coa_mappings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_embeddings" ADD CONSTRAINT "deal_embeddings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_memory" ADD CONSTRAINT "deal_memory_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_portfolio_metrics" ADD CONSTRAINT "deal_portfolio_metrics_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_document1_id_documents_id_fk" FOREIGN KEY ("document1_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_document2_id_documents_id_fk" FOREIGN KEY ("document2_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_clarifications" ADD CONSTRAINT "extraction_clarifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_clarifications" ADD CONSTRAINT "extraction_clarifications_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_corrections" ADD CONSTRAINT "field_corrections_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_corrections" ADD CONSTRAINT "field_corrections_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overrides" ADD CONSTRAINT "overrides_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_deal_history" ADD CONSTRAINT "partner_deal_history_partner_id_capital_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."capital_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_matches" ADD CONSTRAINT "partner_matches_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_matches" ADD CONSTRAINT "partner_matches_partner_id_capital_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."capital_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_scenarios" ADD CONSTRAINT "proforma_scenarios_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_scenarios" ADD CONSTRAINT "proforma_scenarios_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_factors" ADD CONSTRAINT "risk_factors_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_leaseback" ADD CONSTRAINT "sale_leaseback_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_leaseback" ADD CONSTRAINT "sale_leaseback_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_audit_log" ADD CONSTRAINT "settings_audit_log_setting_id_algorithm_settings_id_fk" FOREIGN KEY ("setting_id") REFERENCES "public"."algorithm_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_deficiencies" ADD CONSTRAINT "survey_deficiencies_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_sessions" ADD CONSTRAINT "wizard_sessions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_messages_session_id" ON "agent_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_agent_messages_role" ON "agent_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_agent_messages_created_at" ON "agent_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_deal_id" ON "agent_sessions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_user_id" ON "agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_sessions_status" ON "agent_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tool_executions_session_id" ON "agent_tool_executions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_tool_executions_tool_name" ON "agent_tool_executions" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "idx_tool_executions_status" ON "agent_tool_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suggestions_deal_id" ON "ai_adjustment_suggestions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_suggestions_status" ON "ai_adjustment_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suggestions_type" ON "ai_adjustment_suggestions" USING btree ("suggestion_type");--> statement-breakpoint
CREATE INDEX "idx_presets_name" ON "algorithm_presets" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_presets_type" ON "algorithm_presets" USING btree ("preset_type");--> statement-breakpoint
CREATE INDEX "idx_presets_public" ON "algorithm_presets" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_category_key" ON "algorithm_settings" USING btree ("category","key");--> statement-breakpoint
CREATE INDEX "idx_settings_active" ON "algorithm_settings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_analysis_stages_deal_id" ON "analysis_stages" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_analysis_stages_stage" ON "analysis_stages" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_analysis_stages_status" ON "analysis_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assumptions_deal_id" ON "assumptions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_capex_items_deal_id" ON "capex_items" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_provider_ccn" ON "cms_provider_data" USING btree ("ccn");--> statement-breakpoint
CREATE INDEX "idx_cms_provider_state" ON "cms_provider_data" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_cms_provider_overall_rating" ON "cms_provider_data" USING btree ("overall_rating");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coa_unique" ON "coa_mappings" USING btree ("external_term","cascadia_term");--> statement-breakpoint
CREATE INDEX "idx_comparable_sales_state" ON "comparable_sales" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_comparable_sales_asset_type" ON "comparable_sales" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_comparable_sales_date" ON "comparable_sales" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "idx_overrides_new_deal_id" ON "deal_algorithm_overrides" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_overrides_category_key" ON "deal_algorithm_overrides" USING btree ("category","key");--> statement-breakpoint
CREATE INDEX "idx_overrides_active" ON "deal_algorithm_overrides" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_deal_coa_mappings_deal_id" ON "deal_coa_mappings" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deal_coa_mappings_facility_id" ON "deal_coa_mappings" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_deal_coa_mappings_document_id" ON "deal_coa_mappings" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_deal_coa_mappings_is_mapped" ON "deal_coa_mappings" USING btree ("is_mapped");--> statement-breakpoint
CREATE INDEX "idx_deal_coa_mappings_coa_code" ON "deal_coa_mappings" USING btree ("coa_code");--> statement-breakpoint
CREATE INDEX "idx_embeddings_deal_id" ON "deal_embeddings" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_type" ON "deal_embeddings" USING btree ("embedding_type");--> statement-breakpoint
CREATE INDEX "idx_deal_memory_deal_id" ON "deal_memory" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portfolio_metrics_deal_id" ON "deal_portfolio_metrics" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deals_status" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deals_asset_type" ON "deals" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_deals_primary_state" ON "deals" USING btree ("primary_state");--> statement-breakpoint
CREATE INDEX "idx_deals_deal_structure" ON "deals" USING btree ("deal_structure");--> statement-breakpoint
CREATE INDEX "idx_conflicts_deal_id" ON "document_conflicts" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_conflicts_resolution" ON "document_conflicts" USING btree ("resolution");--> statement-breakpoint
CREATE INDEX "idx_document_folders_deal_id" ON "document_folders" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_document_folders_type" ON "document_folders" USING btree ("folder_type");--> statement-breakpoint
CREATE INDEX "idx_documents_deal_id" ON "documents" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_clarification_status" ON "documents" USING btree ("clarification_status");--> statement-breakpoint
CREATE INDEX "idx_documents_folder_id" ON "documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_documents_extraction_stage" ON "documents" USING btree ("extraction_stage");--> statement-breakpoint
CREATE INDEX "idx_clarifications_document_id" ON "extraction_clarifications" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_clarifications_deal_id" ON "extraction_clarifications" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_clarifications_status" ON "extraction_clarifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_clarifications_priority" ON "extraction_clarifications" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_metrics_doc_field_period" ON "extraction_metrics" USING btree ("document_type","field_name","period_start");--> statement-breakpoint
CREATE INDEX "idx_facilities_deal_id" ON "facilities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_facilities_ccn" ON "facilities" USING btree ("ccn");--> statement-breakpoint
CREATE INDEX "idx_facilities_is_verified" ON "facilities" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_corrections_document_id" ON "field_corrections" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_corrections_deal_id" ON "field_corrections" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_corrections_field_name" ON "field_corrections" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "idx_corrections_document_type" ON "field_corrections" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_financial_periods_deal_id" ON "financial_periods" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_patterns_pattern_type" ON "learned_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "idx_patterns_document_type" ON "learned_patterns" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_patterns_field_name" ON "learned_patterns" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "idx_patterns_confidence" ON "learned_patterns" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "idx_mcr_ccn" ON "mcr_cost_reports" USING btree ("ccn");--> statement-breakpoint
CREATE INDEX "idx_mcr_fiscal_year" ON "mcr_cost_reports" USING btree ("fiscal_year_end");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mcr_ccn_fiscal" ON "mcr_cost_reports" USING btree ("ccn","fiscal_year_end");--> statement-breakpoint
CREATE INDEX "idx_overrides_deal_id" ON "overrides" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_partner_matches_deal_id" ON "partner_matches" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_proforma_scenarios_deal_id" ON "proforma_scenarios" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_proforma_scenarios_facility_id" ON "proforma_scenarios" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_sale_leaseback_deal_id" ON "sale_leaseback" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_sale_leaseback_facility_id" ON "sale_leaseback" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_audit_setting_id" ON "settings_audit_log" USING btree ("setting_id");--> statement-breakpoint
CREATE INDEX "idx_audit_changed_at" ON "settings_audit_log" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_snapshot_name" ON "settings_snapshots" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_valuations_deal_id" ON "valuations" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_valuations_view_type" ON "valuations" USING btree ("view_type");--> statement-breakpoint
CREATE INDEX "idx_valuations_method" ON "valuations" USING btree ("method");--> statement-breakpoint
CREATE INDEX "idx_wizard_sessions_deal_id" ON "wizard_sessions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_wizard_sessions_stage" ON "wizard_sessions" USING btree ("current_stage");