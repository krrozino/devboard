CREATE TABLE "github_planning_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"oauth_token_encrypted" text NOT NULL,
	"granted_scopes" text,
	"selected_owner_login" text,
	"selected_owner_type" text,
	"selected_project_number" integer,
	"selected_project_node_id" text,
	"selected_project_title" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_planning_connections" ADD CONSTRAINT "github_planning_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_planning_connections_user_uidx" ON "github_planning_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_planning_selected_project_idx" ON "github_planning_connections" USING btree ("selected_owner_login","selected_project_number");