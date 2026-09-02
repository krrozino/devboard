import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { githubAppConfigurations, projects, repositories } from "@/db/schema";
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
    })
    .from(repositories)
    .innerJoin(projects, eq(projects.id, repositories.projectId))
    .where(eq(projects.userId, user.id));

  const repositoryCount = connectedRepositories.length;

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
        <p className="eyebrow">GITHUB IDENTITY CONNECTED</p>
        <h1>Welcome, {user.name ?? user.username}.</h1>
        <p className="hero-copy">
          {repositoryCount > 0
            ? "DevBoard can now observe real repositories. The next slice will ingest pull requests, issues and workflow activity."
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

      <section className="signal-grid" aria-label="DevBoard account status">
        <article className="signal-card">
          <span>Identity</span>
          <strong className="signal-word">Connected</strong>
          <p>GitHub user #{user.githubId}</p>
        </article>
        <article className="signal-card">
          <span>Repositories</span>
          <strong>{repositoryCount}</strong>
          <p>{repositoryCount > 0 ? "Observed by DevBoard" : "No repository connected yet"}</p>
        </article>
        <article className="signal-card">
          <span>Needs attention</span>
          <strong>--</strong>
          <p>{repositoryCount > 0 ? "Attention Engine is next" : "Waiting for repository data"}</p>
        </article>
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">NEXT VERTICAL SLICE</p>
          <h2>{repositoryCount > 0 ? "Ingest real engineering signals." : "Connect a real repository."}</h2>
        </div>
        <p>
          {repositoryCount > 0
            ? "The repository connection is ready. Next, DevBoard will normalize pull requests, issues, reviews and workflow runs into activity and attention signals."
            : "The GitHub App uses read-only repository permissions. You choose which repositories DevBoard can access during installation."}
        </p>
      </section>

      {connectedRepositories.length > 0 ? (
        <section className="repository-list" aria-label="Connected repositories">
          {connectedRepositories.map((repository) => (
            <article className="signal-card" key={repository.id}>
              <span>{repository.visibility}</span>
              <strong className="signal-word">
                {repository.owner}/{repository.name}
              </strong>
              <p>Default branch: {repository.defaultBranch}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
