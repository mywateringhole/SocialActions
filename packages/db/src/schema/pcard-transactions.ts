import {
  pgTable,
  text,
  integer,
  numeric,
  date,
  timestamp,
  serial,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { councils } from "./councils";
import { dataSources } from "./data-sources";

export const pcardTransactions = pgTable(
  "pcard_transactions",
  {
    id: serial("id").primaryKey(),
    councilId: integer("council_id")
      .notNull()
      .references(() => councils.id),
    dataSourceId: integer("data_source_id")
      .notNull()
      .references(() => dataSources.id),
    transactionDate: date("transaction_date"),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    expenseDescription: text("expense_description"),
    supplierName: text("supplier_name"),
    supplierNameNormalized: text("supplier_name_normalized"),
    directorate: text("directorate"),
    compositeHash: text("composite_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_pcard_council_date").on(
      table.councilId,
      table.transactionDate
    ),
    index("idx_pcard_supplier").on(table.supplierNameNormalized),
    unique("uq_pcard_hash").on(table.councilId, table.compositeHash),
  ]
);

export type PcardTransaction = typeof pcardTransactions.$inferSelect;
export type NewPcardTransaction = typeof pcardTransactions.$inferInsert;
