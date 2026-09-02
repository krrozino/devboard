import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  githubAppConfigurations,
  githubInstallations,
  githubIssues,
  githubPullRequests,
  githubReviews,
  githubWorkflowRuns,
  projects,
  repositories,
} from "@/db/schema";
import { evaluateRepositoryAttention } from "@/modules/attention/engine";
import { createInstallationToken } from "@/modules/github/app-api";
import { decryptCredential } from "@/modules/github/credentials";
import {
  listPullRequestReviews,
  listRepositoryIssues,
  listRepositoryPullRequests,
  listRepositoryWorkflowRuns,
  type GithubReviewResource,
} from "@/modules/github/resources-api";
import { recalculateProjectHealth } from "@/modules/health/engine";

async function loadReviews(
  token: string,
  owner: string,
  repo: string,
  pullNumbers: number[],
) {
  const result = new Map<number, GithubReviewResource[]>();
  const concurrency = 5;

  for (let start = 0; start < pullNumbers.length; start += concurrency) {
    const batch = pullNumbers.slice(start, start + concurrency);
    const reviews = await Promise.all(
      batch.map(async (pullNumber) => ({
        pullNumber,
        reviews: await listPullRequestReviews(token, owner, repo, pullNumber),
      })),
    );

    for (const item of reviews) result.set(item.pullNumber, item.reviews);
  }

  return result;
}

function nullableDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function syncGithubRepository(repositoryId: string, userId: string) {
  const [connection] = await db
    .select({
      repositoryId: repositories.id,
      projectId: repositories.projectId,
      owner: repositories.owner,
      name: repositories.name,
      defaultBranch: repositories.defaultBranch,
      installationId: githubInstallations.githubInstallationId,
      appId: githubAppConfigurations.githubAppId,
      privateKeyEncrypted: githubAppConfigurations.privateKeyEncrypted,
    })
    .from(repositories)
    .innerJoin(projects, eq(projects.id, repositories.projectId))
    .innerJoin(githubInstallations, eq(githubInstallations.id, repositories.installationId))
    .innerJoin(
      githubAppConfigurations,
      eq(githubAppConfigurations.id, githubInstallations.appConfigurationId),
    )
    .where(and(eq(repositories.id, repositoryId), eq(projects.userId, userId)))
    .limit(1);

  if (!connection) throw new Error("Connected repository not found");

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) throw new Error("AUTH_SECRET is not configured");

  const privateKey = decryptCredential(connection.privateKeyEncrypted, authSecret);
  const token = await createInstallationToken({
    appId: connection.appId,
    privateKey,
    installationId: connection.installationId,
  });

  const [issues, pullRequests, workflowRuns] = await Promise.all([
    listRepositoryIssues(token, connection.owner, connection.name),
    listRepositoryPullRequests(token, connection.owner, connection.name),
    listRepositoryWorkflowRuns(token, connection.owner, connection.name),
  ]);

  const reviewsByPull = await loadReviews(
    token,
    connection.owner,
    connection.name,
    pullRequests.map((pullRequest) => pullRequest.number),
  );

  const relevantWorkflowBranches = new Set<string>([connection.defaultBranch]);
  for (const pullRequest of pullRequests) {
    if (pullRequest.state === "open" && pullRequest.head?.ref) {
      relevantWorkflowBranches.add(pullRequest.head.ref);
    }
  }

  const now = new Date();
  let reviewCount = 0;

  await db.transaction(async (tx) => {
    for (const issue of issues) {
      const values = {
        repositoryId: connection.repositoryId,
        githubIssueId: String(issue.id),
        number: issue.number,
        title: issue.title,
        state: issue.state,
        authorGithubId: issue.user ? String(issue.user.id) : null,
        createdAtGithub: new Date(issue.created_at),
        updatedAtGithub: new Date(issue.updated_at),
        closedAtGithub: nullableDate(issue.closed_at),
        lastActivityAt: new Date(issue.updated_at),
        syncedAt: now,
      };

      await tx
        .insert(githubIssues)
        .values(values)
        .onConflictDoUpdate({
          target: githubIssues.githubIssueId,
          set: values,
        });
    }

    for (const pullRequest of pullRequests) {
      const reviews = reviewsByPull.get(pullRequest.number) ?? [];
      const submittedReviewDates = reviews
        .map((review) => nullableDate(review.submitted_at))
        .filter((date): date is Date => Boolean(date))
        .sort((left, right) => left.getTime() - right.getTime());

      const pullValues = {
        repositoryId: connection.repositoryId,
        githubPullRequestId: String(pullRequest.id),
        number: pullRequest.number,
        title: pullRequest.title,
        state: pullRequest.state,
        draft: Boolean(pullRequest.draft),
        authorGithubId: pullRequest.user ? String(pullRequest.user.id) : null,
        createdAtGithub: new Date(pullRequest.created_at),
        updatedAtGithub: new Date(pullRequest.updated_at),
        closedAtGithub: nullableDate(pullRequest.closed_at),
        mergedAtGithub: nullableDate(pullRequest.merged_at),
        firstReviewAt: submittedReviewDates[0] ?? null,
        lastReviewAt: submittedReviewDates.at(-1) ?? null,
        lastActivityAt: new Date(pullRequest.updated_at),
        syncedAt: now,
      };

      const [savedPullRequest] = await tx
        .insert(githubPullRequests)
        .values(pullValues)
        .onConflictDoUpdate({
          target: githubPullRequests.githubPullRequestId,
          set: pullValues,
        })
        .returning({ id: githubPullRequests.id });

      if (!savedPullRequest) throw new Error("Unable to persist pull request");

      for (const review of reviews) {
        const reviewValues = {
          pullRequestId: savedPullRequest.id,
          githubReviewId: String(review.id),
          reviewerGithubId: review.user ? String(review.user.id) : null,
          state: review.state,
          submittedAt: nullableDate(review.submitted_at),
        };

        await tx
          .insert(githubReviews)
          .values(reviewValues)
          .onConflictDoUpdate({
            target: githubReviews.githubReviewId,
            set: reviewValues,
          });
        reviewCount += 1;
      }
    }

    for (const workflowRun of workflowRuns) {
      const workflowValues = {
        repositoryId: connection.repositoryId,
        githubRunId: String(workflowRun.id),
        workflowName: workflowRun.name,
        branch: workflowRun.head_branch,
        status: workflowRun.status,
        conclusion: workflowRun.conclusion,
        createdAtGithub: new Date(workflowRun.created_at),
        startedAtGithub: nullableDate(workflowRun.run_started_at),
        completedAtGithub:
          workflowRun.status === "completed" ? new Date(workflowRun.updated_at) : null,
        syncedAt: now,
      };

      await tx
        .insert(githubWorkflowRuns)
        .values(workflowValues)
        .onConflictDoUpdate({
          target: githubWorkflowRuns.githubRunId,
          set: workflowValues,
        });
    }

    await tx
      .update(repositories)
      .set({ lastSyncedAt: now })
      .where(eq(repositories.id, connection.repositoryId));
  });

  const attention = await evaluateRepositoryAttention(
    connection.repositoryId,
    now,
    relevantWorkflowBranches,
  );
  const health = await recalculateProjectHealth(connection.projectId, now);

  return {
    issues: issues.length,
    pullRequests: pullRequests.length,
    reviews: reviewCount,
    workflowRuns: workflowRuns.length,
    attention: attention.active,
    health: health.overallScore,
    syncedAt: now,
  };
}
