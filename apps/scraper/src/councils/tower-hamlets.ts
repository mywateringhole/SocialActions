import type { CouncilScraperConfig } from "./types";

export const towerHamletsConfig: CouncilScraperConfig = {
  id: "tower-hamlets",
  name: "London Borough of Tower Hamlets",
  slug: "tower-hamlets",
  region: "London",
  transparencyUrl:
    "https://www.towerhamlets.gov.uk/lgnl/council_and_democracy/council_spending/spending_over_250.aspx",
  websiteUrl: "https://www.towerhamlets.gov.uk",

  filePatterns: {
    payment250: [
      /payments?\s*over\s*[£]?250/i,
      /over[_\-\s]?250/i,
      /250[_\-\s]?spend/i,
      /spend(ing)?[_\-\s]?over/i,
    ],
    pcard: [
      /p[_\-\s]?card/i,
      /purchase[_\-\s]?card/i,
      /pcard/i,
    ],
  },

  columnMappings: {
    payment250: {
      directorate: 0,
      service: 1,
      division: 2,
      responsibleUnit: 3,
      expenseType: 4,
      paymentDate: 5,
      transactionNumber: 6,
      netAmount: 7,
      supplierName: 8,
    },
    pcard: {
      date: 0,
      amount: 1,
      expenseDescription: 2,
      supplier: 3,
      directorate: 4,
    },
  },

  dateFormat: "DD/MM/YYYY",
};
