import { caller } from "@/lib/trpc-server";
import { AnomalyCard } from "@/components/cards/anomaly-card";
import { AnomalyFilters } from "./anomaly-filters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anomalies - SocialActions",
};

export default async function AnomaliesPage() {
  let anomalies: Awaited<ReturnType<typeof caller.anomalies.list>> = {
    data: [],
    total: 0,
    limit: 50,
    offset: 0,
  };
  let summary = { high: 0, medium: 0, low: 0, total: 0 };

  try {
    [anomalies, summary] = await Promise.all([
      caller.anomalies.list({ limit: 50 }),
      caller.anomalies.summary(),
    ]);
  } catch {
    // DB not available
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Anomalies</h1>
        <p className="text-muted-foreground mt-1">
          Statistical patterns flagged for public review. These may have
          legitimate explanations.
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 font-medium">
          {summary.high} High
        </span>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
          {summary.medium} Medium
        </span>
        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
          {summary.low} Low
        </span>
        <span className="text-muted-foreground py-1">
          {summary.total} total
        </span>
      </div>

      {/* Anomalies List */}
      {anomalies.data.length > 0 ? (
        <div className="space-y-4">
          {anomalies.data.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              title={anomaly.title}
              description={anomaly.description}
              severity={anomaly.severity}
              anomalyType={anomaly.anomalyType}
              councilName={anomaly.councilName}
              councilSlug={anomaly.councilSlug}
              periodStart={anomaly.periodStart}
              relatedEntity={anomaly.relatedEntity}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No anomalies detected yet. Import data and run the anomaly detectors.
        </p>
      )}
    </div>
  );
}
