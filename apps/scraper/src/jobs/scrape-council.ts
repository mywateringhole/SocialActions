import type { Database } from "@socialactions/db";
import type { CouncilScraperConfig } from "../councils/types";
import { discoverLinks } from "../discovery/discover-links";
import { parsePayment250Csv, parsePcardCsv } from "../parsers/csv-parser";
import {
  ensureCouncil,
  checkFileExists,
  createDataSource,
  loadPayments,
  loadPcardTransactions,
  updateDataSourceStatus,
  createScrapeJob,
  completeScrapeJob,
  hashContent,
} from "./db-loader";

/**
 * Main scraping orchestration for a single council.
 * Discovers files, downloads, parses, and loads into DB.
 */
export async function scrapeCouncil(
  db: Database,
  config: CouncilScraperConfig
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[scrape] Starting scrape for ${config.name}`);
  console.log(`${"=".repeat(60)}\n`);

  const councilId = await ensureCouncil(db, config);
  const jobId = await createScrapeJob(db, councilId, "full");

  const parseOptions = {
    skipRows: config.skipRows ?? 0,
    minColumns: config.minColumns,
    headerKeywords: config.headerKeywords,
  };

  const stats = {
    filesDiscovered: 0,
    filesProcessed: 0,
    rowsInserted: 0,
    rowsSkipped: 0,
    errors: [] as string[],
    status: "completed" as "completed" | "failed",
  };

  try {
    // 1. DISCOVER: Find CSV/XLSX links on the transparency page
    const files = await discoverLinks(config);
    stats.filesDiscovered = files.length;

    if (files.length === 0) {
      console.log("[scrape] No files discovered - check transparency URL and patterns");
      stats.status = "completed";
      await completeScrapeJob(db, jobId, stats);
      return;
    }

    // 2. Process each discovered file
    for (const file of files) {
      try {
        console.log(`\n[scrape] Processing: ${file.filename} (${file.fileType})`);

        // 3. DOWNLOAD: Fetch CSV content
        const response = await fetch(file.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; SocialActions/1.0; +https://github.com/socialactions)",
            ...config.fetchHeaders,
          },
        });
        if (!response.ok) {
          const err = `Failed to download ${file.url}: ${response.status}`;
          console.error(`[scrape] ${err}`);
          stats.errors.push(err);
          continue;
        }

        // Handle encoding - try to decode as UTF-8, fall back to latin-1
        const buffer = await response.arrayBuffer();
        let csvText: string;
        try {
          csvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
          csvText = new TextDecoder("latin1").decode(buffer);
        }

        // Strip BOM if present
        if (csvText.charCodeAt(0) === 0xfeff) {
          csvText = csvText.slice(1);
        }

        const contentHash = hashContent(csvText);

        // 4. CHECK: Skip if already processed
        const existing = await checkFileExists(db, councilId, file.url, contentHash);
        if (existing) {
          console.log(`[scrape] Skipping (already imported): ${file.filename}`);
          stats.rowsSkipped++;
          continue;
        }

        // 5. CREATE data source record
        const dataSourceId = await createDataSource(db, councilId, file, contentHash);

        // 6. PARSE & 7. TRANSFORM
        let result: { inserted: number; skipped: number };

        if (file.fileType === "payment_250") {
          const records = parsePayment250Csv(
            csvText,
            config.columnMappings.payment250,
            parseOptions
          );
          console.log(`[scrape] Parsed ${records.length} payment records`);

          // 8. LOAD
          result = await loadPayments(db, councilId, dataSourceId, records);
          await updateDataSourceStatus(db, dataSourceId, "completed", records.length);
        } else if (file.fileType === "pcard" && config.columnMappings.pcard) {
          const records = parsePcardCsv(
            csvText,
            config.columnMappings.pcard,
            parseOptions
          );
          console.log(`[scrape] Parsed ${records.length} pcard records`);

          result = await loadPcardTransactions(db, councilId, dataSourceId, records);
          await updateDataSourceStatus(db, dataSourceId, "completed", records.length);
        } else {
          console.log(`[scrape] Skipping unsupported file type: ${file.fileType}`);
          await updateDataSourceStatus(db, dataSourceId, "failed");
          continue;
        }

        stats.filesProcessed++;
        stats.rowsInserted += result.inserted;
        stats.rowsSkipped += result.skipped;

        console.log(
          `[scrape] Loaded: ${result.inserted} inserted, ${result.skipped} skipped`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[scrape] Error processing ${file.filename}: ${msg}`);
        stats.errors.push(`${file.filename}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scrape] Fatal error: ${msg}`);
    stats.errors.push(msg);
    stats.status = "failed";
  }

  await completeScrapeJob(db, jobId, stats);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[scrape] Completed: ${config.name}`);
  console.log(
    `[scrape] Files: ${stats.filesProcessed}/${stats.filesDiscovered} | Rows: +${stats.rowsInserted} ~${stats.rowsSkipped} | Errors: ${stats.errors.length}`
  );
  console.log(`${"=".repeat(60)}\n`);
}
