import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  attentionItems,
  githubIssues,
  githubPullRequests,
  healthReasons,
  healthSnapshots,
  projects,
  repositories,
} from "@/db/schema";

export type HealthDashboardReason = {
  dimension: string;
  sourceType: string;
  sourceId: string;
  impact: number;
  message: string;
  url: string | null;
};

export type HealthTrendPoint = {
  score: number;
  status: "HEALTHY" | "ATTENTION" | "AT_RISK";
  createdAt: Date;
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
  trend: HealthTrendPoint[];
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

  const snapshotsByProject = new Map<string, (typeof rows)[number][]>();
  for (const row of rows) {
    const items = snapshotsByProject.get(row.projectId) ?? [];
    if (items.length < 6) items.push(row);
    snapshotsByProject.set(row.projectId, items);
  }

  const latest = [...snapshotsByProject.values()].map((items) => items[0]).filter(Boolean);
  if (latest.length === 0) return [];

  const snapshotIds = latest.map((item) => item.snapshotId);
  const reasonRows = await db
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

  const attentionIds = [...new Set(reasonRows.map((reason) => reason.sourceId))];
  const attentionRows = attentionIds.length
    ? await db
        .select({
          id: attentionItems.id,
          repositoryId: attentionItems.repositoryId,
          resourceType: attentionItems.resourceType,
          resourceId: attentionItems.resourceId,
        })
        .from(attentionItems)
        .where(inArray(attentionItems.id, attentionIds))
    : [];

  const attentionById = new Map(attentionRows.map((item) => [item.id, item]));
  const repositoryIds = [
    ...new Set(
      attentionRows
        .map((item) => item.repositoryId)
        .filter((repositoryId): repositoryId is string => Boolean(repositoryId)),
    ),
  ];
  const repositoryRows = repositoryIds.length
    ? await db
        .select({ id: repositories.id, owner: repositories.owner, name: repositories.name })
        .from(repositories)
        .where(inArray(repositories.id, repositoryIds))
    : [];
  const repositoryById = new Map(repositoryRows.map((repository) => [repository.id, repository]));

  const pullRequestIds = attentionRows
    .filter((item) => item.resourceType === "pull_request")
    .map((item) => item.resourceId);
  const issueIds = attentionRows
    .filter((item) => item.resourceType === "issue")
    .map((item) => item.resourceId);

  const [pullRequestRows, issueRows] = await Promise.all([
    pullRequestIds.length
      ? db
          .select({ githubId: githubPullRequests.githubPullRequestId, number: githubPullRequests.number })
          .from(githubPullRequests)
          .where(inArray(githubPullRequests.githubPullRequestId, pullRequestIds))
      : Promise.resolve([]),
    issueIds.length
      ? db
          .select({ githubId: githubIssues.githubIssueId, number: githubIssues.number })
          .from(githubIssues)
          .where(inArray(githubIssues.githubIssueId, issueIds))
      : Promise.resolve([]),
  ]);

  const pullNumberByGithubId = new Map(pullRequestRows.map((item) => [item.githubId, item.number]));
  const issueNumberByGithubId = new Map(issueRows.map((item) => [item.githubId, item.number]));

  function sourceUrl(sourceId: string) {
    const attention = attentionById.get(sourceId);
    if (!attention?.repositoryId) return null;
    const repository = repositoryById.get(attention.repositoryId);
    if (!repository) return null;
    const base = `https://github.com/${repository.owner}/${repository.name}`;

    if (attention.resourceType === "pull_request") {
      const number = pullNumberByGithubId.get(attention.resourceId);
      return number ? `${base}/pull/${number}` : base;
    }

    if (attention.resourceType === "issue") {
      const number = issueNumberByGithubId.get(attention.resourceId);
      return number ? `${base}/issues/${number}` : base;
    }

    if (attention.resourceType === "workflow") return `${base}/actions`;
    return base;
  }

  const reasonsBySnapshot = new Map<string, HealthDashboardReason[]>();
  for (const reason of reasonRows) {
    const items = reasonsBySnapshot.get(reason.healthSnapshotId) ?? [];
    items.push({
      dimension: reason.dimension,
      sourceType: reason.sourceType,
      sourceId: reason.sourceId,
      impact: reason.impact,
      message: reason.message,
      url: sourceUrl(reason.sourceId),
    });
    reasonsBySnapshot.set(reason.healthSnapshotId, items);
  }

  return latest.map((item) => ({
    ...item,
    reasons: (reasonsBySnapshot.get(item.snapshotId) ?? []).sort(
      (left, right) => left.impact - right.impact,
    ),
    trend: [...(snapshotsByProject.get(item.projectId) ?? [])]
      .reverse()
      .map((snapshot) => ({
        score: snapshot.overallScore,
        status: snapshot.status,
        createdAt: snapshot.createdAt,
      })),
  }));
}
