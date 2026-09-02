CREATE TABLE "health_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"health_snapshot_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"impact" integer NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_reasons" ADD CONSTRAINT "health_reasons_health_snapshot_id_health_snapshots_id_fk" FOREIGN KEY ("health_snapshot_id") REFERENCES "public"."health_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_reasons_snapshot_idx" ON "health_reasons" USING btree ("health_snapshot_id");