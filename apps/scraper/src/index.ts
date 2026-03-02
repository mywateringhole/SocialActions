import { createDb } from "@socialactions/db";
import { councilConfigs } from "./councils";
import { scrapeCouncil } from "./jobs/scrape-council";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  // Parse CLI args
  const args = process.argv.slice(2);
  const councilFlag = args.indexOf("--council");
  const councilSlug =
    councilFlag !== -1 ? args[councilFlag + 1] : undefined;

  if (councilSlug) {
    // Scrape specific council
    const config = councilConfigs[councilSlug];
    if (!config) {
      console.error(
        `Unknown council: ${councilSlug}. Available: ${Object.keys(councilConfigs).join(", ")}`
      );
      process.exit(1);
    }
    await scrapeCouncil(db, config);
  } else {
    // Scrape all active councils
    for (const config of Object.values(councilConfigs)) {
      await scrapeCouncil(db, config);
    }
  }

  console.log("\nAll scraping complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
