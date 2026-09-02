import { LocaleSwitcher } from "@/components/locale-switcher";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getLocale, getMessages } from "@/modules/i18n";

export default async function Home() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getMessages(locale);
  const signals = [
    { label: t.projectHealth, value: "--", caption: t.connectRepoCalculate },
    { label: t.needsAttention, value: "--", caption: t.noRepositoryConnected },
    { label: t.recentActivity, value: "--", caption: t.waitingRealEvents },
  ];

  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </div>
        <div className="account-actions">
          <LocaleSwitcher locale={locale} returnTo="/" />
          <span className="status-pill">
            {user ? t.signedInAs(user.username) : t.privateAlpha}
          </span>
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">{t.eyebrowHome}</p>
        <h1>{t.homeTitle}</h1>
        <p className="hero-copy">{t.homeCopy}</p>
        <div className="hero-actions">
          <a className="primary" href={user ? "/dashboard" : "/api/auth/github"}>
            {user ? t.openDashboard : t.continueGithub}
          </a>
          <span>{user ? t.identityConnected : t.readonlyIdentity}</span>
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
          <p className="eyebrow">{t.productPrinciple}</p>
          <h2>{t.whatNeedsAttention}</h2>
        </div>
        <p>{t.principleCopy}</p>
      </section>
    </main>
  );
}
