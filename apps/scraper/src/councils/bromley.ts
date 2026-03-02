import * as cheerio from "cheerio";
import type { CouncilScraperConfig, DiscoveredFile } from "./types";

/**
 * Bromley has a two-level download structure:
 * 1. Listing page with links to per-month download pages
 * 2. Each download page contains the actual file link (CSV or XLSX)
 * We need to follow both levels.
 */
async function discoverBromleyLinks(
  config: CouncilScraperConfig
): Promise<DiscoveredFile[]> {
  console.log(`[discover] Fetching ${config.transparencyUrl}`);

  const response = await fetch(config.transparencyUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SocialActions/1.0; +https://github.com/socialactions)",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Bromley listing: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Collect all download landing page URLs
  const landingPages: { url: string; label: string }[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    // Match Bromley download landing pages
    if (/\/downloads\/download\/\d+\//i.test(href)) {
      const absoluteUrl = new URL(href, config.websiteUrl).toString();
      const label = $(element).text().trim();
      landingPages.push({ url: absoluteUrl, label });
    }
  });

  console.log(
    `[discover] Found ${landingPages.length} download landing pages`
  );

  // Visit each landing page to find the actual file download link
  const discovered: DiscoveredFile[] = [];

  for (const page of landingPages) {
    try {
      const pageResp = await fetch(page.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SocialActions/1.0; +https://github.com/socialactions)",
        },
      });
      if (!pageResp.ok) continue;

      const pageHtml = await pageResp.text();
      const $page = cheerio.load(pageHtml);

      $page("a[href]").each((_, el) => {
        const fileHref = $page(el).attr("href");
        if (!fileHref) return;

        // Match actual file download links
        if (/\/downloads\/file\/\d+\//i.test(fileHref)) {
          const fileUrl = new URL(fileHref, config.websiteUrl).toString();
          const linkText = $page(el).text().trim();
          const filename =
            fileHref.split("/").pop() ||
            page.label.replace(/\s+/g, "-").substring(0, 60);

          discovered.push({
            url: fileUrl,
            fileType: "payment_250",
            filename,
          });
        }
      });
    } catch (err) {
      console.error(
        `[discover] Error fetching Bromley landing page ${page.url}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(
    `[discover] Found ${discovered.length} files (${discovered.length} payment, 0 pcard)`
  );
  return discovered;
}

export const bromleyConfig: CouncilScraperConfig = {
  id: "bromley",
  name: "London Borough of Bromley",
  slug: "bromley",
  region: "London",
  transparencyUrl:
    "https://www.bromley.gov.uk/council-democracy/council-spending/2",
  websiteUrl: "https://www.bromley.gov.uk",

  filePatterns: {
    payment250: [/payment/i, /supplier/i, /invoice/i],
    pcard: [],
  },

  // Bromley older CSV format:
  // Organisation, Service Area, Portfolio, Supplier_Name, Payment_Date,
  // Transaction_Number, Net Amount, Merchant Category
  // Newer XLSX format:
  // SERVICE_AREA, PORTFOLIO, SUBJ_DESCRIPTION, SUPPLIER_NAME_REDACTED,
  // PAYMENT_NUMBER, PAYMENT_DATE, Net Amount, VENDOR_TYPE_LOOKUP_CODE
  //
  // We map the CSV format (8 cols). XLSX files won't parse as CSV, so
  // they'll be skipped gracefully (0 records parsed).
  columnMappings: {
    payment250: {
      directorate: 1,       // Service Area / SERVICE_AREA
      service: 2,           // Portfolio / PORTFOLIO
      division: 1,          // (reuse Service Area)
      responsibleUnit: 7,   // Merchant Category / VENDOR_TYPE
      expenseType: 2,       // Portfolio / SUBJ_DESCRIPTION
      paymentDate: 4,       // Payment_Date / PAYMENT_DATE
      transactionNumber: 5, // Transaction_Number / PAYMENT_NUMBER
      netAmount: 6,         // Net Amount
      supplierName: 3,      // Supplier_Name / SUPPLIER_NAME_REDACTED
    },
  },

  dateFormat: "DD/MM/YYYY",
  minColumns: 7,
  headerKeywords: [
    "organisation",
    "service_area",
    "service area",
    "portfolio",
    "supplier",
    "net amount",
    "vendor",
    "payment_number",
  ],

  customDiscovery: discoverBromleyLinks,
};
