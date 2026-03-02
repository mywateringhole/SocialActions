import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Spending Spike Detector
 * Flags months where spending exceeds the 6-month rolling average + 2*stddev.
 */
export async function detectSpendingSpikes(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH monthly AS (
      SELECT
        directorate,
        date_trunc('month', payment_date::timestamp)::date AS month,
        SUM(net_amount::numeric) AS total
      FROM payments
      WHERE council_id = ${councilId} AND payment_date IS NOT NULL
      GROUP BY directorate, date_trunc('month', payment_date::timestamp)
    ),
    rolling AS (
      SELECT
        directorate,
        month,
        total,
        AVG(total) OVER (
          PARTITION BY directorate
          ORDER BY month
          ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING
        ) AS avg_6m,
        STDDEV(total) OVER (
          PARTITION BY directorate
          ORDER BY month
          ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING
        ) AS stddev_6m
      FROM monthly
    )
    SELECT directorate, month, total, avg_6m, stddev_6m
    FROM rolling
    WHERE avg_6m IS NOT NULL
      AND stddev_6m IS NOT NULL
      AND stddev_6m > 0
      AND total > avg_6m + 2 * stddev_6m
    ORDER BY total - avg_6m DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const total = Number(r.total);
    const avg = Number(r.avg_6m);
    const deviation = total - avg;

    anomalies.push({
      anomalyType: "spending_spike",
      severity: deviation > avg ? "high" : "medium",
      title: `Spending spike in ${r.directorate}`,
      description: `${r.directorate} spent £${total.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in ${String(r.month).substring(0, 7)}, which is £${deviation.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} above the 6-month rolling average of £${avg.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.`,
      periodStart: String(r.month),
      periodEnd: String(r.month),
      relatedEntity: String(r.directorate),
      metrics: {
        monthlyTotal: total,
        rollingAverage: avg,
        standardDeviation: Number(r.stddev_6m),
        deviationAmount: deviation,
      },
    });
  }

  return anomalies;
}
