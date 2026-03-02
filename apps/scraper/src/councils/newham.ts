import type { CouncilScraperConfig } from "./types";

export const newhamConfig: CouncilScraperConfig = {
  id: "newham",
  name: "London Borough of Newham",
  slug: "newham",
  region: "London",
  transparencyUrl: "https://www.newham.gov.uk/council/council-spending/1",
  websiteUrl: "https://www.newham.gov.uk",

  filePatterns: {
    payment250: [
      /payments?\s*to\s*supplier/i,
      /payment.*supplier/i,
      /supplier.*payment/i,
    ],
    pcard: [
      /purchase\s*card/i,
      /staff\s*purchase/i,
    ],
  },

  // Newham current format (2020+):
  // Transaction Date, Local Authority Department, BENEFICIARY, Purpose, Amount, Non Recoverable, Merchant Category
  // Older format (2018-2019):
  // Date Incurred, Directorate, Beneficiary, Purpose, Amount, Non Recoverable VAT, Supplier Type
  // Both have 7 columns, same positional mapping works for both
  columnMappings: {
    payment250: {
      directorate: 1,       // Local Authority Department / Directorate
      service: 3,           // Purpose
      division: 6,          // Merchant Category / Supplier Type
      responsibleUnit: 1,   // (reuse department)
      expenseType: 3,       // Purpose
      paymentDate: 0,       // Transaction Date / Date Incurred
      transactionNumber: -1, // Newham has no txn number - will be auto-generated
      netAmount: 4,         // Amount
      supplierName: 2,      // BENEFICIARY
    },
    pcard: {
      date: 0,
      amount: 4,
      expenseDescription: 3,
      supplier: 2,
      directorate: 1,
    },
  },

  dateFormat: "DD-MM-YYYY",
  minColumns: 5,
  headerKeywords: ["beneficiary", "merchant", "transaction", "non recoverable"],

  fetchHeaders: {
    Accept: "text/html,application/xhtml+xml,*/*",
  },
};
