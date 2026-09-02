CREATE TYPE "public"."github_installation_status" AS ENUM('ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TABLE "github_app_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'primary' NOT NULL,
	"github_app_id" text NOT NULL,
	"slug" text NOT NULL,
	"client_id" text NOT NULL,
	"private_key_encrypted" text NOT NULL,
	"webhook_secret_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_configuration_id" uuid NOT NULL,
	"github_installation_id" text NOT NULL,
	"account_id" text NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"status" "github_installation_status" DEFAULT 'ACTIVE' NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "installation_id" uuid;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_app_configuration_id_github_app_configurations_id_fk" FOREIGN KEY ("app_configuration_id") REFERENCES "public"."github_app_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_app_config_singleton_uidx" ON "github_app_configurations" USING btree ("singleton_key");--> statement-breakpoint
CREATE UNIQUE INDEX "github_app_config_app_id_uidx" ON "github_app_configurations" USING btree ("github_app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_external_id_uidx" ON "github_installations" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "github_installations_user_id_idx" ON "github_installations" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repositories_installation_id_idx" ON "repositories" USING btree ("installation_id");