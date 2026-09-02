import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { githubInstallations, projects, repositories } from "@/db/schema";
import { evaluateRepositoryTimeAttention } from "@/modules/attention/engine";
import { recalculateProjectHealth } from "@/modules/health/engine";

export type ScheduledAttentionRun = {
  repositoriesDiscovered: number;
  repositoriesEvaluated: number;
  repositoryFailures: number;
  activeTimeFindings: number;
  projectsRecalculated: number;
  healthFailures: number;
  durationMs: number;
  completedAt: Date;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

export async function runScheduledAttentionEvaluation(now = new Date()): Promise<ScheduledAttentionRun> {
  const startedAt = Date.now();
  const connectedRepositories = await db
    .select({ repositoryId: repositories.id, projectId: repositories.projectId })
    .from(repositories)
    .innerJoin(projects, eq(projects.id, repositories.projectId))
    .innerJoin(githubInstallations, eq(githubInstallations.id, repositories.installationId))
    .where(and(eq(projects.status, "ACTIVE"), eq(githubInstallations.status, "ACTIVE")));

  const projectIds = new Set<string>();
  let repositoriesEvaluated = 0;
  let repositoryFailures = 0;
  let activeTimeFindings = 0;

  for (const repository of connectedRepositories) {
    try {
      const result = await evaluateRepositoryTimeAttention(repository.repositoryId, now);
      repositoriesEvaluated += 1;
      activeTimeFindings += result.active;
      projectIds.add(repository.projectId);
    } catch (error) {
      repositoryFailures += 1;
      console.error("scheduled_attention_repository_failed", {
        repositoryId: repository.repositoryId,
        projectId: repository.projectId,
        message: errorMessage(error),
      });
    }
  }

  let projectsRecalculated = 0;
  let healthFailures = 0;

  for (const projectId of projectIds) {
    try {
      await recalculateProjectHealth(projectId, now);
      projectsRecalculated += 1;
    } catch (error) {
      healthFailures += 1;
      console.error("scheduled_attention_health_failed", { projectId, message: errorMessage(error) });
    }
  }

  const result: ScheduledAttentionRun = {
    repositoriesDiscovered: connectedRepositories.length,
    repositoriesEvaluated,
    repositoryFailures,
    activeTimeFindings,
    projectsRecalculated,
    healthFailures,
    durationMs: Date.now() - startedAt,
    completedAt: now,
  };

  console.info("scheduled_attention_completed", {
    ...result,
    completedAt: result.completedAt.toISOString(),
  });

  return result;
}
