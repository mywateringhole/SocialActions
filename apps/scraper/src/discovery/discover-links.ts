import * as cheerio from "cheerio";
import type { CouncilScraperConfig, DiscoveredFile } from "../councils/types";

/**
 * Scrapes a council's transparency page HTML and extracts CSV/XLSX download links.
 * Links are classified as payment_250 or pcard based on the council's file patterns.
 */
export async function discoverLinks(
  config: CouncilScraperConfig
): Promise<DiscoveredFile[]> {
  console.log(`[discover] Fetching ${config.transparencyUrl}`);

  const response = await fetch(config.transparencyUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch transparency page: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const discovered: DiscoveredFile[] = [];
  const seen = new Set<string>();

  // Find all links to CSV and XLSX files
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    // Only match CSV/XLSX files
    if (!/\.(csv|xlsx?)$/i.test(href)) return;

    const absoluteUrl = new URL(href, config.transparencyUrl).toString();
    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    const linkText = $(element).text().trim();
    const filename = href.split("/").pop() || "";
    const context = `${linkText} ${filename}`.toLowerCase();

    // Classify the file type
    const fileType = classifyFile(context, config);
    if (fileType) {
      discovered.push({
        url: absoluteUrl,
        fileType,
        filename,
      });
    }
  });

  console.log(
    `[discover] Found ${discovered.length} files (${discovered.filter((f) => f.fileType === "payment_250").length} payment, ${discovered.filter((f) => f.fileType === "pcard").length} pcard)`
  );

  return discovered;
}

function classifyFile(
  context: string,
  config: CouncilScraperConfig
): "payment_250" | "pcard" | null {
  // Check pcard first (more specific)
  for (const pattern of config.filePatterns.pcard) {
    if (pattern.test(context)) return "pcard";
  }

  // Then check payment_250
  for (const pattern of config.filePatterns.payment250) {
    if (pattern.test(context)) return "payment_250";
  }

  // Default: if it's a CSV on a transparency page, assume payment_250
  if (context.includes(".csv")) return "payment_250";

  return null;
}
