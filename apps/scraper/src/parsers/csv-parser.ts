import Papa from "papaparse";
import type {
  CouncilScraperConfig,
  ParsedPayment,
  ParsedPcardTransaction,
  Payment250ColumnMap,
  PcardColumnMap,
} from "../councils/types";
import { parseAmount, parseDate, normalizeSupplierName, deriveFinancialYear } from "./transforms";
import { createHash } from "crypto";

/** Safely get a column value, returning null for negative/out-of-bounds indices */
function col(row: string[], idx: number): string | null {
  if (idx < 0 || idx >= row.length) return null;
  return row[idx]?.trim() || null;
}

/** Generate a synthetic transaction number from row data for dedup */
function syntheticTxnNumber(
  date: string | null,
  amount: string | null,
  supplier: string | null,
  rowIndex: number
): string {
  const input = `${date}|${amount}|${supplier}|${rowIndex}`;
  return createHash("sha256").update(input).digest("hex").substring(0, 12);
}

/** Default header keywords for payment files */
const DEFAULT_HEADER_KEYWORDS = [
  "directorate",
  "service",
  "division",
  "responsible",
  "expense",
  "payment",
  "trans",
  "amount",
  "supplier",
  "beneficiary",
  "department",
  "purpose",
  "date",
  "year",
  "month",
  "category",
  "merchant",
  "portfolio",
  "vendor",
  "cost centre",
  "gross",
  "net",
  "vat",
];

/**
 * Detects if a row is a header row by checking for known keywords.
 * Returns true if >= 3 cells match known header patterns.
 */
function isHeaderRow(row: string[], extraKeywords?: string[]): boolean {
  const keywords = extraKeywords
    ? [...DEFAULT_HEADER_KEYWORDS, ...extraKeywords]
    : DEFAULT_HEADER_KEYWORDS;

  let matches = 0;
  for (const cell of row) {
    const lower = cell.toLowerCase().trim();
    if (keywords.some((h) => lower.includes(h))) {
      matches++;
    }
  }
  return matches >= 3;
}

/**
 * Detect and skip title/banner rows at the top of CSV files.
 * Returns the index of the first data-relevant row (header or data).
 */
function findDataStart(rows: string[][], skipRows: number, extraKeywords?: string[]): number {
  let idx = skipRows;

  // Skip any additional rows that look like titles (single-cell or very few cells with text)
  while (idx < rows.length) {
    const row = rows[idx];
    // A title row typically has 1-2 non-empty cells while the data has many more
    const nonEmpty = row.filter((c) => c.trim().length > 0).length;
    if (nonEmpty <= 2 && row.length > 3) {
      idx++;
      continue;
    }
    break;
  }

  return idx;
}

/**
 * Parse a payment_250 CSV file and return normalized payment records.
 * Handles variable column counts and skip rows.
 */
export function parsePayment250Csv(
  csvText: string,
  columnMap: Payment250ColumnMap,
  options?: { skipRows?: number; minColumns?: number; headerKeywords?: string[] }
): ParsedPayment[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length === 0) return [];

  const skipRows = options?.skipRows ?? 0;
  const minCols = options?.minColumns ?? 9;

  // Find where data starts (skip title rows)
  let startIdx = findDataStart(rows, skipRows, options?.headerKeywords);

  // Skip header row if detected
  if (startIdx < rows.length && isHeaderRow(rows[startIdx], options?.headerKeywords)) {
    startIdx++;
  }

  const payments: ParsedPayment[] = [];
  // Find max valid column index needed from the map (ignore negatives)
  const colIndices = [
    columnMap.directorate, columnMap.service, columnMap.division,
    columnMap.responsibleUnit, columnMap.expenseType, columnMap.paymentDate,
    columnMap.transactionNumber, columnMap.netAmount, columnMap.supplierName,
  ].filter((c) => c >= 0);
  const maxCol = Math.max(...colIndices);

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < Math.min(minCols, maxCol + 1)) continue;

    const amount = parseAmount(col(row, columnMap.netAmount) ?? undefined);
    if (amount === null) continue;

    const dateStr = parseDate(col(row, columnMap.paymentDate) ?? undefined);
    const supplierName = col(row, columnMap.supplierName);
    const txnNumber = col(row, columnMap.transactionNumber);

    payments.push({
      directorate: col(row, columnMap.directorate),
      service: col(row, columnMap.service),
      division: col(row, columnMap.division),
      responsibleUnit: col(row, columnMap.responsibleUnit),
      expenseType: col(row, columnMap.expenseType),
      paymentDate: dateStr,
      transactionNumber: txnNumber || syntheticTxnNumber(dateStr, amount, supplierName, i),
      netAmount: amount,
      supplierName,
      supplierNameNormalized: normalizeSupplierName(supplierName),
      financialYear: deriveFinancialYear(dateStr),
    });
  }

  return payments;
}

/**
 * Parse a pcard CSV file and return normalized transaction records.
 */
export function parsePcardCsv(
  csvText: string,
  columnMap: PcardColumnMap,
  options?: { skipRows?: number; headerKeywords?: string[] }
): ParsedPcardTransaction[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length === 0) return [];

  const skipRows = options?.skipRows ?? 0;
  let startIdx = findDataStart(rows, skipRows, options?.headerKeywords);

  // P-card files typically have no headers, but check anyway
  if (startIdx < rows.length && isHeaderRow(rows[startIdx], options?.headerKeywords)) {
    startIdx++;
  }

  const transactions: ParsedPcardTransaction[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const amount = parseAmount(row[columnMap.amount]);
    if (amount === null) continue;

    const dateStr = parseDate(row[columnMap.date]);
    const supplierName = row[columnMap.supplier]?.trim() || null;
    const description = row[columnMap.expenseDescription]?.trim() || null;
    const directorate = row[columnMap.directorate]?.trim() || null;

    // Create composite hash for dedup (no transaction number for pcards)
    const hashInput = `${dateStr}|${amount}|${supplierName}|${description}`;
    const compositeHash = createHash("sha256")
      .update(hashInput)
      .digest("hex")
      .substring(0, 16);

    transactions.push({
      transactionDate: dateStr,
      amount,
      expenseDescription: description,
      supplierName,
      supplierNameNormalized: normalizeSupplierName(supplierName),
      directorate,
      compositeHash,
    });
  }

  return transactions;
}
