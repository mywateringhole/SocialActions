import { pgTable, text, integer, timestamp, serial, index } from "drizzle-orm/pg-core";
import { councils } from "./councils";

export const dataSources = pgTable(
  "data_sources",
  {
    id: serial("id").primaryKey(),
    councilId: integer("council_id")
      .notNull()
      .references(() => councils.id),
    sourceUrl: text("source_url").notNull(),
    fileType: text("file_type", { enum: ["payment_250", "pcard"] }).notNull(),
    financialYear: text("financial_year"),
    month: integer("month"),
    year: integer("year"),
    fileHash: text("file_hash"),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    rowCount: integer("row_count"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_data_sources_council").on(table.councilId),
    index("idx_data_sources_hash").on(table.fileHash),
  ]
);

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
