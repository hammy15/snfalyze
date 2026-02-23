CREATE TYPE "public"."deal_activity_type" AS ENUM('comment', 'stage_change', 'data_update', 'document_upload', 'risk_flag', 'cms_sync', 'memo_generated', 'status_change');--> statement-breakpoint
CREATE TABLE "deal_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"type" "deal_activity_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}',
	"user_id" varchar(100) DEFAULT 'system',
	"user_name" varchar(100) DEFAULT 'System',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"stage" "workspace_stage_type",
	"content" text NOT NULL,
	"user_id" varchar(100) DEFAULT 'user',
	"user_name" varchar(100) DEFAULT 'Analyst',
	"parent_id" uuid,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_comments" ADD CONSTRAINT "deal_comments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deal_activities_deal_id" ON "deal_activities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deal_activities_type" ON "deal_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_deal_activities_created_at" ON "deal_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_deal_comments_deal_id" ON "deal_comments" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deal_comments_stage" ON "deal_comments" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_deal_comments_parent_id" ON "deal_comments" USING btree ("parent_id");