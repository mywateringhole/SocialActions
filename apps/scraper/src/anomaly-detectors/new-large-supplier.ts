import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * New Large Supplier Detector
 * Flags suppliers whose first-ever payment exceeds £50,000.
 */
export async function detectNewLargeSuppliers(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH first_payments AS (
      SELECT
        supplier_name_normalized,
        supplier_name,
        MIN(payment_date) AS first_date,
        net_amount::numeric AS first_amount,
        directorate
      FROM payments
      WHERE council_id = ${councilId}
        AND supplier_name_normalized IS NOT NULL
        AND payment_date IS NOT NULL
      GROUP BY supplier_name_normalized, supplier_name, net_amount, directorate
    ),
    first_only AS (
      SELECT DISTINCT ON (supplier_name_normalized)
        supplier_name_normalized,
        supplier_name,
        first_date,
        first_amount,
        directorate
      FROM first_payments
      ORDER BY supplier_name_normalized, first_date ASC
    )
    SELECT *
    FROM first_only
    WHERE first_amount > 50000
    ORDER BY first_amount DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const amount = Number(r.first_amount);

    anomalies.push({
      anomalyType: "new_large_supplier",
      severity: amount > 200000 ? "high" : amount > 100000 ? "medium" : "low",
      title: `New large supplier: ${r.supplier_name}`,
      description: `First payment of £${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to "${r.supplier_name}" on ${r.first_date} in ${r.directorate}.`,
      periodStart: String(r.first_date),
      relatedEntity: String(r.supplier_name_normalized),
      metrics: {
        firstPaymentAmount: amount,
        supplierName: r.supplier_name,
        directorate: r.directorate,
      },
    });
  }

  return anomalies;
}
