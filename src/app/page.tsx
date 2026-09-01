const signals = [
  { label: "Project health", value: "--", caption: "Connect GitHub to calculate" },
  { label: "Needs attention", value: "--", caption: "No repository connected" },
  { label: "Recent activity", value: "--", caption: "Waiting for real events" },
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </div>
        <span className="status-pill">Development preview</span>
      </nav>

      <section className="hero">
        <p className="eyebrow">SOFTWARE PROJECT OBSERVABILITY</p>
        <h1>Know how your software is moving.</h1>
        <p className="hero-copy">
          GitHub tracks the work. DevBoard turns project activity into health,
          attention signals and context you can understand in seconds.
        </p>
        <div className="hero-actions">
          <button className="primary" type="button" disabled>
            Connect GitHub
          </button>
          <span>GitHub integration arrives in Sprint 1.</span>
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
