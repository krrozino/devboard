import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getLocale } from "@/modules/i18n";

const helpCopy = {
  "pt-BR": {
    eyebrow: "CENTRAL DE AJUDA",
    title: "Se perder faz parte. Ficar perdido, não.",
    intro:
      "Use esta central para entender o DevBoard sem precisar sair da plataforma. Os atalhos abaixo explicam desde a conexão com o GitHub até Health, Attention e Sprints.",
    dashboard: "Painel",
    planning: "Planejamento",
    quickStart: "Primeiros passos",
    quickStartCopy:
      "O fluxo básico é: entrar com GitHub, conectar repositórios, sincronizar e então usar Attention, Health e Planejamento para entender o projeto.",
    connectTitle: "1. Conectar o GitHub",
    connectCopy:
      "O login identifica você. O GitHub App dá ao DevBoard acesso somente aos repositórios que você escolher. Você pode adicionar ou remover repositórios depois.",
    syncTitle: "2. Sincronizar um repositório",
    syncCopy:
      "Sincronizar importa e normaliza issues, pull requests, reviews e execuções de workflow. Depois do sync, Attention e Health são recalculados automaticamente.",
    attentionTitle: "Attention: o que precisa de atenção?",
    attentionCopy:
      "Attention transforma sinais técnicos em alertas acionáveis. Hoje ele observa PRs sem review, issues paradas e workflows falhando. A severidade indica urgência, não produtividade de uma pessoa.",
    healthTitle: "Health: como o score funciona?",
    healthCopy:
      "O Health Score começa em 100 e perde pontos apenas por sinais concretos e explicáveis. Desenvolvimento, Review e Entrega são calculados separadamente. Planejamento entra quando houver contexto suficiente.",
    healthTip:
      "Sempre confira a seção ‘Por quê?’. Ela mostra exatamente quais sinais reduziram o score e, quando possível, leva direto ao item no GitHub.",
    planningTitle: "Planejamento, Sprint e Backlog",
    planningCopy:
      "O GitHub Projects continua sendo a fonte de verdade. O DevBoard apenas organiza o Project em uma visão de Sprint, Board e Backlog. Nesta versão o acesso é somente leitura.",
    planningTip:
      "Itens com a Iteration atual aparecem na Sprint. Itens fora dela aparecem no Backlog. As colunas são lidas do campo Status do GitHub Project.",
    statusesTitle: "O que significam os status?",
    statusesCopy:
      "Backlog = ainda não selecionado; Ready = pronto para começar; In Progress = em execução; Review = aguardando revisão/validação; Done = concluído.",
    troubleshooting: "Problemas comuns",
    noRepo: "Não aparece nenhum repositório",
    noRepoCopy:
      "Use ‘Conectar repositórios’ e confirme no GitHub que o DevBoard App tem acesso ao repositório desejado.",
    noProject: "Não aparece nenhum GitHub Project",
    noProjectCopy:
      "Crie um Project pessoal no GitHub e depois use ‘Reconectar Projects’. O acesso de Planejamento é uma autorização separada e somente leitura.",
    oldData: "Os números parecem antigos",
    oldDataCopy:
      "Use ‘Sincronizar novamente’ no card do repositório. A sincronização atualiza os dados, reconcilia alerts e cria um novo snapshot de Health.",
    healthLower: "O Health caiu e eu não sei por quê",
    healthLowerCopy:
      "Abra ‘Por quê?’ no card de Health. Cada penalidade informa a dimensão afetada, o impacto e o sinal que causou a perda de pontos.",
    stillLost: "Ainda ficou com dúvida?",
    stillLostCopy:
      "Volte ao Painel e use os links ‘Como funciona?’ próximos de Health, Attention e Planejamento. A ajuda contextual sempre traz você para a seção relevante desta central.",
  },
  en: {
    eyebrow: "HELP CENTER",
    title: "Getting lost happens. Staying lost shouldn't.",
    intro:
      "Use this Help Center to understand DevBoard without leaving the product. The shortcuts below cover everything from GitHub connection to Health, Attention and Sprints.",
    dashboard: "Dashboard",
    planning: "Planning",
    quickStart: "Getting started",
    quickStartCopy:
      "The basic flow is: sign in with GitHub, connect repositories, sync, then use Attention, Health and Planning to understand the project.",
    connectTitle: "1. Connect GitHub",
    connectCopy:
      "Login identifies you. The GitHub App gives DevBoard access only to repositories you choose. You can add or remove repositories later.",
    syncTitle: "2. Sync a repository",
    syncCopy:
      "Sync imports and normalizes issues, pull requests, reviews and workflow runs. After sync, Attention and Health are recalculated automatically.",
    attentionTitle: "Attention: what needs attention?",
    attentionCopy:
      "Attention turns technical signals into actionable alerts. Today it watches PRs without review, stale issues and failing workflows. Severity means urgency, not individual productivity.",
    healthTitle: "Health: how does the score work?",
    healthCopy:
      "Health starts at 100 and only loses points for concrete, explainable signals. Development, Review and Delivery are calculated separately. Planning is included when enough context is available.",
    healthTip:
      "Always check the ‘Why?’ section. It shows exactly which signals reduced the score and links to the GitHub item when possible.",
    planningTitle: "Planning, Sprint and Backlog",
    planningCopy:
      "GitHub Projects remains the source of truth. DevBoard only organizes the Project into Sprint, Board and Backlog views. Access is read-only in this version.",
    planningTip:
      "Items assigned to the current Iteration appear in the Sprint. Items outside it appear in Backlog. Columns come from the GitHub Project Status field.",
    statusesTitle: "What do the statuses mean?",
    statusesCopy:
      "Backlog = not selected yet; Ready = ready to start; In Progress = being worked on; Review = waiting for review/validation; Done = completed.",
    troubleshooting: "Common problems",
    noRepo: "No repository appears",
    noRepoCopy:
      "Use ‘Connect repositories’ and confirm in GitHub that the DevBoard App can access the repository you want.",
    noProject: "No GitHub Project appears",
    noProjectCopy:
      "Create a personal Project on GitHub and then use ‘Reconnect Projects’. Planning access is a separate, read-only authorization.",
    oldData: "The numbers look outdated",
    oldDataCopy:
      "Use ‘Sync again’ on the repository card. Sync refreshes data, reconciles alerts and creates a new Health snapshot.",
    healthLower: "Health dropped and I don't know why",
    healthLowerCopy:
      "Open ‘Why?’ in the Health card. Each penalty shows the affected dimension, impact and the signal that caused the score loss.",
    stillLost: "Still unsure?",
    stillLostCopy:
      "Return to Dashboard and use the ‘How does this work?’ links near Health, Attention and Planning. Contextual help brings you directly to the relevant section here.",
  },
} as const;

function HelpTopic({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="signal-card"
      style={{ minHeight: 0, border: "1px solid var(--border)", borderRadius: 14 }}
    >
      <strong className="signal-word" style={{ marginTop: 0, fontSize: 28 }}>
        {title}
      </strong>
      <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </article>
  );
}

export default async function HelpPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect("/");
  const t = helpCopy[locale];

  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </a>
        <div className="account-actions">
          <a className="secondary" href="/dashboard">{t.dashboard}</a>
          <a className="secondary" href="/planning">{t.planning}</a>
          <LocaleSwitcher locale={locale} returnTo="/help" />
          <span className="status-pill">@{user.username}</span>
        </div>
      </nav>

      <section className="hero" style={{ paddingBottom: 44 }}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="hero-copy">{t.intro}</p>
        <div className="hero-actions" style={{ flexWrap: "wrap" }}>
          <a className="secondary" href="#getting-started">{t.quickStart}</a>
          <a className="secondary" href="#attention">Attention</a>
          <a className="secondary" href="#health">Health</a>
          <a className="secondary" href="#planning">{t.planning}</a>
          <a className="secondary" href="#troubleshooting">{t.troubleshooting}</a>
        </div>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <HelpTopic id="getting-started" title={t.quickStart}>
          <p>{t.quickStartCopy}</p>
          <p><strong style={{ color: "var(--text)" }}>{t.connectTitle}</strong><br />{t.connectCopy}</p>
          <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text)" }}>{t.syncTitle}</strong><br />{t.syncCopy}</p>
        </HelpTopic>

        <HelpTopic id="attention" title={t.attentionTitle}>
          <p style={{ marginBottom: 0 }}>{t.attentionCopy}</p>
        </HelpTopic>

        <HelpTopic id="health" title={t.healthTitle}>
          <p>{t.healthCopy}</p>
          <p style={{ marginBottom: 0 }}>{t.healthTip}</p>
        </HelpTopic>

        <HelpTopic id="planning" title={t.planningTitle}>
          <p>{t.planningCopy}</p>
          <p>{t.planningTip}</p>
          <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text)" }}>{t.statusesTitle}</strong><br />{t.statusesCopy}</p>
        </HelpTopic>

        <HelpTopic id="troubleshooting" title={t.troubleshooting}>
          <p><strong style={{ color: "var(--text)" }}>{t.noRepo}</strong><br />{t.noRepoCopy}</p>
          <p><strong style={{ color: "var(--text)" }}>{t.noProject}</strong><br />{t.noProjectCopy}</p>
          <p><strong style={{ color: "var(--text)" }}>{t.oldData}</strong><br />{t.oldDataCopy}</p>
          <p style={{ marginBottom: 0 }}><strong style={{ color: "var(--text)" }}>{t.healthLower}</strong><br />{t.healthLowerCopy}</p>
        </HelpTopic>

        <HelpTopic id="still-lost" title={t.stillLost}>
          <p style={{ marginBottom: 0 }}>{t.stillLostCopy}</p>
        </HelpTopic>
      </section>
    </main>
  );
}
