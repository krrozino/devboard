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

const TIME_RULE_IDS = ["PR_WAITING_REVIEW", "STALE_ISSUE"] as const;
const RULE_IDS = [...TIME_RULE_IDS, "WORKFLOW_FAILED"] as const;

type RepositoryContext = {
  projectId: string;
  defaultBranch: string;
};

async function loadRepositoryContext(repositoryId: string): Promise<RepositoryContext> {
  const [repository] = await db
    .select({
      projectId: repositories.projectId,
      defaultBranch: repositories.defaultBranch,
    })
    .from(repositories)
    .where(eq(repositories.id, repositoryId))
    .limit(1);

  if (!repository) throw new Error("Repository not found for attention evaluation");
  return repository;
}

async function loadTimeBasedResources(repositoryId: string) {
  return Promise.all([
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
  ]);
}

function evaluateTimeBasedResources(
  pullRequests: Awaited<ReturnType<typeof loadTimeBasedResources>>[0],
  issues: Awaited<ReturnType<typeof loadTimeBasedResources>>[1],
  now: Date,
) {
  const findings: AttentionFinding[] = [];

  for (const pullRequest of pullRequests) {
    const finding = evaluatePullRequest({ ...pullRequest, now });
    if (finding) findings.push(finding);
  }

  for (const issue of issues) {
    const finding = evaluateIssue({ ...issue, now });
    if (finding) findings.push(finding);
  }

  return findings;
}

async function reconcileRepositoryFindings(params: {
  repositoryId: string;
  projectId: string;
  findings: AttentionFinding[];
  ruleIds: readonly string[];
  now: Date;
}) {
  const desiredKeys = new Set(
    params.findings.map(
      (finding) => `${finding.ruleId}:${finding.resourceType}:${finding.resourceId}`,
    ),
  );

  await db.transaction(async (tx) => {
    for (const finding of params.findings) {
      await tx
        .insert(attentionItems)
        .values({
          projectId: params.projectId,
          repositoryId: params.repositoryId,
          ruleId: finding.ruleId,
          resourceType: finding.resourceType,
          resourceId: finding.resourceId,
          severity: finding.severity,
          status: "ACTIVE",
          message: finding.message,
          detectedAt: params.now,
          resolvedAt: null,
        })
        .onConflictDoUpdate({
          target: [attentionItems.ruleId, attentionItems.resourceType, attentionItems.resourceId],
          set: {
            projectId: params.projectId,
            repositoryId: params.repositoryId,
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
          eq(attentionItems.repositoryId, params.repositoryId),
          eq(attentionItems.status, "ACTIVE"),
          inArray(attentionItems.ruleId, [...params.ruleIds]),
        ),
      );

    for (const item of existing) {
      const key = `${item.ruleId}:${item.resourceType}:${item.resourceId}`;
      if (desiredKeys.has(key)) continue;

      await tx
        .update(attentionItems)
        .set({ status: "RESOLVED", resolvedAt: params.now })
        .where(eq(attentionItems.id, item.id));
    }
  });
}

export async function evaluateRepositoryTimeAttention(repositoryId: string, now = new Date()) {
  const repository = await loadRepositoryContext(repositoryId);
  const [pullRequests, issues] = await loadTimeBasedResources(repositoryId);
  const findings = evaluateTimeBasedResources(pullRequests, issues, now);

  await reconcileRepositoryFindings({
    repositoryId,
    projectId: repository.projectId,
    findings,
    ruleIds: TIME_RULE_IDS,
    now,
  });

  return {
    active: findings.length,
    findings,
    evaluatedAt: now,
  };
}

export async function evaluateRepositoryAttention(
  repositoryId: string,
  now = new Date(),
  relevantWorkflowBranches?: Iterable<string>,
) {
  const repository = await loadRepositoryContext(repositoryId);
  const [[pullRequests, issues], workflowRuns] = await Promise.all([
    loadTimeBasedResources(repositoryId),
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

  const findings = evaluateTimeBasedResources(pullRequests, issues, now);
  findings.push(
    ...evaluateWorkflows({
      repositoryId,
      runs: workflowRuns,
      relevantBranches: relevantWorkflowBranches ?? [repository.defaultBranch],
    }),
  );

  await reconcileRepositoryFindings({
    repositoryId,
    projectId: repository.projectId,
    findings,
    ruleIds: RULE_IDS,
    now,
  });

  return {
    active: findings.length,
    findings,
    evaluatedAt: now,
  };
}
