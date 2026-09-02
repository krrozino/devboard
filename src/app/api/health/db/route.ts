import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.execute(sql`
      select
        to_regclass('public.users') as users_table,
        to_regclass('public.projects') as projects_table,
        to_regclass('public.repositories') as repositories_table,
        to_regclass('public.attention_items') as attention_items_table,
        to_regclass('public.health_snapshots') as health_snapshots_table,
        to_regclass('public.github_app_configurations') as github_app_configurations_table,
        to_regclass('public.github_installations') as github_installations_table,
        to_regclass('public.github_issues') as github_issues_table,
        to_regclass('public.github_pull_requests') as github_pull_requests_table,
        to_regclass('public.github_reviews') as github_reviews_table,
        to_regclass('public.github_workflow_runs') as github_workflow_runs_table,
        to_regclass('public.github_planning_connections') as github_planning_connections_table
    `);

    const row = result.rows[0] as Record<string, unknown> | undefined;
    const schemaReady = Boolean(
      row?.users_table &&
        row?.projects_table &&
        row?.repositories_table &&
        row?.attention_items_table &&
        row?.health_snapshots_table &&
        row?.github_app_configurations_table &&
        row?.github_installations_table &&
        row?.github_issues_table &&
        row?.github_pull_requests_table &&
        row?.github_reviews_table &&
        row?.github_workflow_runs_table &&
        row?.github_planning_connections_table,
    );

    return Response.json({
      status: "ok",
      database: "connected",
      schemaReady,
    });
  } catch {
    return Response.json(
      {
        status: "error",
        database: "unavailable",
        schemaReady: false,
      },
      { status: 503 },
    );
  }
}
