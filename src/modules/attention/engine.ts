import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  attentionItems,
  githubIssues,
  githubPullRequests,
  githubWorkflowRuns,
  repositories,
} from "@/db/schema";
import {
  evaluateIssue,
  evaluatePullRequest,
  evaluateWorkflows,
  type AttentionFinding,
} from "@/modules/attention/rules";

const RULE_IDS = ["PR_WAITING_REVIEW", "STALE_ISSUE", "WORKFLOW_FAILED"] as const;

export async function evaluateRepositoryAttention(
  repositoryId: string,
  now = new Date(),
  relevantWorkflowBranches?: Iterable<string>,
) {
  const [repository] = await db
    .select({
      projectId: repositories.projectId,
      defaultBranch: repositories.defaultBranch,
    })
    .from(repositories)
    .where(eq(repositories.id, repositoryId))
    .limit(1);

  if (!repository) throw new Error("Repository not found for attention evaluation");

  const [pullRequests, issues, workflowRuns] = await Promise.all([
    db
      .select({
        githubId: githubPullRequests.githubPullRequestId,
        number: githubPullRequests.number,
        state: githubPullRequests.state,
        draft: githubPullRequests.draft,
        createdAt: githubPullRequests.createdAtGithub,
        firstReviewAt: githubPullRequests.firstReviewAt,
      })
      .from(githubPullRequests)
      .where(eq(githubPullRequests.repositoryId, repositoryId)),
    db
      .select({
        githubId: githubIssues.githubIssueId,
        number: githubIssues.number,
        state: githubIssues.state,
        lastActivityAt: githubIssues.lastActivityAt,
      })
      .from(githubIssues)
      .where(eq(githubIssues.repositoryId, repositoryId)),
    db
      .select({
        githubRunId: githubWorkflowRuns.githubRunId,
        workflowName: githubWorkflowRuns.workflowName,
        branch: githubWorkflowRuns.branch,
        status: githubWorkflowRuns.status,
        conclusion: githubWorkflowRuns.conclusion,
        createdAt: githubWorkflowRuns.createdAtGithub,
      })
      .from(githubWorkflowRuns)
      .where(eq(githubWorkflowRuns.repositoryId, repositoryId)),
  ]);

  const findings: AttentionFinding[] = [];

  for (const pullRequest of pullRequests) {
    const finding = evaluatePullRequest({ ...pullRequest, now });
    if (finding) findings.push(finding);
  }

  for (const issue of issues) {
    const finding = evaluateIssue({ ...issue, now });
    if (finding) findings.push(finding);
  }

  findings.push(
    ...evaluateWorkflows({
      repositoryId,
      runs: workflowRuns,
      relevantBranches: relevantWorkflowBranches ?? [repository.defaultBranch],
    }),
  );

  const desiredKeys = new Set(
    findings.map((finding) => `${finding.ruleId}:${finding.resourceType}:${finding.resourceId}`),
  );

  await db.transaction(async (tx) => {
    for (const finding of findings) {
      await tx
        .insert(attentionItems)
        .values({
          projectId: repository.projectId,
          repositoryId,
          ruleId: finding.ruleId,
          resourceType: finding.resourceType,
          resourceId: finding.resourceId,
          severity: finding.severity,
          status: "ACTIVE",
          message: finding.message,
          detectedAt: now,
          resolvedAt: null,
        })
        .onConflictDoUpdate({
          target: [attentionItems.ruleId, attentionItems.resourceType, attentionItems.resourceId],
          set: {
            projectId: repository.projectId,
            repositoryId,
            severity: finding.severity,
            status: "ACTIVE",
            message: finding.message,
            resolvedAt: null,
          },
        });
    }

    const existing = await tx
      .select({
        id: attentionItems.id,
        ruleId: attentionItems.ruleId,
        resourceType: attentionItems.resourceType,
        resourceId: attentionItems.resourceId,
      })
      .from(attentionItems)
      .where(
        and(
          eq(attentionItems.repositoryId, repositoryId),
          eq(attentionItems.status, "ACTIVE"),
          inArray(attentionItems.ruleId, [...RULE_IDS]),
        ),
      );

    for (const item of existing) {
      const key = `${item.ruleId}:${item.resourceType}:${item.resourceId}`;
      if (desiredKeys.has(key)) continue;

      await tx
        .update(attentionItems)
        .set({ status: "RESOLVED", resolvedAt: now })
        .where(eq(attentionItems.id, item.id));
    }
  });

  return {
    active: findings.length,
    findings,
    evaluatedAt: now,
  };
}
