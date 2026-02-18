CREATE TYPE "public"."file_role" AS ENUM('raw_source', 'completed_proforma', 'value_assessment');--> statement-breakpoint
CREATE TYPE "public"."historical_deal_status" AS ENUM('uploading', 'extracting', 'comparing', 'learning', 'complete', 'error');--> statement-breakpoint
CREATE TYPE "public"."hospice_type" AS ENUM('freestanding', 'hospital_based', 'home_health_based');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('idle', 'running', 'paused_for_clarification', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'vp', 'analyst', 'viewer');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'HOSPICE';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'extracting' BEFORE 'normalizing';--> statement-breakpoint
ALTER TYPE "public"."wizard_stage_type" ADD VALUE 'reconciliation' BEFORE 'financial_consolidation';--> statement-breakpoint
ALTER TYPE "public"."wizard_stage_type" ADD VALUE 'analysis' BEFORE 'financial_consolidation';--> statement-breakpoint
CREATE TABLE "aggregated_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" "asset_type",
	"state" varchar(2),
	"region" varchar(50),
	"quality_tier" varchar(20),
	"deal_size_range" varchar(50),
	"deal_structure" "deal_structure",
	"preference_key" varchar(100) NOT NULL,
	"avg_value" numeric(10, 6),
	"median_value" numeric(10, 6),
	"min_value" numeric(10, 6),
	"max_value" numeric(10, 6),
	"std_dev" numeric(10, 6),
	"sample_count" integer DEFAULT 0,
	"source_deal_ids" uuid[],
	"confidence" numeric(5, 4),
	"last_updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"user_id" uuid,
	"role" varchar(50) DEFAULT 'analyst',
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid
);
--> statement-breakpoint
CREATE TABLE "document_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"document_id" uuid,
	"user_name" varchar(255),
	"action" varchar(50) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_deal_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_deal_id" uuid NOT NULL,
	"facility_name" varchar(255) NOT NULL,
	"asset_type" "asset_type",
	"state" varchar(2),
	"beds" integer,
	"property_type" varchar(50),
	"raw_financials" jsonb,
	"raw_ebitdar" numeric(15, 2),
	"raw_occupancy" numeric(5, 4),
	"proforma_financials" jsonb,
	"proforma_ebitdar" numeric(15, 2),
	"proforma_occupancy" numeric(5, 4),
	"user_valuation" numeric(15, 2),
	"user_cap_rate" numeric(5, 4),
	"user_multiplier" numeric(5, 2),
	"user_price_per_bed" numeric(15, 2),
	"system_valuation" numeric(15, 2),
	"system_cap_rate" numeric(5, 4),
	"valuation_delta" numeric(15, 2),
	"valuation_delta_percent" numeric(5, 4),
	"mgmt_fee_percent" numeric(5, 4),
	"agency_percent" numeric(5, 4),
	"capex_reserve_percent" numeric(5, 4),
	"revenue_growth_rate" numeric(5, 4),
	"expense_growth_rate" numeric(5, 4),
	"occupancy_assumption" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_deal_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_deal_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_role" "file_role" NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"storage_path" text,
	"extracted_data" jsonb,
	"extraction_status" "extraction_stage" DEFAULT 'pending',
	"extraction_error" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "historical_deal_status" DEFAULT 'uploading',
	"asset_type" "asset_type" NOT NULL,
	"primary_state" varchar(2),
	"deal_date" date,
	"asking_price" numeric(15, 2),
	"final_price" numeric(15, 2),
	"beds" integer,
	"facility_count" integer DEFAULT 1,
	"deal_structure" "deal_structure" DEFAULT 'purchase',
	"raw_extraction" jsonb,
	"proforma_extraction" jsonb,
	"valuation_extraction" jsonb,
	"comparison_result" jsonb,
	"notes" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pipeline_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"status" "pipeline_status" DEFAULT 'running' NOT NULL,
	"current_phase" varchar(50) DEFAULT 'ingest' NOT NULL,
	"phase_results" jsonb DEFAULT '{}',
	"files_metadata" jsonb DEFAULT '[]',
	"extracted_data" jsonb DEFAULT '{}',
	"clarifications" jsonb DEFAULT '[]',
	"clarification_answers" jsonb DEFAULT '[]',
	"tool_results" jsonb DEFAULT '[]',
	"red_flags" jsonb DEFAULT '[]',
	"synthesis" jsonb,
	"completeness_score" integer DEFAULT 0,
	"missing_documents" jsonb DEFAULT '[]',
	"error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"deal_id" uuid,
	"action" varchar(100) NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'analyst' NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "deal_portfolio_metrics" ADD COLUMN "hospice_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ai_key_findings" jsonb;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "hospice_type" "hospice_type";--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "average_daily_patient_census" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "hospice_admissions_per_month" integer;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "average_length_of_stay" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "live_discharge_rate" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "cap_per_patient_day" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "routine_home_care_revenue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "continuous_home_care_revenue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "general_inpatient_revenue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "respite_care_revenue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "service_area_counties" text[];--> statement-breakpoint
ALTER TABLE "financial_periods" ADD COLUMN "source" varchar(50);--> statement-breakpoint
ALTER TABLE "financial_periods" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "deal_assignments" ADD CONSTRAINT "deal_assignments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_assignments" ADD CONSTRAINT "deal_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_assignments" ADD CONSTRAINT "deal_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_deal_facilities" ADD CONSTRAINT "historical_deal_facilities_historical_deal_id_historical_deals_id_fk" FOREIGN KEY ("historical_deal_id") REFERENCES "public"."historical_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_deal_files" ADD CONSTRAINT "historical_deal_files_historical_deal_id_historical_deals_id_fk" FOREIGN KEY ("historical_deal_id") REFERENCES "public"."historical_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_sessions" ADD CONSTRAINT "pipeline_sessions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agg_prefs_dimensions" ON "aggregated_preferences" USING btree ("asset_type","state","preference_key");--> statement-breakpoint
CREATE INDEX "idx_agg_prefs_key" ON "aggregated_preferences" USING btree ("preference_key");--> statement-breakpoint
CREATE INDEX "idx_agg_prefs_confidence" ON "aggregated_preferences" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_deal_id" ON "document_activity" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_doc_activity_created_at" ON "document_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_hist_facilities_deal_id" ON "historical_deal_facilities" USING btree ("historical_deal_id");--> statement-breakpoint
CREATE INDEX "idx_hist_facilities_asset_type" ON "historical_deal_facilities" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_historical_files_deal_id" ON "historical_deal_files" USING btree ("historical_deal_id");--> statement-breakpoint
CREATE INDEX "idx_historical_files_role" ON "historical_deal_files" USING btree ("file_role");--> statement-breakpoint
CREATE INDEX "idx_historical_deals_status" ON "historical_deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_historical_deals_asset_type" ON "historical_deals" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_historical_deals_state" ON "historical_deals" USING btree ("primary_state");--> statement-breakpoint
CREATE INDEX "idx_pipeline_sessions_deal_id" ON "pipeline_sessions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_sessions_status" ON "pipeline_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pipeline_sessions_created_at" ON "pipeline_sessions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_financial_periods_facility_id" ON "financial_periods" USING btree ("facility_id");