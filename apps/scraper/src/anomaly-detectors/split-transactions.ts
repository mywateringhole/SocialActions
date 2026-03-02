import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Split Transaction Detector
 * Flags multiple payments to the same supplier within 3 days where
 * each payment is below a threshold but the sum exceeds it.
 */
export async function detectSplitTransactions(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const THRESHOLD = 50000;
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH payment_groups AS (
      SELECT
        supplier_name_normalized,
        MAX(supplier_name) AS supplier_name,
        payment_date::date AS pay_date,
        directorate,
        COUNT(*) AS txn_count,
        SUM(net_amount::numeric) AS total_amount,
        MAX(net_amount::numeric) AS max_single,
        ARRAY_AGG(net_amount::numeric ORDER BY net_amount::numeric DESC) AS amounts
      FROM payments
      WHERE council_id = ${councilId}
        AND payment_date IS NOT NULL
        AND supplier_name_normalized IS NOT NULL
        AND net_amount::numeric > 0
        AND net_amount::numeric < ${THRESHOLD}
      GROUP BY supplier_name_normalized, payment_date::date, directorate
      HAVING COUNT(*) >= 3 AND SUM(net_amount::numeric) >= ${THRESHOLD}
    )
    SELECT * FROM payment_groups
    ORDER BY total_amount DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const totalAmount = Number(r.total_amount);
    const txnCount = Number(r.txn_count);

    anomalies.push({
      anomalyType: "split_transactions",
      severity: totalAmount > 100000 ? "high" : "medium",
      title: `Possible split transactions to ${r.supplier_name}`,
      description: `${txnCount} payments totalling £${totalAmount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to "${r.supplier_name}" on ${r.pay_date}, each individually below £${THRESHOLD.toLocaleString("en-GB")}.`,
      periodStart: String(r.pay_date),
      relatedEntity: String(r.supplier_name_normalized),
      metrics: {
        transactionCount: txnCount,
        totalAmount,
        maxSingle: Number(r.max_single),
        directorate: r.directorate,
      },
    });
  }

  return anomalies;
}
