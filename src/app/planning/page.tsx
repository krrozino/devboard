import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getCurrentUser } from "@/modules/auth/current-user";
import { formatDateTime, getLocale } from "@/modules/i18n";
import {
  decryptPlanningToken,
  getPlanningConnection,
  getUserPlanningBoard,
  listUserGithubProjects,
  type PlanningCard,
} from "@/modules/planning/github-projects";

const copy = {
  "pt-BR": {
    planning: "PLANEJAMENTO",
    title: "Scrum sem duplicar o trabalho.",
    description:
      "O GitHub Projects continua sendo a fonte de verdade. O DevBoard organiza Sprint, Board e Backlog para você enxergar o planejamento junto dos sinais de engenharia.",
    dashboard: "Painel",
    connect: "Conectar GitHub Projects",
    reconnect: "Reconectar Projects",
    permission:
      "Acesso somente leitura. O DevBoard não move cartões nem altera seu Project nesta versão.",
    selectProject: "Escolha um GitHub Project",
    selectProjectCopy: "Selecione qual Project o DevBoard deve usar como contexto de planejamento.",
    useProject: "Usar este Project",
    noProjects: "Nenhum GitHub Project encontrado na sua conta.",
    noProjectsCopy: "Crie um Project no GitHub e volte aqui para conectá-lo ao DevBoard.",
    currentSprint: "SPRINT ATUAL",
    noCurrentSprint: "SEM SPRINT ATUAL",
    allItemsBoard: "Nenhuma Iteration ativa foi encontrada; o board mostra todos os itens do Project.",
    board: "Board",
    backlog: "Backlog",
    backlogCopy: "Itens fora da Sprint atual.",
    emptyColumn: "Nenhum item nesta coluna.",
    noBacklog: "Nada fora da Sprint atual.",
    noStatus: "Sem status",
    items: "itens",
    openGithub: "Abrir no GitHub",
    project: "Project",
    changeProject: "Trocar Project",
    connected: "Projects conectado",
    privateGrant: "Token criptografado no DevBoard",
  },
  en: {
    planning: "PLANNING",
    title: "Scrum without duplicating the work.",
    description:
      "GitHub Projects remains the source of truth. DevBoard organizes Sprint, Board and Backlog so planning sits next to engineering signals.",
    dashboard: "Dashboard",
    connect: "Connect GitHub Projects",
    reconnect: "Reconnect Projects",
    permission: "Read-only access. DevBoard does not move cards or modify your Project in this version.",
    selectProject: "Choose a GitHub Project",
    selectProjectCopy: "Select which Project DevBoard should use as planning context.",
    useProject: "Use this Project",
    noProjects: "No GitHub Projects found in your account.",
    noProjectsCopy: "Create a Project on GitHub and return here to connect it to DevBoard.",
    currentSprint: "CURRENT SPRINT",
    noCurrentSprint: "NO CURRENT SPRINT",
    allItemsBoard: "No active Iteration was found; the board shows all items in the Project.",
    board: "Board",
    backlog: "Backlog",
    backlogCopy: "Items outside the current Sprint.",
    emptyColumn: "No items in this column.",
    noBacklog: "Nothing outside the current Sprint.",
    noStatus: "No status",
    items: "items",
    openGithub: "Open on GitHub",
    project: "Project",
    changeProject: "Change Project",
    connected: "Projects connected",
    privateGrant: "Token encrypted in DevBoard",
  },
} as const;

function Card({ card, openGithub }: { card: PlanningCard; openGithub: string }) {
  return (
    <article className="planning-card">
      <div className="planning-card-meta">
        <span>{card.type.replaceAll("_", " ")}</span>
        {card.repository ? <span>{card.repository}</span> : null}
      </div>
      <strong>{card.number ? `#${card.number} · ${card.title}` : card.title}</strong>
      {card.labels.length > 0 ? (
        <div className="planning-labels">
          {card.labels.slice(0, 4).map((label) => (
            <span key={label.name}>{label.name}</span>
          ))}
        </div>
      ) : null}
      <div className="planning-card-footer">
        <span>
          {card.assignees.length > 0
            ? card.assignees.map((assignee) => `@${assignee.login}`).join(", ")
            : "—"}
        </span>
        {card.url ? (
          <a href={card.url} target="_blank" rel="noreferrer">
            {openGithub}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default async function PlanningPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect("/");
  const t = copy[locale];
  const connection = await getPlanningConnection(user.id);

  let projects = [] as Awaited<ReturnType<typeof listUserGithubProjects>>;
  let board: Awaited<ReturnType<typeof getUserPlanningBoard>> | null = null;
  let connectionError = false;

  if (connection) {
    try {
      const token = decryptPlanningToken(connection.oauthTokenEncrypted);
      projects = await listUserGithubProjects(token, user.username);
      if (connection.selectedProjectNumber) {
        board = await getUserPlanningBoard(token, connection.selectedProjectNumber);
      }
    } catch (error) {
      connectionError = true;
      console.error("planning_page_load_failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  const boardCards = board?.sprintCards ?? [];
  const columns = board
    ? [
        ...board.statusOptions.map((status) => ({ id: status.id, name: status.name })),
        { id: "__none__", name: t.noStatus },
      ].filter((column, index, all) => {
        if (column.id !== "__none__") return true;
        return boardCards.some((card) => !card.statusOptionId) || all.length === 1;
      })
    : [];

  return (
    <main className="shell planning-shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>DevBoard</span>
        </div>
        <div className="account-actions">
          <a className="secondary" href="/dashboard">
            {t.dashboard}
          </a>
          <LocaleSwitcher locale={locale} returnTo="/planning" />
          <span className="status-pill">@{user.username}</span>
        </div>
      </nav>

      <section className="planning-header">
        <div>
          <p className="eyebrow">{t.planning}</p>
          <h1>{t.title}</h1>
          <p className="hero-copy">{t.description}</p>
        </div>
        <div className="planning-connection-card">
          <span>{connection && !connectionError ? t.connected : t.planning}</span>
          <strong>{connection && !connectionError ? t.privateGrant : t.connect}</strong>
          <p>{t.permission}</p>
          <a className="primary" href="/api/github/projects/connect">
            {connection ? t.reconnect : t.connect}
          </a>
        </div>
      </section>

      {connection && !connectionError && !board ? (
        <section className="planning-project-picker">
          <div className="section-heading">
            <p className="eyebrow">{t.project}</p>
            <h2>{t.selectProject}</h2>
            <p>{t.selectProjectCopy}</p>
          </div>
          {projects.length > 0 ? (
            <div className="project-choice-grid">
              {projects.map((project) => (
                <article className="project-choice" key={project.node_id}>
                  <span>#{project.number}</span>
                  <strong>{project.title}</strong>
                  <p>{project.short_description ?? "GitHub Project"}</p>
                  <form action="/api/github/projects/select" method="post">
                    <input type="hidden" name="projectNumber" value={project.number} />
                    <button className="primary" type="submit">
                      {t.useProject}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <article className="signal-card">
              <span>{t.project}</span>
              <strong className="signal-word">{t.noProjects}</strong>
              <p>{t.noProjectsCopy}</p>
            </article>
          )}
        </section>
      ) : null}

      {board ? (
        <>
          <section className="planning-project-bar">
            <div>
              <span>{t.project}</span>
              <strong>{board.project.title}</strong>
            </div>
            <div className="planning-project-actions">
              <a href={board.project.url} target="_blank" rel="noreferrer" className="secondary">
                {t.openGithub}
              </a>
              <a href="/api/github/projects/connect" className="secondary">
                {t.changeProject}
              </a>
            </div>
          </section>

          <section className="sprint-summary">
            <p className="eyebrow">{board.currentIteration ? t.currentSprint : t.noCurrentSprint}</p>
            <h2>{board.currentIteration?.title ?? board.project.title}</h2>
            <p>
              {board.currentIteration
                ? `${board.currentIteration.startDate} → ${board.currentIteration.endDate} · ${board.sprintCards.length} ${t.items}`
                : t.allItemsBoard}
            </p>
          </section>

          <section className="planning-board-section">
            <div className="section-heading compact">
              <h2>{t.board}</h2>
              <span>{boardCards.length} {t.items}</span>
            </div>
            <div className="planning-board">
              {columns.map((column) => {
                const cards = boardCards.filter((card) =>
                  column.id === "__none__"
                    ? !card.statusOptionId
                    : card.statusOptionId === column.id,
                );
                return (
                  <section className="planning-column" key={column.id}>
                    <header>
                      <strong>{column.name}</strong>
                      <span>{cards.length}</span>
                    </header>
                    <div className="planning-column-items">
                      {cards.length > 0 ? (
                        cards.map((card) => <Card card={card} openGithub={t.openGithub} key={card.id} />)
                      ) : (
                        <p className="planning-empty">{t.emptyColumn}</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          {board.currentIteration ? (
            <section className="planning-backlog">
              <div className="section-heading compact">
                <div>
                  <h2>{t.backlog}</h2>
                  <p>{t.backlogCopy}</p>
                </div>
                <span>{board.backlogCards.length} {t.items}</span>
              </div>
              <div className="backlog-list">
                {board.backlogCards.length > 0 ? (
                  board.backlogCards.map((card) => <Card card={card} openGithub={t.openGithub} key={card.id} />)
                ) : (
                  <p className="planning-empty">{t.noBacklog}</p>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {connection?.updatedAt ? (
        <p className="planning-footnote">
          {locale === "pt-BR" ? "Conexão atualizada em" : "Connection updated"}: {formatDateTime(locale, connection.updatedAt)}
        </p>
      ) : null}
    </main>
  );
}
