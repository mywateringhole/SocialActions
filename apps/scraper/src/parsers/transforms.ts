/**
 * Parse a monetary amount from various formats.
 * Handles: "1,234.56", "£1,234.56", '"1,234.56"', "-500.00"
 * Returns the amount as a string (for numeric DB column) or null if unparseable.
 */
export function parseAmount(raw: string | undefined): string | null {
  if (!raw) return null;

  // Remove quotes, £ signs, spaces
  let cleaned = raw.replace(/["'£\s]/g, "").trim();

  // Remove thousands separators (commas)
  cleaned = cleaned.replace(/,/g, "");

  // Check if it's a valid number
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return num.toFixed(2);
}

/**
 * Parse a date string from DD/MM/YYYY format to ISO date (YYYY-MM-DD).
 * Also handles: DD-MM-YYYY, DD.MM.YYYY, and already-ISO formats.
 */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already in ISO format?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const d = day.padStart(2, "0");
    const m = month.padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  return null;
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
