import type { Database } from "@socialactions/db";
import { anomalies } from "@socialactions/db/schema";
import { eq } from "drizzle-orm";
import type { DetectedAnomaly } from "./types";
import { detectSpendingSpikes } from "./spending-spike";
import { detectSupplierConcentration } from "./supplier-concentration";
import { detectNewLargeSuppliers } from "./new-large-supplier";
import { detectDuplicatePayments } from "./duplicate-payments";
import { detectRoundNumbers } from "./round-numbers";
import { detectYearEndSurge } from "./year-end-surge";
import { detectSplitTransactions } from "./split-transactions";
import { detectUnusualExpenses } from "./unusual-expense";

export type { DetectedAnomaly };

const detectors = [
  { name: "Spending Spikes", fn: detectSpendingSpikes },
  { name: "Supplier Concentration", fn: detectSupplierConcentration },
  { name: "New Large Suppliers", fn: detectNewLargeSuppliers },
  { name: "Duplicate Payments", fn: detectDuplicatePayments },
  { name: "Round Numbers", fn: detectRoundNumbers },
  { name: "Year-End Surge", fn: detectYearEndSurge },
  { name: "Split Transactions", fn: detectSplitTransactions },
  { name: "Unusual Expenses", fn: detectUnusualExpenses },
];

/**
 * Run all anomaly detectors for a council and persist results.
 */
export async function runAllDetectors(
  db: Database,
  councilId: number
): Promise<DetectedAnomaly[]> {
  console.log(`[anomaly] Running ${detectors.length} detectors for council ${councilId}`);

  // Clear existing anomalies for this council
  await db.delete(anomalies).where(eq(anomalies.councilId, councilId));

  const allAnomalies: DetectedAnomaly[] = [];

  for (const detector of detectors) {
    try {
      console.log(`[anomaly] Running: ${detector.name}`);
      const results = await detector.fn(db, councilId);
      console.log(`[anomaly] ${detector.name}: ${results.length} anomalies found`);
      allAnomalies.push(...results);
    } catch (err) {
      console.error(
        `[anomaly] Error in ${detector.name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Persist anomalies
  if (allAnomalies.length > 0) {
    const values = allAnomalies.map((a) => ({
      councilId,
      anomalyType: a.anomalyType,
      severity: a.severity,
      title: a.title,
      description: a.description,
      periodStart: a.periodStart ?? null,
      periodEnd: a.periodEnd ?? null,
      relatedEntity: a.relatedEntity ?? null,
      metrics: a.metrics,
    }));

    // Insert in batches
    for (let i = 0; i < values.length; i += 100) {
      await db.insert(anomalies).values(values.slice(i, i + 100));
    }
  }

  console.log(`[anomaly] Total: ${allAnomalies.length} anomalies persisted`);
  return allAnomalies;
}
