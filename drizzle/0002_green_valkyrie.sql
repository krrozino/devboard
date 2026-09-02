CREATE TABLE "github_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_issue_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"author_github_id" text,
	"created_at_github" timestamp with time zone NOT NULL,
	"updated_at_github" timestamp with time zone NOT NULL,
	"closed_at_github" timestamp with time zone,
	"last_activity_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_pull_request_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"author_github_id" text,
	"created_at_github" timestamp with time zone NOT NULL,
	"updated_at_github" timestamp with time zone NOT NULL,
	"closed_at_github" timestamp with time zone,
	"merged_at_github" timestamp with time zone,
	"first_review_at" timestamp with time zone,
	"last_review_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"github_review_id" text NOT NULL,
	"reviewer_github_id" text,
	"state" text NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "github_workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_run_id" text NOT NULL,
	"workflow_name" text NOT NULL,
	"branch" text,
	"status" text NOT NULL,
	"conclusion" text,
	"created_at_github" timestamp with time zone NOT NULL,
	"started_at_github" timestamp with time zone,
	"completed_at_github" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_issues" ADD CONSTRAINT "github_issues_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_reviews" ADD CONSTRAINT "github_reviews_pull_request_id_github_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."github_pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_workflow_runs" ADD CONSTRAINT "github_workflow_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_issues_external_id_uidx" ON "github_issues" USING btree ("github_issue_id");--> statement-breakpoint
CREATE INDEX "github_issues_repository_state_idx" ON "github_issues" USING btree ("repository_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "github_pull_requests_external_id_uidx" ON "github_pull_requests" USING btree ("github_pull_request_id");--> statement-breakpoint
CREATE INDEX "github_pull_requests_repository_state_idx" ON "github_pull_requests" USING btree ("repository_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "github_reviews_external_id_uidx" ON "github_reviews" USING btree ("github_review_id");--> statement-breakpoint
CREATE INDEX "github_reviews_pull_request_idx" ON "github_reviews" USING btree ("pull_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_workflow_runs_external_id_uidx" ON "github_workflow_runs" USING btree ("github_run_id");--> statement-breakpoint
CREATE INDEX "github_workflow_runs_repository_status_idx" ON "github_workflow_runs" USING btree ("repository_id","status");