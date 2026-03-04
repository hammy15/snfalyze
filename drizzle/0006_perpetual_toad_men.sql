CREATE TYPE "public"."cil_activity_type" AS ENUM('analysis', 'learning', 'research', 'sense_activation', 'knowledge_import', 'rerun', 'insight');--> statement-breakpoint
CREATE TYPE "public"."performance_tier" AS ENUM('strong', 'developing', 'limited', 'no_data');--> statement-breakpoint
CREATE TYPE "public"."research_mission_status" AS ENUM('queued', 'researching', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "cil_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_type" "cil_activity_type" NOT NULL,
	"brain_id" varchar(20),
	"sense_id" varchar(50),
	"deal_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar(500) NOT NULL,
	"context" jsonb,
	"status" "research_mission_status" DEFAULT 'queued',
	"findings" text,
	"sources" jsonb,
	"imported_to_knowledge" boolean DEFAULT false,
	"knowledge_file_path" text,
	"error" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "state_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(2) NOT NULL,
	"asset_type" "asset_type",
	"deal_count" integer DEFAULT 0,
	"avg_confidence" numeric(5, 2),
	"avg_cap_rate" numeric(5, 4),
	"avg_price_per_bed" numeric(15, 2),
	"performance_tier" "performance_tier" DEFAULT 'no_data',
	"top_patterns" jsonb,
	"metadata" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cil_activity_log" ADD CONSTRAINT "cil_activity_log_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cil_activity_type" ON "cil_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "idx_cil_activity_brain" ON "cil_activity_log" USING btree ("brain_id");--> statement-breakpoint
CREATE INDEX "idx_cil_activity_deal" ON "cil_activity_log" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_cil_activity_created_at" ON "cil_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_research_missions_status" ON "research_missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_research_missions_created_at" ON "research_missions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_state_performance_state_asset" ON "state_performance" USING btree ("state","asset_type");--> statement-breakpoint
CREATE INDEX "idx_state_performance_tier" ON "state_performance" USING btree ("performance_tier");