import { pgTable, text, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";

export const councils = pgTable("councils", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  region: text("region").notNull(),
  websiteUrl: text("website_url"),
  transparencyUrl: text("transparency_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Council = typeof councils.$inferSelect;
export type NewCouncil = typeof councils.$inferInsert;
