import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attentionItems, healthReasons, healthSnapshots, projects } from "@/db/schema";
import { calculateProjectHealth } from "./calculator";

export async function recalculateProjectHealth(projectId: string, now = new Date()) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) throw new Error("Project not found for health calculation");

  const activeAttention = await db
    .select({
      id: attentionItems.id,
      ruleId: attentionItems.ruleId,
      severity: attentionItems.severity,
      message: attentionItems.message,
    })
    .from(attentionItems)
    .where(and(eq(attentionItems.projectId, projectId), eq(attentionItems.status, "ACTIVE")));

  const calculation = calculateProjectHealth({ attention: activeAttention });

  const snapshotId = await db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(healthSnapshots)
      .values({
        projectId,
        overallScore: calculation.overallScore,
        developmentScore: calculation.developmentScore,
        reviewScore: calculation.reviewScore,
        deliveryScore: calculation.deliveryScore,
        planningScore: calculation.planningScore,
        status: calculation.status,
        createdAt: now,
      })
      .returning({ id: healthSnapshots.id });

    if (!snapshot) throw new Error("Unable to persist health snapshot");

    if (calculation.reasons.length > 0) {
      await tx.insert(healthReasons).values(
        calculation.reasons.map((reason) => ({
          healthSnapshotId: snapshot.id,
          dimension: reason.dimension,
          sourceType: reason.sourceType,
          sourceId: reason.sourceId,
          impact: reason.impact,
          message: reason.message,
        })),
      );
    }

    return snapshot.id;
  });

  return {
    snapshotId,
    ...calculation,
    calculatedAt: now,
  };
}
