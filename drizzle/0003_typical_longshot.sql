CREATE TYPE "public"."workspace_stage_type" AS ENUM('deal_intake', 'comp_pull', 'pro_forma', 'risk_score', 'investment_memo');--> statement-breakpoint
CREATE TABLE "deal_comps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"comp_id" uuid NOT NULL,
	"comp_type" varchar(20) NOT NULL,
	"relevance_score" integer,
	"relevance_notes" text,
	"is_selected" boolean DEFAULT true,
	"added_by" varchar(50) DEFAULT 'auto',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_workspace_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"stage" "workspace_stage_type" NOT NULL,
	"order" integer NOT NULL,
	"status" "analysis_stage_status" DEFAULT 'pending',
	"stage_data" jsonb DEFAULT '{}',
	"completion_score" integer DEFAULT 0,
	"validation_errors" jsonb DEFAULT '[]',
	"cil_insights" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investment_memos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"version" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft',
	"executive_summary" text,
	"facility_overview" text,
	"market_analysis" text,
	"financial_analysis" text,
	"operational_assessment" text,
	"risk_assessment" text,
	"investment_thesis" text,
	"recommendation" text,
	"due_diligence_checklist" jsonb,
	"generated_by" varchar(50) DEFAULT 'ai',
	"generated_at" timestamp with time zone,
	"last_exported_at" timestamp with time zone,
	"export_format" varchar(10),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "workspace_current_stage" "workspace_stage_type";--> statement-breakpoint
ALTER TABLE "deal_comps" ADD CONSTRAINT "deal_comps_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_comps" ADD CONSTRAINT "deal_comps_comp_id_comparable_sales_id_fk" FOREIGN KEY ("comp_id") REFERENCES "public"."comparable_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_workspace_stages" ADD CONSTRAINT "deal_workspace_stages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_memos" ADD CONSTRAINT "investment_memos_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deal_comps_deal_id" ON "deal_comps" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deal_comps_comp_id" ON "deal_comps" USING btree ("comp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_deal_comp_unique" ON "deal_comps" USING btree ("deal_id","comp_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_stages_deal_id" ON "deal_workspace_stages" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_stages_stage" ON "deal_workspace_stages" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspace_deal_stage" ON "deal_workspace_stages" USING btree ("deal_id","stage");--> statement-breakpoint
CREATE INDEX "idx_investment_memos_deal_id" ON "investment_memos" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_investment_memos_version" ON "investment_memos" USING btree ("deal_id","version");