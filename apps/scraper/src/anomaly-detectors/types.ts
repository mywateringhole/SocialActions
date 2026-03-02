export interface DetectedAnomaly {
  anomalyType:
    | "spending_spike"
    | "supplier_concentration"
    | "new_large_supplier"
    | "round_numbers"
    | "year_end_surge"
    | "split_transactions"
    | "unusual_expense"
    | "duplicate_payment";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  periodStart?: string;
  periodEnd?: string;
  relatedEntity?: string;
  metrics: Record<string, unknown>;
}
