import { cookies } from "next/headers";

export const supportedLocales = ["pt-BR", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

const LOCALE_COOKIE = "devboard_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "pt-BR";
}

export const localeCookieName = LOCALE_COOKIE;

type Messages = {
  privateAlpha: string;
  signedInAs: (username: string) => string;
  eyebrowHome: string;
  homeTitle: string;
  homeCopy: string;
  openDashboard: string;
  continueGithub: string;
  identityConnected: string;
  readonlyIdentity: string;
  projectHealth: string;
  connectRepoCalculate: string;
  needsAttention: string;
  noRepositoryConnected: string;
  recentActivity: string;
  waitingRealEvents: string;
  productPrinciple: string;
  whatNeedsAttention: string;
  principleCopy: string;
  githubConnectionActive: string;
  welcome: (name: string) => string;
  syncedHero: string;
  repoConnectedHero: string;
  githubLinkedHero: string;
  connectRepositories: string;
  createGithubApp: string;
  githubApp: (slug: string) => string;
  bootstrapHint: string;
  repositories: string;
  observedByDevboard: string;
  noRepoYet: string;
  pullRequests: string;
  normalizedFromGithub: string;
  waitingInitialSync: string;
  observedIssuesWorkflows: (issues: number, workflows: number) => string;
  attentionEngine: string;
  initialSync: string;
  knowAttention: string;
  importSignals: string;
  attentionRulesCopy: string;
  tokenCopy: string;
  attention: string;
  noActiveSignals: string;
  noActiveSignalsCopy: string;
  detected: string;
  defaultBranch: string;
  lastSync: string;
  never: string;
  syncAgain: string;
  syncNow: string;
  signOut: string;
  public: string;
  private: string;
  internal: string;
  language: string;
};

const dictionaries: Record<Locale, Messages> = {
  "pt-BR": {
    privateAlpha: "Alpha privado",
    signedInAs: (username) => `Conectado como @${username}`,
    eyebrowHome: "OBSERVABILIDADE DE PROJETOS DE SOFTWARE",
    homeTitle: "Entenda como seu software está evoluindo.",
    homeCopy:
      "O GitHub acompanha o trabalho. O DevBoard transforma a atividade do projeto em saúde, sinais de atenção e contexto que você entende em segundos.",
    openDashboard: "Abrir painel",
    continueGithub: "Continuar com GitHub",
    identityConnected: "Sua identidade do GitHub está conectada.",
    readonlyIdentity: "Acesso de identidade somente leitura para o primeiro MVP.",
    projectHealth: "Saúde do projeto",
    connectRepoCalculate: "Conecte um repositório para calcular",
    needsAttention: "Precisa de atenção",
    noRepositoryConnected: "Nenhum repositório conectado",
    recentActivity: "Atividade recente",
    waitingRealEvents: "Aguardando eventos reais",
    productPrinciple: "PRINCÍPIO DO PRODUTO",
    whatNeedsAttention: "O que precisa da sua atenção?",
    principleCopy:
      "O DevBoard não substitui o GitHub Projects. Ele observa o fluxo de desenvolvimento, detecta sinais relevantes e explica como eles afetam a saúde do projeto.",
    githubConnectionActive: "CONEXÃO COM GITHUB ATIVA",
    welcome: (name) => `Bem-vindo, ${name}.`,
    syncedHero:
      "O DevBoard está lendo sinais normalizados de engenharia e convertendo-os em atenção determinística.",
    repoConnectedHero:
      "Seu primeiro repositório está conectado. Rode a sincronização inicial para importar pull requests, issues, reviews e workflows.",
    githubLinkedHero:
      "Sua conta do DevBoard está vinculada ao GitHub. Conecte o GitHub App do DevBoard para começar a observar repositórios reais.",
    connectRepositories: "Conectar repositórios",
    createGithubApp: "Criar GitHub App do DevBoard",
    githubApp: (slug) => `GitHub App: ${slug}`,
    bootstrapHint: "Configuração única. As permissões já estão pré-configuradas.",
    repositories: "Repositórios",
    observedByDevboard: "Observado pelo DevBoard",
    noRepoYet: "Nenhum repositório conectado ainda",
    pullRequests: "Pull requests",
    normalizedFromGithub: "Normalizadas do GitHub",
    waitingInitialSync: "Aguardando sincronização inicial",
    observedIssuesWorkflows: (issues, workflows) => `${issues} issues · ${workflows} execuções de workflow observadas`,
    attentionEngine: "MOTOR DE ATENÇÃO",
    initialSync: "SINCRONIZAÇÃO INICIAL",
    knowAttention: "Saiba o que precisa de atenção.",
    importSignals: "Importe sinais reais de engenharia.",
    attentionRulesCopy:
      "O DevBoard avalia regras explicáveis para pull requests aguardando review, issues paradas e workflows com falha.",
    tokenCopy:
      "A sincronização usa um token temporário da instalação do GitHub App. O DevBoard nunca armazena esse token no PostgreSQL.",
    attention: "Atenção",
    noActiveSignals: "Nenhum sinal ativo.",
    noActiveSignalsCopy: "As regras determinísticas atuais não encontraram nada que exija atenção.",
    detected: "Detectado",
    defaultBranch: "Branch padrão",
    lastSync: "Última sincronização",
    never: "nunca",
    syncAgain: "Sincronizar novamente",
    syncNow: "Sincronizar agora",
    signOut: "Sair",
    public: "público",
    private: "privado",
    internal: "interno",
    language: "Idioma",
  },
  en: {
    privateAlpha: "Private alpha",
    signedInAs: (username) => `Signed in as @${username}`,
    eyebrowHome: "SOFTWARE PROJECT OBSERVABILITY",
    homeTitle: "Know how your software is moving.",
    homeCopy:
      "GitHub tracks the work. DevBoard turns project activity into health, attention signals and context you can understand in seconds.",
    openDashboard: "Open dashboard",
    continueGithub: "Continue with GitHub",
    identityConnected: "Your GitHub identity is connected.",
    readonlyIdentity: "Read-only identity access for the first MVP.",
    projectHealth: "Project health",
    connectRepoCalculate: "Connect a repository to calculate",
    needsAttention: "Needs attention",
    noRepositoryConnected: "No repository connected",
    recentActivity: "Recent activity",
    waitingRealEvents: "Waiting for real events",
    productPrinciple: "PRODUCT PRINCIPLE",
    whatNeedsAttention: "What needs your attention?",
    principleCopy:
      "DevBoard does not replace GitHub Projects. It observes the development flow, detects signals that matter, and explains how they affect project health.",
    githubConnectionActive: "GITHUB CONNECTION ACTIVE",
    welcome: (name) => `Welcome, ${name}.`,
    syncedHero:
      "DevBoard is reading normalized engineering signals and converting them into deterministic attention.",
    repoConnectedHero:
      "Your first repository is connected. Run the initial sync to import pull requests, issues, reviews and workflows.",
    githubLinkedHero:
      "Your DevBoard account is linked to GitHub. Connect the DevBoard GitHub App to start observing real repositories.",
    connectRepositories: "Connect repositories",
    createGithubApp: "Create DevBoard GitHub App",
    githubApp: (slug) => `GitHub App: ${slug}`,
    bootstrapHint: "One-time bootstrap. Permissions are preconfigured.",
    repositories: "Repositories",
    observedByDevboard: "Observed by DevBoard",
    noRepoYet: "No repository connected yet",
    pullRequests: "Pull requests",
    normalizedFromGithub: "Normalized from GitHub",
    waitingInitialSync: "Waiting for initial sync",
    observedIssuesWorkflows: (issues, workflows) => `${issues} issues · ${workflows} workflow runs observed`,
    attentionEngine: "ATTENTION ENGINE",
    initialSync: "INITIAL SYNC",
    knowAttention: "Know what needs attention.",
    importSignals: "Import real engineering signals.",
    attentionRulesCopy:
      "DevBoard currently evaluates explainable rules for pull requests waiting on review, stale issues and failed workflows.",
    tokenCopy:
      "Sync uses a short-lived GitHub App installation token. DevBoard never stores that token in PostgreSQL.",
    attention: "Attention",
    noActiveSignals: "No active signals.",
    noActiveSignalsCopy: "The current deterministic rules did not find anything requiring attention.",
    detected: "Detected",
    defaultBranch: "Default branch",
    lastSync: "Last sync",
    never: "never",
    syncAgain: "Sync again",
    syncNow: "Sync now",
    signOut: "Sign out",
    public: "public",
    private: "private",
    internal: "internal",
    language: "Language",
  },
};

export function getMessages(locale: Locale) {
  return dictionaries[locale];
}

export function formatDateTime(locale: Locale, value: Date) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function visibilityLabel(locale: Locale, visibility: string) {
  const messages = getMessages(locale);
  if (visibility === "public") return messages.public;
  if (visibility === "private") return messages.private;
  if (visibility === "internal") return messages.internal;
  return visibility;
}

export function severityLabel(locale: Locale, severity: string) {
  if (locale === "en") return severity;
  const labels: Record<string, string> = {
    INFO: "INFORMAÇÃO",
    LOW: "BAIXA",
    MEDIUM: "MÉDIA",
    HIGH: "ALTA",
    CRITICAL: "CRÍTICA",
  };
  return labels[severity] ?? severity;
}

export function localizeAttentionMessage(locale: Locale, message: string) {
  if (locale === "en") return message;

  const pullRequest = message.match(/^PR #(\d+) has been waiting for its first review for (\d+)h\.$/);
  if (pullRequest) {
    return `A PR #${pullRequest[1]} está aguardando a primeira review há ${pullRequest[2]}h.`;
  }

  const issue = message.match(/^Issue #(\d+) has had no activity for (\d+) days\.$/);
  if (issue) {
    return `A issue #${issue[1]} está sem atividade há ${issue[2]} dias.`;
  }

  const workflow = message.match(/^(.*) has (\d+) consecutive failed runs?\.$/);
  if (workflow) {
    const count = Number(workflow[2]);
    return `${workflow[1]} tem ${count} ${count === 1 ? "execução consecutiva com falha" : "execuções consecutivas com falha"}.`;
  }

  return message;
}
