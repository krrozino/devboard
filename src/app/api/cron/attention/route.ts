import { isCronRequestAuthorized } from "@/modules/attention/cron-auth";
import { runScheduledAttentionEvaluation } from "@/modules/attention/scheduled";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScheduledAttentionEvaluation();
    const ok = result.repositoryFailures === 0 && result.healthFailures === 0;

    return Response.json(
      {
        ok,
        repositoriesDiscovered: result.repositoriesDiscovered,
        repositoriesEvaluated: result.repositoriesEvaluated,
        repositoryFailures: result.repositoryFailures,
        activeTimeFindings: result.activeTimeFindings,
        projectsRecalculated: result.projectsRecalculated,
        healthFailures: result.healthFailures,
        durationMs: result.durationMs,
        completedAt: result.completedAt.toISOString(),
      },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    console.error("scheduled_attention_run_failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return Response.json({ ok: false, error: "Scheduled evaluation failed" }, { status: 500 });
  }
}
