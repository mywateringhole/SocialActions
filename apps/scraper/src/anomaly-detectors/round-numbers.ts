import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Round Number Detector
 * Flags suppliers where > 50% of payments are round numbers (count > 5).
 */
export async function detectRoundNumbers(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH supplier_payments AS (
      SELECT
        supplier_name_normalized,
        supplier_name,
        net_amount::numeric AS amount,
        COUNT(*) OVER (PARTITION BY supplier_name_normalized) AS total_count,
        CASE
          WHEN net_amount::numeric % 1000 = 0 THEN 1
          WHEN net_amount::numeric % 500 = 0 THEN 1
          WHEN net_amount::numeric % 100 = 0 THEN 1
          ELSE 0
        END AS is_round
      FROM payments
      WHERE council_id = ${councilId}
        AND supplier_name_normalized IS NOT NULL
        AND net_amount::numeric > 0
    ),
    supplier_stats AS (
      SELECT
        supplier_name_normalized,
        MAX(supplier_name) AS supplier_name,
        COUNT(*) AS total_count,
        SUM(is_round) AS round_count,
        SUM(amount) AS total_amount,
        ROUND(SUM(is_round)::numeric / COUNT(*) * 100, 1) AS round_pct
      FROM supplier_payments
      GROUP BY supplier_name_normalized
      HAVING COUNT(*) > 5 AND SUM(is_round)::numeric / COUNT(*) > 0.5
    )
    SELECT * FROM supplier_stats
    ORDER BY total_amount DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const roundPct = Number(r.round_pct);
    const totalAmount = Number(r.total_amount);

    anomalies.push({
      anomalyType: "round_numbers",
      severity: roundPct > 80 ? "high" : "medium",
      title: `High round-number ratio for ${r.supplier_name}`,
      description: `${roundPct}% of ${r.total_count} payments to "${r.supplier_name}" are round numbers (£${totalAmount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total).`,
      relatedEntity: String(r.supplier_name_normalized),
      metrics: {
        roundPercentage: roundPct,
        totalPayments: Number(r.total_count),
        roundPayments: Number(r.round_count),
        totalAmount,
      },
    });
  }

  return anomalies;
}
