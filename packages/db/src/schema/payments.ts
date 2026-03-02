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

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    councilId: integer("council_id")
      .notNull()
      .references(() => councils.id),
    dataSourceId: integer("data_source_id")
      .notNull()
      .references(() => dataSources.id),
    directorate: text("directorate"),
    service: text("service"),
    division: text("division"),
    responsibleUnit: text("responsible_unit"),
    expenseType: text("expense_type"),
    paymentDate: date("payment_date"),
    transactionNumber: text("transaction_number"),
    netAmount: numeric("net_amount", { precision: 15, scale: 2 }).notNull(),
    supplierName: text("supplier_name"),
    supplierNameNormalized: text("supplier_name_normalized"),
    financialYear: text("financial_year"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_payments_council_date").on(table.councilId, table.paymentDate),
    index("idx_payments_supplier").on(table.supplierNameNormalized),
    index("idx_payments_council_directorate").on(
      table.councilId,
      table.directorate
    ),
    index("idx_payments_amount").on(table.netAmount),
    unique("uq_payments_council_txn").on(
      table.councilId,
      table.transactionNumber
    ),
  ]
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
