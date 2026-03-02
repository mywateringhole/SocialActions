import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Year-End Surge Detector
 * Flags when March spending > 2x average of April-February.
 */
export async function detectYearEndSurge(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH monthly AS (
      SELECT
        directorate,
        EXTRACT(YEAR FROM payment_date::date) AS yr,
        EXTRACT(MONTH FROM payment_date::date) AS mo,
        SUM(net_amount::numeric) AS total
      FROM payments
      WHERE council_id = ${councilId} AND payment_date IS NOT NULL
      GROUP BY directorate, EXTRACT(YEAR FROM payment_date::date), EXTRACT(MONTH FROM payment_date::date)
    ),
    march_spend AS (
      SELECT directorate, yr, total AS march_total
      FROM monthly WHERE mo = 3
    ),
    non_march_avg AS (
      SELECT directorate, yr + (CASE WHEN mo >= 4 THEN 0 ELSE -1 END) AS fy_start,
        AVG(total) AS avg_other
      FROM monthly
      WHERE mo != 3
      GROUP BY directorate, yr + (CASE WHEN mo >= 4 THEN 0 ELSE -1 END)
    )
    SELECT
      m.directorate,
      m.yr,
      m.march_total,
      n.avg_other
    FROM march_spend m
    JOIN non_march_avg n
      ON m.directorate = n.directorate AND m.yr - 1 = n.fy_start
    WHERE n.avg_other > 0 AND m.march_total > 2 * n.avg_other
    ORDER BY m.march_total DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const marchTotal = Number(r.march_total);
    const avgOther = Number(r.avg_other);

    anomalies.push({
      anomalyType: "year_end_surge",
      severity: marchTotal > 3 * avgOther ? "high" : "medium",
      title: `Year-end spending surge in ${r.directorate}`,
      description: `${r.directorate} spent £${marchTotal.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in March ${r.yr}, which is ${(marchTotal / avgOther).toFixed(1)}x the average monthly spend of £${avgOther.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.`,
      periodStart: `${r.yr}-03-01`,
      periodEnd: `${r.yr}-03-31`,
      relatedEntity: String(r.directorate),
      metrics: { marchTotal, averageOtherMonths: avgOther, ratio: marchTotal / avgOther },
    });
  }

  return anomalies;
}
