import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

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
          Your DevBoard account is now linked to GitHub. The next step is connecting
          repositories through the DevBoard GitHub App.
        </p>
      </section>

      <section className="signal-grid" aria-label="DevBoard account status">
        <article className="signal-card">
          <span>Identity</span>
          <strong className="signal-word">Connected</strong>
          <p>GitHub user #{user.githubId}</p>
        </article>
        <article className="signal-card">
          <span>Repositories</span>
          <strong>0</strong>
          <p>GitHub App integration is next</p>
        </article>
        <article className="signal-card">
          <span>Needs attention</span>
          <strong>--</strong>
          <p>No repository is being observed yet</p>
        </article>
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">NEXT VERTICAL SLICE</p>
          <h2>Connect a real repository.</h2>
        </div>
        <p>
          Once the GitHub App is installed, DevBoard can ingest real pull requests,
          issues and workflow signals instead of displaying placeholder data.
        </p>
      </section>
    </main>
  );
}
