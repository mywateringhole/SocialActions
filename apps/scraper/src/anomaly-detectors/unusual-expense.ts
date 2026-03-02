import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Unusual Expense Type Detector
 * Flags expense types that have < 3 prior occurrences in a department
 * and an amount > £5,000.
 */
export async function detectUnusualExpenses(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH expense_counts AS (
      SELECT
        directorate,
        expense_type,
        COUNT(*) AS occurrence_count,
        SUM(net_amount::numeric) AS total_amount,
        MAX(net_amount::numeric) AS max_amount,
        MAX(supplier_name) AS example_supplier,
        MAX(payment_date) AS latest_date
      FROM payments
      WHERE council_id = ${councilId}
        AND directorate IS NOT NULL
        AND expense_type IS NOT NULL
      GROUP BY directorate, expense_type
      HAVING COUNT(*) < 3 AND MAX(net_amount::numeric) > 5000
    )
    SELECT * FROM expense_counts
    ORDER BY max_amount DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const maxAmount = Number(r.max_amount);

    anomalies.push({
      anomalyType: "unusual_expense",
      severity: maxAmount > 50000 ? "high" : maxAmount > 20000 ? "medium" : "low",
      title: `Unusual expense type in ${r.directorate}`,
      description: `"${r.expense_type}" has only ${r.occurrence_count} occurrence(s) in ${r.directorate} with a max payment of £${maxAmount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to "${r.example_supplier}".`,
      periodStart: String(r.latest_date),
      relatedEntity: String(r.expense_type),
      metrics: {
        occurrenceCount: Number(r.occurrence_count),
        maxAmount,
        totalAmount: Number(r.total_amount),
        directorate: r.directorate,
      },
    });
  }

  return anomalies;
}
