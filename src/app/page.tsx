import { getCurrentUser } from "@/modules/auth/current-user";

const signals = [
  { label: "Project health", value: "--", caption: "Connect a repository to calculate" },
  { label: "Needs attention", value: "--", caption: "No repository connected" },
  { label: "Recent activity", value: "--", caption: "Waiting for real events" },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </div>
        <span className="status-pill">
          {user ? `Signed in as @${user.username}` : "Private alpha"}
        </span>
      </nav>

      <section className="hero">
        <p className="eyebrow">SOFTWARE PROJECT OBSERVABILITY</p>
        <h1>Know how your software is moving.</h1>
        <p className="hero-copy">
          GitHub tracks the work. DevBoard turns project activity into health,
          attention signals and context you can understand in seconds.
        </p>
        <div className="hero-actions">
          <a className="primary" href={user ? "/dashboard" : "/api/auth/github"}>
            {user ? "Open dashboard" : "Continue with GitHub"}
          </a>
          <span>
            {user
              ? "Your GitHub identity is connected."
              : "Read-only identity access for the first MVP."}
          </span>
        </div>
      </section>

      <section className="signal-grid" aria-label="DevBoard preview metrics">
        {signals.map((signal) => (
          <article className="signal-card" key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
            <p>{signal.caption}</p>
          </article>
        ))}
      </section>

      <section className="principle">
        <div>
          <p className="eyebrow">PRODUCT PRINCIPLE</p>
          <h2>What needs your attention?</h2>
        </div>
        <p>
          DevBoard does not replace GitHub Projects. It observes the development
          flow, detects signals that matter, and explains how they affect project health.
        </p>
      </section>
    </main>
  );
}
