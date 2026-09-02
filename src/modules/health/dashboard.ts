import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { healthReasons, healthSnapshots, projects } from "@/db/schema";

export type HealthDashboardReason = {
  dimension: string;
  sourceType: string;
  sourceId: string;
  impact: number;
  message: string;
};

export type ProjectHealthDashboard = {
  snapshotId: string;
  projectId: string;
  projectName: string;
  overallScore: number;
  developmentScore: number;
  reviewScore: number;
  deliveryScore: number;
  planningScore: number | null;
  status: "HEALTHY" | "ATTENTION" | "AT_RISK";
  createdAt: Date;
  reasons: HealthDashboardReason[];
};

export async function listLatestProjectHealth(userId: string): Promise<ProjectHealthDashboard[]> {
  const rows = await db
    .select({
      snapshotId: healthSnapshots.id,
      projectId: healthSnapshots.projectId,
      projectName: projects.name,
      overallScore: healthSnapshots.overallScore,
      developmentScore: healthSnapshots.developmentScore,
      reviewScore: healthSnapshots.reviewScore,
      deliveryScore: healthSnapshots.deliveryScore,
      planningScore: healthSnapshots.planningScore,
      status: healthSnapshots.status,
      createdAt: healthSnapshots.createdAt,
    })
    .from(healthSnapshots)
    .innerJoin(projects, eq(projects.id, healthSnapshots.projectId))
    .where(eq(projects.userId, userId))
    .orderBy(desc(healthSnapshots.createdAt))
    .limit(100);

  const latestByProject = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByProject.has(row.projectId)) latestByProject.set(row.projectId, row);
  }

  const latest = [...latestByProject.values()];
  if (latest.length === 0) return [];

  const snapshotIds = latest.map((item) => item.snapshotId);
  const reasons = await db
    .select({
      healthSnapshotId: healthReasons.healthSnapshotId,
      dimension: healthReasons.dimension,
      sourceType: healthReasons.sourceType,
      sourceId: healthReasons.sourceId,
      impact: healthReasons.impact,
      message: healthReasons.message,
    })
    .from(healthReasons)
    .where(inArray(healthReasons.healthSnapshotId, snapshotIds));

  const reasonsBySnapshot = new Map<string, HealthDashboardReason[]>();
  for (const reason of reasons) {
    const items = reasonsBySnapshot.get(reason.healthSnapshotId) ?? [];
    items.push({
      dimension: reason.dimension,
      sourceType: reason.sourceType,
      sourceId: reason.sourceId,
      impact: reason.impact,
      message: reason.message,
    });
    reasonsBySnapshot.set(reason.healthSnapshotId, items);
  }

  return latest.map((item) => ({
    ...item,
    reasons: (reasonsBySnapshot.get(item.snapshotId) ?? []).sort(
      (left, right) => left.impact - right.impact,
    ),
  }));
}
