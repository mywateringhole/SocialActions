import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Duplicate Payment Detector
 * Flags cases where the same amount + supplier appear within 7 days
 * with different transaction numbers.
 */
export async function detectDuplicatePayments(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    SELECT
      a.supplier_name,
      a.supplier_name_normalized,
      a.net_amount,
      a.payment_date AS date_a,
      b.payment_date AS date_b,
      a.transaction_number AS txn_a,
      b.transaction_number AS txn_b,
      a.directorate
    FROM payments a
    JOIN payments b
      ON a.council_id = b.council_id
      AND a.supplier_name_normalized = b.supplier_name_normalized
      AND a.net_amount = b.net_amount
      AND a.id < b.id
      AND a.transaction_number != b.transaction_number
      AND ABS(a.payment_date::date - b.payment_date::date) <= 7
    WHERE a.council_id = ${councilId}
      AND a.payment_date IS NOT NULL
      AND b.payment_date IS NOT NULL
    ORDER BY a.net_amount::numeric DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const amount = Number(r.net_amount);

    anomalies.push({
      anomalyType: "duplicate_payment",
      severity: amount > 50000 ? "high" : amount > 10000 ? "medium" : "low",
      title: `Possible duplicate payment to ${r.supplier_name}`,
      description: `Two payments of £${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to "${r.supplier_name}" on ${r.date_a} (${r.txn_a}) and ${r.date_b} (${r.txn_b}).`,
      periodStart: String(r.date_a),
      periodEnd: String(r.date_b),
      relatedEntity: String(r.supplier_name_normalized),
      metrics: {
        amount,
        transactionA: r.txn_a,
        transactionB: r.txn_b,
        directorate: r.directorate,
      },
    });
  }

  return anomalies;
}
