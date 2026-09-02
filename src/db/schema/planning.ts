import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./core";

export const githubPlanningConnections = pgTable(
  "github_planning_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    oauthTokenEncrypted: text("oauth_token_encrypted").notNull(),
    grantedScopes: text("granted_scopes"),
    selectedOwnerLogin: text("selected_owner_login"),
    selectedOwnerType: text("selected_owner_type"),
    selectedProjectNumber: integer("selected_project_number"),
    selectedProjectNodeId: text("selected_project_node_id"),
    selectedProjectTitle: text("selected_project_title"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("github_planning_connections_user_uidx").on(table.userId),
    index("github_planning_selected_project_idx").on(
      table.selectedOwnerLogin,
      table.selectedProjectNumber,
    ),
  ],
);
