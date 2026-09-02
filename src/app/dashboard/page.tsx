import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
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
import {
  formatDateTime,
  getLocale,
  getMessages,
  localizeAttentionMessage,
  severityLabel,
  visibilityLabel,
} from "@/modules/i18n";

export default async function DashboardPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect("/");
  const t = getMessages(locale);

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
          <a className="secondary" href="/planning">
            {locale === "pt-BR" ? "Planejamento" : "Planning"}
          </a>
          <LocaleSwitcher locale={locale} returnTo="/dashboard" />
          <span className="status-pill">@{user.username}</span>
          <form action="/api/auth/logout" method="post">
            <button className="secondary" type="submit">
              {t.signOut}
            </button>
          </form>
        </div>
      </nav>

      <section className="hero dashboard-hero">
        <p className="eyebrow">{t.githubConnectionActive}</p>
        <h1>{t.welcome(user.name ?? user.username)}</h1>
        <p className="hero-copy">
          {hasSyncedData
            ? t.syncedHero
            : repositoryCount > 0
              ? t.repoConnectedHero
              : t.githubLinkedHero}
        </p>
        <div className="hero-actions">
          {appConfiguration ? (
            <a className="primary" href="/api/github/app/install">
              {t.connectRepositories}
            </a>
          ) : (
            <a className="primary" href="/api/github/app/manifest">
              {t.createGithubApp}
            </a>
          )}
          <span>{appConfiguration ? t.githubApp(appConfiguration.slug) : t.bootstrapHint}</span>
        </div>
      </section>

      <section
        className="signal-grid"
        aria-label={locale === "pt-BR" ? "Sinais dos repositórios" : "Repository signals"}
      >
        <article className="signal-card">
          <span>{t.repositories}</span>
          <strong>{repositoryCount}</strong>
          <p>{repositoryCount > 0 ? t.observedByDevboard : t.noRepoYet}</p>
        </article>
        <article className="signal-card">
          <span>{t.pullRequests}</span>
          <strong>{pullRequestCount}</strong>
          <p>{hasSyncedData ? t.normalizedFromGithub : t.waitingInitialSync}</p>
        </article>
        <article className="signal-card">
          <span>{t.needsAttention}</span>
          <strong>{hasSyncedData ? attentionCount : "--"}</strong>
          <p>
            {hasSyncedData
              ? t.observedIssuesWorkflows(issueCount, workflowRunCount)
              : t.waitingInitialSync}
          </p>
        </article>
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">{hasSyncedData ? t.attentionEngine : t.initialSync}</p>
          <h2>{hasSyncedData ? t.knowAttention : t.importSignals}</h2>
        </div>
        <p>{hasSyncedData ? t.attentionRulesCopy : t.tokenCopy}</p>
      </section>

      {hasSyncedData ? (
        <section
          className="repository-list"
          aria-label={locale === "pt-BR" ? "Itens ativos de atenção" : "Active attention items"}
        >
          {activeAttention.length > 0 ? (
            activeAttention.map((item) => (
              <article className="signal-card" key={item.id}>
                <span>
                  {severityLabel(locale, item.severity)} · {item.owner}/{item.name}
                </span>
                <strong className="signal-word">
                  {localizeAttentionMessage(locale, item.message)}
                </strong>
                <p>
                  {t.detected}: {formatDateTime(locale, item.detectedAt)}
                </p>
              </article>
            ))
          ) : (
            <article className="signal-card">
              <span>{t.attention}</span>
              <strong className="signal-word">{t.noActiveSignals}</strong>
              <p>{t.noActiveSignalsCopy}</p>
            </article>
          )}
        </section>
      ) : null}

      {connectedRepositories.length > 0 ? (
        <section
          className="repository-list"
          aria-label={locale === "pt-BR" ? "Repositórios conectados" : "Connected repositories"}
        >
          {connectedRepositories.map((repository) => (
            <article className="signal-card" key={repository.id}>
              <span>{visibilityLabel(locale, repository.visibility)}</span>
              <strong className="signal-word">
                {repository.owner}/{repository.name}
              </strong>
              <p>
                {t.defaultBranch}: {repository.defaultBranch}
              </p>
              <p>
                {t.lastSync}:{" "}
                {repository.lastSyncedAt
                  ? formatDateTime(locale, repository.lastSyncedAt)
                  : t.never}
              </p>
              <form action="/api/github/sync" method="post">
                <input name="repositoryId" type="hidden" value={repository.id} />
                <button className="secondary" type="submit">
                  {repository.lastSyncedAt ? t.syncAgain : t.syncNow}
                </button>
              </form>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
