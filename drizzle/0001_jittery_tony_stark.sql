CREATE TABLE "facility_census_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"medicare_part_a_days" integer DEFAULT 0,
	"medicare_advantage_days" integer DEFAULT 0,
	"managed_care_days" integer DEFAULT 0,
	"medicaid_days" integer DEFAULT 0,
	"managed_medicaid_days" integer DEFAULT 0,
	"private_days" integer DEFAULT 0,
	"va_contract_days" integer DEFAULT 0,
	"hospice_days" integer DEFAULT 0,
	"other_days" integer DEFAULT 0,
	"total_beds" integer,
	"occupancy_rate" numeric(5, 2),
	"source" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_payer_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"medicare_part_a_ppd" numeric(10, 2),
	"medicare_advantage_ppd" numeric(10, 2),
	"managed_care_ppd" numeric(10, 2),
	"medicaid_ppd" numeric(10, 2),
	"managed_medicaid_ppd" numeric(10, 2),
	"private_ppd" numeric(10, 2),
	"va_contract_ppd" numeric(10, 2),
	"hospice_ppd" numeric(10, 2),
	"ancillary_revenue_ppd" numeric(10, 2),
	"therapy_revenue_ppd" numeric(10, 2),
	"source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proforma_line_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"coa_code" varchar(20) NOT NULL,
	"month_index" integer NOT NULL,
	"override_type" varchar(20) NOT NULL,
	"override_value" numeric(15, 2),
	"annual_growth_rate" numeric(5, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proforma_scenario_assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"facility_id" uuid,
	"assumption_key" varchar(50) NOT NULL,
	"assumption_value" numeric(15, 4),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "wizard_sessions" ALTER COLUMN "current_stage" SET DEFAULT 'document_upload';--> statement-breakpoint
ALTER TABLE "facility_census_periods" ADD CONSTRAINT "facility_census_periods_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_payer_rates" ADD CONSTRAINT "facility_payer_rates_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_line_overrides" ADD CONSTRAINT "proforma_line_overrides_scenario_id_proforma_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."proforma_scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_line_overrides" ADD CONSTRAINT "proforma_line_overrides_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_scenario_assumptions" ADD CONSTRAINT "proforma_scenario_assumptions_scenario_id_proforma_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."proforma_scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_scenario_assumptions" ADD CONSTRAINT "proforma_scenario_assumptions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_census_periods_facility_id" ON "facility_census_periods" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_census_periods_period" ON "facility_census_periods" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_payer_rates_facility_id" ON "facility_payer_rates" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_payer_rates_effective_date" ON "facility_payer_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_proforma_overrides_scenario_id" ON "proforma_line_overrides" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "idx_proforma_overrides_facility_id" ON "proforma_line_overrides" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_proforma_overrides_coa_month" ON "proforma_line_overrides" USING btree ("coa_code","month_index");--> statement-breakpoint
CREATE INDEX "idx_scenario_assumptions_scenario_id" ON "proforma_scenario_assumptions" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "idx_scenario_assumptions_facility_id" ON "proforma_scenario_assumptions" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "idx_scenario_assumptions_key" ON "proforma_scenario_assumptions" USING btree ("assumption_key");--> statement-breakpoint
ALTER TABLE "public"."wizard_sessions" ALTER COLUMN "current_stage" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."wizard_stage_type";--> statement-breakpoint
CREATE TYPE "public"."wizard_stage_type" AS ENUM('document_upload', 'review_analysis', 'facility_verification', 'document_extraction', 'coa_mapping_review', 'financial_consolidation');--> statement-breakpoint
ALTER TABLE "public"."wizard_sessions" ALTER COLUMN "current_stage" SET DATA TYPE "public"."wizard_stage_type" USING "current_stage"::"public"."wizard_stage_type";