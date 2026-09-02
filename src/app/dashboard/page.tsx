import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  attentionItems,
  githubAppConfigurations,
  githubIssues,
  githubPullRequests,
  githubWorkflowRuns,
  projects,
  repositories,
} from "@/db/schema";
import { getCurrentUser } from "@/modules/auth/current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [appConfiguration] = await db
    .select({ id: githubAppConfigurations.id, slug: githubAppConfigurations.slug })
    .from(githubAppConfigurations)
    .limit(1);

  const connectedRepositories = await db
    .select({
      id: repositories.id,
      owner: repositories.owner,
      name: repositories.name,
      visibility: repositories.visibility,
      defaultBranch: repositories.defaultBranch,
      lastSyncedAt: repositories.lastSyncedAt,
    })
    .from(repositories)
    .innerJoin(projects, eq(projects.id, repositories.projectId))
    .where(eq(projects.userId, user.id));

  const repositoryCount = connectedRepositories.length;

  const [[pullRequestMetric], [issueMetric], [workflowMetric], activeAttention] = await Promise.all([
    db
      .select({ value: count() })
      .from(githubPullRequests)
      .innerJoin(repositories, eq(repositories.id, githubPullRequests.repositoryId))
      .innerJoin(projects, eq(projects.id, repositories.projectId))
      .where(eq(projects.userId, user.id)),
    db
      .select({ value: count() })
      .from(githubIssues)
      .innerJoin(repositories, eq(repositories.id, githubIssues.repositoryId))
      .innerJoin(projects, eq(projects.id, repositories.projectId))
      .where(eq(projects.userId, user.id)),
    db
      .select({ value: count() })
      .from(githubWorkflowRuns)
      .innerJoin(repositories, eq(repositories.id, githubWorkflowRuns.repositoryId))
      .innerJoin(projects, eq(projects.id, repositories.projectId))
      .where(eq(projects.userId, user.id)),
    db
      .select({
        id: attentionItems.id,
        severity: attentionItems.severity,
        message: attentionItems.message,
        detectedAt: attentionItems.detectedAt,
        owner: repositories.owner,
        name: repositories.name,
      })
      .from(attentionItems)
      .innerJoin(repositories, eq(repositories.id, attentionItems.repositoryId))
      .innerJoin(projects, eq(projects.id, repositories.projectId))
      .where(and(eq(projects.userId, user.id), eq(attentionItems.status, "ACTIVE")))
      .orderBy(desc(attentionItems.detectedAt)),
  ]);

  const pullRequestCount = pullRequestMetric?.value ?? 0;
  const issueCount = issueMetric?.value ?? 0;
  const workflowRunCount = workflowMetric?.value ?? 0;
  const attentionCount = activeAttention.length;
  const hasSyncedData = connectedRepositories.some((repository) => repository.lastSyncedAt);

  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </div>
        <div className="account-actions">
          <span className="status-pill">@{user.username}</span>
          <form action="/api/auth/logout" method="post">
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <section className="hero dashboard-hero">
        <p className="eyebrow">GITHUB CONNECTION ACTIVE</p>
        <h1>Welcome, {user.name ?? user.username}.</h1>
        <p className="hero-copy">
          {hasSyncedData
            ? "DevBoard is reading normalized engineering signals and converting them into deterministic attention."
            : repositoryCount > 0
              ? "Your first repository is connected. Run the initial sync to import pull requests, issues, reviews and workflows."
              : "Your DevBoard account is linked to GitHub. Connect the DevBoard GitHub App to start observing real repositories."}
        </p>
        <div className="hero-actions">
          {appConfiguration ? (
            <a className="primary" href="/api/github/app/install">
              Connect repositories
            </a>
          ) : (
            <a className="primary" href="/api/github/app/manifest">
              Create DevBoard GitHub App
            </a>
          )}
          <span>
            {appConfiguration
              ? `GitHub App: ${appConfiguration.slug}`
              : "One-time bootstrap. Permissions are preconfigured."}
          </span>
        </div>
      </section>

      <section className="signal-grid" aria-label="DevBoard repository signals">
        <article className="signal-card">
          <span>Repositories</span>
          <strong>{repositoryCount}</strong>
          <p>{repositoryCount > 0 ? "Observed by DevBoard" : "No repository connected yet"}</p>
        </article>
        <article className="signal-card">
          <span>Pull requests</span>
          <strong>{pullRequestCount}</strong>
          <p>{hasSyncedData ? "Normalized from GitHub" : "Waiting for initial sync"}</p>
        </article>
        <article className="signal-card">
          <span>Needs attention</span>
          <strong>{hasSyncedData ? attentionCount : "--"}</strong>
          <p>
            {hasSyncedData
              ? `${issueCount} issues · ${workflowRunCount} workflow runs observed`
              : "Waiting for initial sync"}
          </p>
        </article>
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">{hasSyncedData ? "ATTENTION ENGINE" : "INITIAL SYNC"}</p>
          <h2>{hasSyncedData ? "Know what needs attention." : "Import real engineering signals."}</h2>
        </div>
        <p>
          {hasSyncedData
            ? "DevBoard currently evaluates explainable rules for pull requests waiting on review, stale issues and failed workflows."
            : "Sync uses a short-lived GitHub App installation token. DevBoard never stores that token in PostgreSQL."}
        </p>
      </section>

      {hasSyncedData ? (
        <section className="repository-list" aria-label="Active attention items">
          {activeAttention.length > 0 ? (
            activeAttention.map((item) => (
              <article className="signal-card" key={item.id}>
                <span>{item.severity} · {item.owner}/{item.name}</span>
                <strong className="signal-word">{item.message}</strong>
                <p>Detected: {item.detectedAt.toISOString()}</p>
              </article>
            ))
          ) : (
            <article className="signal-card">
              <span>Attention</span>
              <strong className="signal-word">No active signals.</strong>
              <p>The current deterministic rules did not find anything requiring attention.</p>
            </article>
          )}
        </section>
      ) : null}

      {connectedRepositories.length > 0 ? (
        <section className="repository-list" aria-label="Connected repositories">
          {connectedRepositories.map((repository) => (
            <article className="signal-card" key={repository.id}>
              <span>{repository.visibility}</span>
              <strong className="signal-word">
                {repository.owner}/{repository.name}
              </strong>
              <p>Default branch: {repository.defaultBranch}</p>
              <p>
                Last sync: {repository.lastSyncedAt ? repository.lastSyncedAt.toISOString() : "never"}
              </p>
              <form action="/api/github/sync" method="post">
                <input name="repositoryId" type="hidden" value={repository.id} />
                <button className="secondary" type="submit">
                  {repository.lastSyncedAt ? "Sync again" : "Sync now"}
                </button>
              </form>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
