import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  serial,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { councils } from "./councils";

export const anomalies = pgTable(
  "anomalies",
  {
    id: serial("id").primaryKey(),
    councilId: integer("council_id")
      .notNull()
      .references(() => councils.id),
    anomalyType: text("anomaly_type", {
      enum: [
        "spending_spike",
        "supplier_concentration",
        "new_large_supplier",
        "round_numbers",
        "year_end_surge",
        "split_transactions",
        "unusual_expense",
        "duplicate_payment",
      ],
    }).notNull(),
    severity: text("severity", {
      enum: ["low", "medium", "high"],
    }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    relatedEntity: text("related_entity"),
    metrics: jsonb("metrics").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_anomalies_council").on(table.councilId),
    index("idx_anomalies_type").on(table.anomalyType),
    index("idx_anomalies_severity").on(table.severity),
  ]
);

export type Anomaly = typeof anomalies.$inferSelect;
export type NewAnomaly = typeof anomalies.$inferInsert;
