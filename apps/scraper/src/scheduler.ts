import cron from "node-cron";
import { createDb } from "@socialactions/db";
import { eq } from "drizzle-orm";
import { councils } from "@socialactions/db/schema";
import { councilConfigs } from "./councils";
import { scrapeCouncil } from "./jobs/scrape-council";
import { runAllDetectors } from "./anomaly-detectors";

/**
 * Scheduled scraper runner.
 * Runs on the 1st of each month at 06:00 UTC.
 * Councils publish previous month's data in the first week of the following month.
 *
 * Usage: tsx src/scheduler.ts
 */

const CRON_SCHEDULE = process.env.SCRAPE_CRON ?? "0 6 1 * *"; // 1st of month, 6am UTC

async function runFullScrape() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    return;
  }

  const db = createDb(databaseUrl);
  const startTime = Date.now();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[scheduler] Starting scheduled scrape at ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  const results: { council: string; status: string; error?: string }[] = [];

  for (const config of Object.values(councilConfigs)) {
    try {
      await scrapeCouncil(db, config);
      results.push({ council: config.name, status: "completed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Error scraping ${config.name}: ${msg}`);
      results.push({ council: config.name, status: "failed", error: msg });
    }
  }

  // Run anomaly detection after all councils are scraped
  console.log("\n[scheduler] Running anomaly detection...");
  for (const config of Object.values(councilConfigs)) {
    try {
      const [council] = await db
        .select({ id: councils.id })
        .from(councils)
        .where(eq(councils.slug, config.slug))
        .limit(1);
      if (council) {
        await runAllDetectors(db, council.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Anomaly detection failed for ${config.name}: ${msg}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[scheduler] Scrape completed in ${elapsed}s`);
  for (const r of results) {
    const icon = r.status === "completed" ? "OK" : "FAIL";
    console.log(`  [${icon}] ${r.council}${r.error ? ` - ${r.error}` : ""}`);
  }
  console.log(`${"=".repeat(60)}\n`);
}

// Entry point
const args = process.argv.slice(2);

if (args.includes("--now")) {
  // Run immediately (for testing / manual trigger)
  console.log("[scheduler] Running immediate scrape (--now flag)");
  runFullScrape()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
} else {
  // Start cron scheduler
  console.log(`[scheduler] Starting cron scheduler: "${CRON_SCHEDULE}"`);
  console.log(`[scheduler] Councils: ${Object.keys(councilConfigs).join(", ")}`);
  console.log("[scheduler] Waiting for next scheduled run...\n");

  cron.schedule(CRON_SCHEDULE, () => {
    runFullScrape().catch((err) => {
      console.error("[scheduler] Scrape run failed:", err);
    });
  });
}
