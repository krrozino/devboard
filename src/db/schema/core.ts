import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", ["ACTIVE", "PAUSED", "ARCHIVED"]);
export const attentionSeverityEnum = pgEnum("attention_severity", [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export const attentionStatusEnum = pgEnum("attention_status", ["ACTIVE", "RESOLVED"]);
export const healthStatusEnum = pgEnum("health_status", ["HEALTHY", "ATTENTION", "AT_RISK"]);
export const githubInstallationStatusEnum = pgEnum("github_installation_status", [
  "ACTIVE",
  "SUSPENDED",
  "REMOVED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubId: text("github_id").notNull(),
    username: text("username").notNull(),
    name: text("name"),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_github_id_uidx").on(table.githubId)],
);

export const githubAppConfigurations = pgTable(
  "github_app_configurations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    singletonKey: text("singleton_key").default("primary").notNull(),
    githubAppId: text("github_app_id").notNull(),
    slug: text("slug").notNull(),
    clientId: text("client_id").notNull(),
    privateKeyEncrypted: text("private_key_encrypted").notNull(),
    webhookSecretEncrypted: text("webhook_secret_encrypted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_app_config_singleton_uidx").on(table.singletonKey),
    uniqueIndex("github_app_config_app_id_uidx").on(table.githubAppId),
  ],
);

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    appConfigurationId: uuid("app_configuration_id")
      .notNull()
      .references(() => githubAppConfigurations.id, { onDelete: "cascade" }),
    githubInstallationId: text("github_installation_id").notNull(),
    accountId: text("account_id").notNull(),
    accountLogin: text("account_login").notNull(),
    accountType: text("account_type").notNull(),
    status: githubInstallationStatusEnum("status").default("ACTIVE").notNull(),
    installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_installations_external_id_uidx").on(table.githubInstallationId),
    index("github_installations_user_id_idx").on(table.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    installationId: uuid("installation_id").references(() => githubInstallations.id, {
      onDelete: "set null",
    }),
    githubRepositoryId: text("github_repository_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    visibility: text("visibility").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("repositories_github_repository_id_uidx").on(table.githubRepositoryId),
    index("repositories_project_id_idx").on(table.projectId),
    index("repositories_installation_id_idx").on(table.installationId),
  ],
);

export const githubIssues = pgTable(
  "github_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
    githubIssueId: text("github_issue_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    state: text("state").notNull(),
    authorGithubId: text("author_github_id"),
    createdAtGithub: timestamp("created_at_github", { withTimezone: true }).notNull(),
    updatedAtGithub: timestamp("updated_at_github", { withTimezone: true }).notNull(),
    closedAtGithub: timestamp("closed_at_github", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_issues_external_id_uidx").on(table.githubIssueId),
    index("github_issues_repository_state_idx").on(table.repositoryId, table.state),
  ],
);

export const githubPullRequests = pgTable(
  "github_pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
    githubPullRequestId: text("github_pull_request_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    state: text("state").notNull(),
    draft: boolean("draft").default(false).notNull(),
    authorGithubId: text("author_github_id"),
    createdAtGithub: timestamp("created_at_github", { withTimezone: true }).notNull(),
    updatedAtGithub: timestamp("updated_at_github", { withTimezone: true }).notNull(),
    closedAtGithub: timestamp("closed_at_github", { withTimezone: true }),
    mergedAtGithub: timestamp("merged_at_github", { withTimezone: true }),
    firstReviewAt: timestamp("first_review_at", { withTimezone: true }),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_pull_requests_external_id_uidx").on(table.githubPullRequestId),
    index("github_pull_requests_repository_state_idx").on(table.repositoryId, table.state),
  ],
);

export const githubReviews = pgTable(
  "github_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pullRequestId: uuid("pull_request_id").notNull().references(() => githubPullRequests.id, { onDelete: "cascade" }),
    githubReviewId: text("github_review_id").notNull(),
    reviewerGithubId: text("reviewer_github_id"),
    state: text("state").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("github_reviews_external_id_uidx").on(table.githubReviewId),
    index("github_reviews_pull_request_idx").on(table.pullRequestId),
  ],
);

export const githubWorkflowRuns = pgTable(
  "github_workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
    githubRunId: text("github_run_id").notNull(),
    workflowName: text("workflow_name").notNull(),
    branch: text("branch"),
    status: text("status").notNull(),
    conclusion: text("conclusion"),
    createdAtGithub: timestamp("created_at_github", { withTimezone: true }).notNull(),
    startedAtGithub: timestamp("started_at_github", { withTimezone: true }),
    completedAtGithub: timestamp("completed_at_github", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_workflow_runs_external_id_uidx").on(table.githubRunId),
    index("github_workflow_runs_repository_status_idx").on(table.repositoryId, table.status),
  ],
);

export const attentionItems = pgTable(
  "attention_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id").references(() => repositories.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    severity: attentionSeverityEnum("severity").notNull(),
    status: attentionStatusEnum("status").default("ACTIVE").notNull(),
    message: text("message").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("attention_rule_resource_uidx").on(table.ruleId, table.resourceType, table.resourceId),
    index("attention_project_status_idx").on(table.projectId, table.status),
  ],
);

export const healthSnapshots = pgTable(
  "health_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    developmentScore: integer("development_score").notNull(),
    reviewScore: integer("review_score").notNull(),
    deliveryScore: integer("delivery_score").notNull(),
    planningScore: integer("planning_score"),
    status: healthStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("health_snapshots_project_created_idx").on(table.projectId, table.createdAt)],
);
