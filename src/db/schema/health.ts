import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { healthSnapshots } from "./core";

export const healthReasons = pgTable(
  "health_reasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    healthSnapshotId: uuid("health_snapshot_id")
      .notNull()
      .references(() => healthSnapshots.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    impact: integer("impact").notNull(),
    message: text("message").notNull(),
  },
  (table) => [index("health_reasons_snapshot_idx").on(table.healthSnapshotId)],
);
