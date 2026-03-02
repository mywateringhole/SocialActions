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

/** Known header keywords for payment_250 files */
const KNOWN_HEADERS = [
  "directorate",
  "service",
  "division",
  "responsible",
  "expense",
  "payment",
  "trans",
  "amount",
  "supplier",
];

/**
 * Detects if the first row is a header row by checking for known keywords.
 * Returns true if >= 3 cells match known header patterns.
 */
function isHeaderRow(row: string[]): boolean {
  let matches = 0;
  for (const cell of row) {
    const lower = cell.toLowerCase().trim();
    if (KNOWN_HEADERS.some((h) => lower.includes(h))) {
      matches++;
    }
  }
  return matches >= 3;
}

/**
 * Parse a payment_250 CSV file and return normalized payment records.
 */
export function parsePayment250Csv(
  csvText: string,
  columnMap: Payment250ColumnMap
): ParsedPayment[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length === 0) return [];

  // Skip header row if detected
  const startIdx = isHeaderRow(rows[0]) ? 1 : 0;
  const payments: ParsedPayment[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 9) continue;

    const amount = parseAmount(row[columnMap.netAmount]);
    if (amount === null) continue;

    const dateStr = parseDate(row[columnMap.paymentDate]);
    const supplierName = row[columnMap.supplierName]?.trim() || null;

    payments.push({
      directorate: row[columnMap.directorate]?.trim() || null,
      service: row[columnMap.service]?.trim() || null,
      division: row[columnMap.division]?.trim() || null,
      responsibleUnit: row[columnMap.responsibleUnit]?.trim() || null,
      expenseType: row[columnMap.expenseType]?.trim() || null,
      paymentDate: dateStr,
      transactionNumber: row[columnMap.transactionNumber]?.trim() || null,
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
  columnMap: PcardColumnMap
): ParsedPcardTransaction[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length === 0) return [];

  // P-card files typically have no headers, but check anyway
  const startIdx = isHeaderRow(rows[0]) ? 1 : 0;
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
