import * as cheerio from "cheerio";
import type { CouncilScraperConfig, DiscoveredFile } from "./types";

/**
 * LBBD blocks bots on the transparency page itself, but the CSV files
 * are directly downloadable. We scrape the page with a browser-like UA.
 */
async function discoverLbbdLinks(
  config: CouncilScraperConfig
): Promise<DiscoveredFile[]> {
  console.log(`[discover] Fetching ${config.transparencyUrl}`);

  const response = await fetch(config.transparencyUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
  });

  if (!response.ok) {
    console.log(
      `[discover] Transparency page returned ${response.status} - trying direct file discovery`
    );
    // Fall back to known URL patterns if the page blocks us
    return discoverLbbdByPattern();
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const discovered: DiscoveredFile[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    if (!/\.csv$/i.test(href)) return;

    const absoluteUrl = new URL(href, config.websiteUrl).toString();
    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    const filename = href.split("/").pop() || "";
    discovered.push({
      url: absoluteUrl,
      fileType: "payment_250",
      filename,
    });
  });

  if (discovered.length > 0) {
    console.log(`[discover] Found ${discovered.length} files from page`);
    return discovered;
  }

  // If page parsing found nothing, use pattern-based discovery
  return discoverLbbdByPattern();
}

/**
 * Pattern-based discovery for LBBD - try known URL patterns for recent months.
 */
async function discoverLbbdByPattern(): Promise<DiscoveredFile[]> {
  console.log("[discover] Using pattern-based discovery for LBBD");
  const discovered: DiscoveredFile[] = [];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Try recent years: 2024-2025
  for (const year of [2025, 2024, 2023]) {
    for (let m = 0; m < 12; m++) {
      const month = months[m];
      // Publication month is typically 1 month after payment month
      const pubMonth = m + 2 > 12 ? 1 : m + 2;
      const pubYear = m + 2 > 12 ? year + 1 : year;
      const pubYM = `${pubYear}-${String(pubMonth).padStart(2, "0")}`;

      // Try both URL patterns
      const urls = [
        `https://www.lbbd.gov.uk/sites/default/files/${pubYM}/Amounts%20paid%20-%20${month}%20${year}%20(CSV).csv`,
        `https://www.lbbd.gov.uk/sites/default/files/${pubYM}/Amounts%20paid%20${month}%20${year}%20(CSV).csv`,
      ];

      for (const url of urls) {
        try {
          const resp = await fetch(url, { method: "HEAD" });
          if (resp.ok) {
            discovered.push({
              url,
              fileType: "payment_250",
              filename: `lbbd-${month.toLowerCase()}-${year}.csv`,
            });
            break; // Found one pattern, skip the other
          }
        } catch {
          // URL doesn't exist, try next
        }
      }
    }
  }

  // Try older files in the 2022-10 archive folder
  for (const year of [2022, 2021, 2020, 2019]) {
    for (const month of months) {
      const urls = [
        `https://www.lbbd.gov.uk/sites/default/files/2022-10/Amounts-paid-${month}-${year}-CSV.csv`,
        `https://www.lbbd.gov.uk/sites/default/files/2022-10/Amounts-paid-${month}-${year}-CSV_0.csv`,
        `https://www.lbbd.gov.uk/sites/default/files/2022-10/Amounts%20paid%20${month}%20${year}%20(CSV).csv`,
      ];

      for (const url of urls) {
        try {
          const resp = await fetch(url, { method: "HEAD" });
          if (resp.ok) {
            discovered.push({
              url,
              fileType: "payment_250",
              filename: `lbbd-${month.toLowerCase()}-${year}.csv`,
            });
            break;
          }
        } catch {
          // URL doesn't exist
        }
      }
    }
  }

  console.log(`[discover] Found ${discovered.length} files via pattern matching`);
  return discovered;
}

export const barkingDagenhamConfig: CouncilScraperConfig = {
  id: "barking-dagenham",
  name: "London Borough of Barking and Dagenham",
  slug: "barking-dagenham",
  region: "London",
  transparencyUrl:
    "https://www.lbbd.gov.uk/council-and-democracy/performance-and-spending/corporate-procurement/payments-over-ps250-and-ps500",
  websiteUrl: "https://www.lbbd.gov.uk",

  filePatterns: {
    payment250: [/amounts?\s*paid/i, /payment/i],
    pcard: [],
  },

  // LBBD newer format (2024+):
  // Payment Date, Supplier, Category, Cost Centre, Cost Centre Description,
  // Cost Centre Parent (L1), Cost Centre Parent (L2), Cost Centre Parent (L3),
  // Nominal Description, Gross, Vat
  // Older format (2019-2021):
  // Payment Date, Vendor Name, Vendor Type, Cost Centre Code, Cost Centre Description,
  // Department, Division, Subjective Description, Amount, Non Recoverable VAT
  columnMappings: {
    payment250: {
      directorate: 5,       // Cost Centre Parent L1 / Department
      service: 4,           // Cost Centre Description
      division: 6,          // Cost Centre Parent L2 / Division
      responsibleUnit: 7,   // Cost Centre Parent L3 / (N/A in old)
      expenseType: 8,       // Nominal Description / Subjective Description
      paymentDate: 0,       // Payment Date
      transactionNumber: -1, // LBBD has no txn number - will be auto-generated
      netAmount: 9,         // Gross / Amount
      supplierName: 1,      // Supplier / Vendor Name
    },
  },

  dateFormat: "DD-Mon-YY",
  skipRows: 1, // Title row before headers
  minColumns: 9,
  headerKeywords: ["vendor", "cost centre", "gross", "nominal", "subjective"],

  fetchHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },

  customDiscovery: discoverLbbdLinks,
};
