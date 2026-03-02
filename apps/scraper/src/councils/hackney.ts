import * as cheerio from "cheerio";
import type { CouncilScraperConfig, DiscoveredFile } from "./types";

/**
 * Hackney hosts CSVs on Google Drive. We need to:
 * 1. Scrape the transparency page for Google Drive links
 * 2. Convert share links to direct download URLs
 */
async function discoverHackneyLinks(
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

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    // Match Google Drive links
    const driveMatch = href.match(
      /drive\.google\.com\/file\/d\/([^/]+)/
    );
    if (!driveMatch) return;

    const fileId = driveMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    if (seen.has(fileId)) return;
    seen.add(fileId);

    const linkText = $(element).text().trim().toLowerCase();

    // Only pick CSV links (link text contains "csv")
    if (!linkText.includes("csv")) return;

    discovered.push({
      url: directUrl,
      fileType: "payment_250",
      filename: `hackney-${linkText.replace(/[^a-z0-9]+/g, "-").substring(0, 60)}.csv`,
    });
  });

  console.log(
    `[discover] Found ${discovered.length} files (${discovered.length} payment, 0 pcard)`
  );

  return discovered;
}

export const hackneyConfig: CouncilScraperConfig = {
  id: "hackney",
  name: "London Borough of Hackney",
  slug: "hackney",
  region: "London",
  transparencyUrl: "https://hackney.gov.uk/budget-supplier-payments/",
  websiteUrl: "https://hackney.gov.uk",

  filePatterns: {
    payment250: [/csv/i],
    pcard: [],
  },

  // Hackney: YEAR, MONTH, DATE INCURRED, DATE PAID, BENEFICIARY, SUPPLIER NO.,
  //          DEPARTMENT, PURPOSE OF EXPENDITURE, MERCHANT CATEGORY, Total
  columnMappings: {
    payment250: {
      directorate: 6,       // DEPARTMENT
      service: 7,           // PURPOSE OF EXPENDITURE
      division: 8,          // MERCHANT CATEGORY
      responsibleUnit: 6,   // (reuse DEPARTMENT)
      expenseType: 7,       // PURPOSE OF EXPENDITURE
      paymentDate: 3,       // DATE PAID
      transactionNumber: 5, // SUPPLIER NO.
      netAmount: 9,         // Total
      supplierName: 4,      // BENEFICIARY
    },
  },

  dateFormat: "DD/MM/YY",
  minColumns: 10,
  headerKeywords: ["beneficiary", "merchant", "incurred", "total"],
  customDiscovery: discoverHackneyLinks,
};
