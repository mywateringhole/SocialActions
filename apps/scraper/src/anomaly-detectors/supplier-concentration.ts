import { sql } from "drizzle-orm";
import type { Database } from "@socialactions/db";
import type { DetectedAnomaly } from "./types";

/**
 * Supplier Concentration Detector
 * Uses HHI (Herfindahl-Hirschman Index) per department per quarter.
 * Flags when HHI > 2500 or top supplier > 40% share.
 */
export async function detectSupplierConcentration(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  const result = await db.execute(sql`
    WITH quarterly_spend AS (
      SELECT
        directorate,
        supplier_name_normalized,
        date_trunc('quarter', payment_date::timestamp)::date AS quarter,
        SUM(net_amount::numeric) AS supplier_total
      FROM payments
      WHERE council_id = ${councilId}
        AND payment_date IS NOT NULL
        AND supplier_name_normalized IS NOT NULL
        AND net_amount::numeric > 0
      GROUP BY directorate, supplier_name_normalized, date_trunc('quarter', payment_date::timestamp)
    ),
    dept_totals AS (
      SELECT
        directorate,
        quarter,
        SUM(supplier_total) AS dept_total
      FROM quarterly_spend
      GROUP BY directorate, quarter
    ),
    shares AS (
      SELECT
        q.directorate,
        q.quarter,
        q.supplier_name_normalized,
        q.supplier_total,
        d.dept_total,
        (q.supplier_total / NULLIF(d.dept_total, 0) * 100) AS share_pct,
        POWER(q.supplier_total / NULLIF(d.dept_total, 0) * 100, 2) AS hhi_contrib
      FROM quarterly_spend q
      JOIN dept_totals d ON q.directorate = d.directorate AND q.quarter = d.quarter
    ),
    hhi AS (
      SELECT
        directorate,
        quarter,
        SUM(hhi_contrib) AS hhi_index,
        MAX(share_pct) AS top_share,
        (ARRAY_AGG(supplier_name_normalized ORDER BY share_pct DESC))[1] AS top_supplier
      FROM shares
      GROUP BY directorate, quarter
      HAVING SUM(hhi_contrib) > 2500 OR MAX(share_pct) > 40
    )
    SELECT * FROM hhi
    ORDER BY hhi_index DESC
    LIMIT 50
  `);

  for (const row of result) {
    const r = row as Record<string, unknown>;
    const hhi = Number(r.hhi_index);
    const topShare = Number(r.top_share);

    anomalies.push({
      anomalyType: "supplier_concentration",
      severity: hhi > 5000 || topShare > 60 ? "high" : "medium",
      title: `High supplier concentration in ${r.directorate}`,
      description: `${r.directorate} has an HHI of ${hhi.toFixed(0)} in Q${String(r.quarter).substring(0, 7)}. Top supplier "${r.top_supplier}" holds ${topShare.toFixed(1)}% of spend.`,
      periodStart: String(r.quarter),
      relatedEntity: String(r.directorate),
      metrics: {
        hhiIndex: hhi,
        topSupplierShare: topShare,
        topSupplier: r.top_supplier,
      },
    });
  }

  return anomalies;
}
