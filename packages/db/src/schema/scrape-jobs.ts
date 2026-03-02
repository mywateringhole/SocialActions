import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { councils } from "./councils";

export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id: serial("id").primaryKey(),
    councilId: integer("council_id")
      .notNull()
      .references(() => councils.id),
    status: text("status", {
      enum: ["running", "completed", "failed"],
    })
      .notNull()
      .default("running"),
    jobType: text("job_type", {
      enum: ["full", "incremental"],
    }).notNull(),
    filesDiscovered: integer("files_discovered").default(0),
    filesProcessed: integer("files_processed").default(0),
    rowsInserted: integer("rows_inserted").default(0),
    rowsSkipped: integer("rows_skipped").default(0),
    errors: jsonb("errors").$type<string[]>(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("idx_scrape_jobs_council").on(table.councilId)]
);

export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type NewScrapeJob = typeof scrapeJobs.$inferInsert;
