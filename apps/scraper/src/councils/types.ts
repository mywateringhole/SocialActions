export interface CouncilScraperConfig {
  id: string;
  name: string;
  slug: string;
  region: string;
  transparencyUrl: string;
  websiteUrl: string;

  /** Patterns to match payment CSV links in discovered HTML */
  filePatterns: {
    payment250: RegExp[];
    pcard: RegExp[];
  };

  /** Column mappings for CSV parsing */
  columnMappings: {
    payment250: Payment250ColumnMap;
    pcard?: PcardColumnMap;
  };

  /** Date format used in CSVs (default: DD/MM/YYYY) */
  dateFormat?: string;
}

export interface Payment250ColumnMap {
  directorate: number;
  service: number;
  division: number;
  responsibleUnit: number;
  expenseType: number;
  paymentDate: number;
  transactionNumber: number;
  netAmount: number;
  supplierName: number;
}

export interface PcardColumnMap {
  date: number;
  amount: number;
  expenseDescription: number;
  supplier: number;
  directorate: number;
}

export interface DiscoveredFile {
  url: string;
  fileType: "payment_250" | "pcard";
  filename: string;
}

export interface ParsedPayment {
  directorate: string | null;
  service: string | null;
  division: string | null;
  responsibleUnit: string | null;
  expenseType: string | null;
  paymentDate: string | null;
  transactionNumber: string | null;
  netAmount: string;
  supplierName: string | null;
  supplierNameNormalized: string | null;
  financialYear: string | null;
}

export interface ParsedPcardTransaction {
  transactionDate: string | null;
  amount: string;
  expenseDescription: string | null;
  supplierName: string | null;
  supplierNameNormalized: string | null;
  directorate: string | null;
  compositeHash: string;
}
