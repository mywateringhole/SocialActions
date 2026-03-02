const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Parse a monetary amount from various formats.
 * Handles: "1,234.56", "£1,234.56", " £ 1,234.56 ", '"1,234.56"', "-500.00"
 * Returns the amount as a string (for numeric DB column) or null if unparseable.
 */
export function parseAmount(raw: string | undefined): string | null {
  if (!raw) return null;

  // Remove quotes, £ signs, spaces, non-breaking spaces
  let cleaned = raw.replace(/["'£\s\u00a3\u00a0]/g, "").trim();

  // Remove thousands separators (commas)
  cleaned = cleaned.replace(/,/g, "");

  // Check if it's a valid number
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return num.toFixed(2);
}

/**
 * Parse a date string from many UK council formats to ISO date (YYYY-MM-DD).
 * Handles:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (4-digit year)
 * - DD/MM/YY, DD-MM-YY, DD.MM.YY (2-digit year)
 * - DD-Mon-YY, DD-Mon-YYYY (e.g., 01-Mar-24, 01-Mar-2024)
 * - YYYY-MM-DD (ISO, including with time component)
 * - YYYY-MM-DD HH:MM:SS (datetime)
 */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already in ISO format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // DD-Mon-YY or DD-Mon-YYYY (e.g., 01-Mar-24, 01-Mar-2024)
  const monthNameMatch = trimmed.match(
    /^(\d{1,2})[/\-.]([A-Za-z]{3})[/\-.](\d{2,4})$/
  );
  if (monthNameMatch) {
    const [, dayStr, monthName, yearStr] = monthNameMatch;
    const monthNum = MONTH_NAMES[monthName.toLowerCase()];
    if (monthNum) {
      const d = dayStr.padStart(2, "0");
      const y = expandYear(yearStr);
      return `${y}-${monthNum}-${d}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (4-digit year)
  const match4 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match4) {
    const [, day, month, year] = match4;
    const d = day.padStart(2, "0");
    const m = month.padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  // DD/MM/YY or DD-MM-YY or DD.MM.YY (2-digit year)
  const match2 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (match2) {
    const [, day, month, yearStr] = match2;
    const d = day.padStart(2, "0");
    const m = month.padStart(2, "0");
    const y = expandYear(yearStr);
    return `${y}-${m}-${d}`;
  }

  return null;
}

/** Expand 2-digit year to 4-digit. 00-49 → 2000s, 50-99 → 1900s. */
function expandYear(yearStr: string): string {
  if (yearStr.length === 4) return yearStr;
  const y = parseInt(yearStr, 10);
  return String(y < 50 ? 2000 + y : 1900 + y);
}

/**
 * Normalize supplier names for comparison/aggregation.
 * - Uppercase
 * - Remove common suffixes (LTD, LIMITED, PLC, etc.)
 * - Trim extra whitespace
 */
export function normalizeSupplierName(name: string | null): string | null {
  if (!name) return null;

  let normalized = name
    .toUpperCase()
    .trim()
    // Remove common company suffixes
    .replace(
      /\b(LTD|LIMITED|PLC|INC|LLC|LLP|CO|COMPANY|CORP|CORPORATION|GROUP|HOLDINGS?|UK|GB)\b\.?/g,
      ""
    )
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

/**
 * Derive financial year from a date string (ISO format).
 * UK financial year runs April to March.
 * e.g., 2024-01-15 → "2023/24", 2024-04-01 → "2024/25"
 */
export function deriveFinancialYear(
  dateStr: string | null
): string | null {
  if (!dateStr) return null;

  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) return null;

  // April (4) onwards = current year is the start
  // Jan-March = previous year is the start
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}/${String(endYear).slice(-2)}`;
}
