CREATE TYPE "public"."facility_alert_type" AS ENUM('rating_change', 'sff_added', 'sff_removed', 'new_deficiency', 'ownership_change', 'penalty_issued', 'bed_count_change');--> statement-breakpoint
CREATE TABLE "facility_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"ccn" varchar(20) NOT NULL,
	"type" "facility_alert_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"previous_value" varchar(100),
	"new_value" varchar(100),
	"severity" varchar(20) DEFAULT 'info',
	"is_read" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ccn" varchar(20) NOT NULL,
	"facility_name" varchar(255),
	"state" varchar(2),
	"beds" integer,
	"last_known_rating" integer,
	"last_known_sff" boolean DEFAULT false,
	"notes" text,
	"added_by" varchar(100) DEFAULT 'analyst',
	"is_active" boolean DEFAULT true,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "facility_alerts" ADD CONSTRAINT "facility_alerts_watchlist_id_facility_watchlist_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."facility_watchlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alerts_watchlist_id" ON "facility_alerts" USING btree ("watchlist_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_ccn" ON "facility_alerts" USING btree ("ccn");--> statement-breakpoint
CREATE INDEX "idx_alerts_type" ON "facility_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_alerts_is_read" ON "facility_alerts" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_alerts_created_at" ON "facility_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_watchlist_ccn" ON "facility_watchlist" USING btree ("ccn");--> statement-breakpoint
CREATE INDEX "idx_watchlist_state" ON "facility_watchlist" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_watchlist_active" ON "facility_watchlist" USING btree ("is_active");