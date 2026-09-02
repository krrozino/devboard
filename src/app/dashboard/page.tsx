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
import { listLatestProjectHealth } from "@/modules/health/dashboard";
import {
  formatDateTime,
  getLocale,
  getMessages,
  localizeAttentionMessage,
  severityLabel,
  visibilityLabel,
  type Locale,
} from "@/modules/i18n";

function healthStatusLabel(locale: Locale, status: string) {
  if (locale === "en") {
    if (status === "HEALTHY") return "Healthy";
    if (status === "ATTENTION") return "Attention";
    if (status === "AT_RISK") return "At risk";
    return status;
  }

  if (status === "HEALTHY") return "Saudável";
  if (status === "ATTENTION") return "Atenção";
  if (status === "AT_RISK") return "Em risco";
  return status;
}

function dimensionLabel(locale: Locale, dimension: string) {
  if (locale === "en") return dimension;
  const labels: Record<string, string> = {
    DEVELOPMENT: "Desenvolvimento",
    REVIEW: "Review",
    DELIVERY: "Entrega",
    PLANNING: "Planejamento",
  };
  return labels[dimension] ?? dimension;
}

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

  const [[pullRequestMetric], [issueMetric], [workflowMetric], activeAttention, latestHealth] =
    await Promise.all([
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
      listLatestProjectHealth(user.id),
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

      {latestHealth.length > 0 ? (
        <section className="health-section" aria-label={t.projectHealth}>
          <div className="principle health-heading">
            <div>
              <p className="eyebrow">
                {locale === "pt-BR" ? "SAÚDE DO PROJETO" : "PROJECT HEALTH"}
              </p>
              <h2>
                {locale === "pt-BR"
                  ? "Entenda por que o projeto está saudável ou em risco."
                  : "Know why the project is healthy or at risk."}
              </h2>
            </div>
            <p>
              {locale === "pt-BR"
                ? "O score é determinístico e explicável. Cada ponto perdido vem de um sinal concreto de engenharia, nunca de uma avaliação opaca de IA."
                : "The score is deterministic and explainable. Every lost point comes from a concrete engineering signal, never from an opaque AI judgment."}
            </p>
          </div>

          <div className="health-project-list">
            {latestHealth.map((health) => (
              <article className="health-project-card" key={health.snapshotId}>
                <header className="health-project-header">
                  <div>
                    <span>{health.projectName}</span>
                    <strong>
                      {health.overallScore}
                      <small>{healthStatusLabel(locale, health.status)}</small>
                    </strong>
                    <p>
                      {locale === "pt-BR" ? "Calculado em" : "Calculated at"}:{" "}
                      {formatDateTime(locale, health.createdAt)}
                    </p>
                  </div>
                  <div className={`health-status health-status-${health.status.toLowerCase()}`}>
                    {healthStatusLabel(locale, health.status)}
                  </div>
                </header>

                <div className="health-dimensions">
                  <div>
                    <span>{locale === "pt-BR" ? "Desenvolvimento" : "Development"}</span>
                    <strong>{health.developmentScore}</strong>
                  </div>
                  <div>
                    <span>Review</span>
                    <strong>{health.reviewScore}</strong>
                  </div>
                  <div>
                    <span>{locale === "pt-BR" ? "Entrega" : "Delivery"}</span>
                    <strong>{health.deliveryScore}</strong>
                  </div>
                  {health.planningScore !== null ? (
                    <div>
                      <span>{locale === "pt-BR" ? "Planejamento" : "Planning"}</span>
                      <strong>{health.planningScore}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="health-reasons">
                  <div className="health-reasons-heading">
                    <strong>{locale === "pt-BR" ? "Tendência recente" : "Recent trend"}</strong>
                    <span>
                      {locale === "pt-BR"
                        ? `${health.trend.length} snapshot${health.trend.length === 1 ? "" : "s"}`
                        : `${health.trend.length} snapshot${health.trend.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {health.trend.map((point, index) => (
                      <span
                        className="status-pill"
                        key={`${point.createdAt.toISOString()}:${index}`}
                        title={formatDateTime(locale, point.createdAt)}
                      >
                        {point.score} · {healthStatusLabel(locale, point.status)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="health-reasons" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="health-reasons-heading">
                    <strong>{locale === "pt-BR" ? "Por quê?" : "Why?"}</strong>
                    <span>
                      {health.reasons.length === 0
                        ? locale === "pt-BR"
                          ? "Nenhuma penalidade ativa"
                          : "No active penalties"
                        : locale === "pt-BR"
                          ? `${health.reasons.length} penalidade${health.reasons.length === 1 ? "" : "s"}`
                          : `${health.reasons.length} ${health.reasons.length === 1 ? "penalty" : "penalties"}`}
                    </span>
                  </div>

                  {health.reasons.length > 0 ? (
                    <div className="health-reason-list">
                      {health.reasons.map((reason) => (
                        <div className="health-reason" key={`${reason.sourceId}:${reason.dimension}`}>
                          <span className="health-impact">{reason.impact}</span>
                          <div>
                            <strong>{dimensionLabel(locale, reason.dimension)}</strong>
                            <p>{localizeAttentionMessage(locale, reason.message)}</p>
                            {reason.url ? (
                              <a
                                href={reason.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "inline-block",
                                  marginTop: 8,
                                  color: "var(--accent)",
                                  fontSize: 12,
                                  textDecoration: "none",
                                }}
                              >
                                {locale === "pt-BR" ? "Abrir sinal no GitHub →" : "Open signal on GitHub →"}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="health-clean-copy">
                      {locale === "pt-BR"
                        ? "Nenhum sinal ativo está reduzindo o Health Score neste snapshot."
                        : "No active signal is reducing the Health Score in this snapshot."}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
