import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import {
  councils,
  dataSources,
  payments,
  pcardTransactions,
  scrapeJobs,
} from "@socialactions/db/schema";
import type {
  CouncilScraperConfig,
  DiscoveredFile,
  ParsedPayment,
  ParsedPcardTransaction,
} from "../councils/types";

const BATCH_SIZE = 500;

/**
 * Ensure the council exists in the DB, return its ID.
 */
export async function ensureCouncil(
  db: Database,
  config: CouncilScraperConfig
): Promise<number> {
  const existing = await db
    .select()
    .from(councils)
    .where(eq(councils.slug, config.slug))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [inserted] = await db
    .insert(councils)
    .values({
      name: config.name,
      slug: config.slug,
      region: config.region,
      websiteUrl: config.websiteUrl,
      transparencyUrl: config.transparencyUrl,
    })
    .returning({ id: councils.id });

  return inserted.id;
}

/**
 * Check if a file has already been ingested (by URL or content hash).
 * Returns the existing data source ID if found, null otherwise.
 */
export async function checkFileExists(
  db: Database,
  councilId: number,
  fileUrl: string,
  contentHash: string
): Promise<number | null> {
  // Check by hash first (more reliable)
  const byHash = await db
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(eq(dataSources.fileHash, contentHash))
    .limit(1);

  if (byHash.length > 0) return byHash[0].id;

  return null;
}

/**
 * Create a data_source record for a new file.
 */
export async function createDataSource(
  db: Database,
  councilId: number,
  file: DiscoveredFile,
  contentHash: string
): Promise<number> {
  const [ds] = await db
    .insert(dataSources)
    .values({
      councilId,
      sourceUrl: file.url,
      fileType: file.fileType,
      fileHash: contentHash,
      status: "processing",
    })
    .returning({ id: dataSources.id });

  return ds.id;
}

/**
 * Load parsed payment records into the DB in batches.
 * Uses ON CONFLICT DO NOTHING for deduplication.
 */
export async function loadPayments(
  db: Database,
  councilId: number,
  dataSourceId: number,
  records: ParsedPayment[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const values = batch.map((r) => ({
      councilId,
      dataSourceId,
      directorate: r.directorate,
      service: r.service,
      division: r.division,
      responsibleUnit: r.responsibleUnit,
      expenseType: r.expenseType,
      paymentDate: r.paymentDate,
      transactionNumber: r.transactionNumber,
      netAmount: r.netAmount,
      supplierName: r.supplierName,
      supplierNameNormalized: r.supplierNameNormalized,
      financialYear: r.financialYear,
    }));

    const result = await db
      .insert(payments)
      .values(values)
      .onConflictDoNothing({ target: [payments.councilId, payments.transactionNumber] })
      .returning({ id: payments.id });

    inserted += result.length;
    skipped += batch.length - result.length;
  }

  return { inserted, skipped };
}

/**
 * Load parsed pcard transaction records into the DB in batches.
 */
export async function loadPcardTransactions(
  db: Database,
  councilId: number,
  dataSourceId: number,
  records: ParsedPcardTransaction[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const values = batch.map((r) => ({
      councilId,
      dataSourceId,
      transactionDate: r.transactionDate,
      amount: r.amount,
      expenseDescription: r.expenseDescription,
      supplierName: r.supplierName,
      supplierNameNormalized: r.supplierNameNormalized,
      directorate: r.directorate,
      compositeHash: r.compositeHash,
    }));

    const result = await db
      .insert(pcardTransactions)
      .values(values)
      .onConflictDoNothing({
        target: [pcardTransactions.councilId, pcardTransactions.compositeHash],
      })
      .returning({ id: pcardTransactions.id });

    inserted += result.length;
    skipped += batch.length - result.length;
  }

  return { inserted, skipped };
}

/**
 * Update data_source status and row count after processing.
 */
export async function updateDataSourceStatus(
  db: Database,
  dataSourceId: number,
  status: "completed" | "failed",
  rowCount?: number
): Promise<void> {
  await db
    .update(dataSources)
    .set({
      status,
      rowCount: rowCount ?? null,
      updatedAt: new Date(),
    })
    .where(eq(dataSources.id, dataSourceId));
}

/**
 * Create a scrape job record.
 */
export async function createScrapeJob(
  db: Database,
  councilId: number,
  jobType: "full" | "incremental"
): Promise<number> {
  const [job] = await db
    .insert(scrapeJobs)
    .values({
      councilId,
      jobType,
      status: "running",
    })
    .returning({ id: scrapeJobs.id });

  return job.id;
}

/**
 * Update scrape job on completion.
 */
export async function completeScrapeJob(
  db: Database,
  jobId: number,
  stats: {
    filesDiscovered: number;
    filesProcessed: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: string[];
    status: "completed" | "failed";
  }
): Promise<void> {
  await db
    .update(scrapeJobs)
    .set({
      ...stats,
      completedAt: new Date(),
    })
    .where(eq(scrapeJobs.id, jobId));
}

/**
 * Refresh materialized views after data load.
 */
export async function refreshMaterializedViews(db: Database): Promise<void> {
  console.log("[db] Refreshing materialized views...");
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_spending`
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_summary`
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_expense_summary`
  );
  console.log("[db] Materialized views refreshed");
}

/**
 * Compute SHA-256 hash of file content for dedup.
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
