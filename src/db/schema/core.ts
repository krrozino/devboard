import {
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
