import { caller } from "@/lib/trpc-server";
import { StatCard } from "@/components/cards/stat-card";
import { CouncilCard } from "@/components/cards/council-card";
import { AnomalyCard } from "@/components/cards/anomaly-card";
import { CrossCouncilComparison } from "@/components/charts/cross-council-comparison";
import { CrossCouncilTrend } from "@/components/charts/cross-council-trend";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let overview = { totalPayments: 0, totalSpend: 0, councilCount: 0, supplierCount: 0 };
  let councils: Awaited<ReturnType<typeof caller.councils.list>> = [];
  let anomalySummary = { high: 0, medium: 0, low: 0, total: 0 };
  let recentAnomalies: Awaited<ReturnType<typeof caller.anomalies.list>> = { data: [], total: 0, limit: 5, offset: 0 };
  let comparison: Awaited<ReturnType<typeof caller.analytics.crossCouncilComparison>> = [];
  let trend: Awaited<ReturnType<typeof caller.analytics.crossCouncilTrend>> = [];

  try {
    [overview, councils, anomalySummary, recentAnomalies, comparison, trend] = await Promise.all([
      caller.analytics.overview(),
      caller.councils.list(),
      caller.anomalies.summary(),
      caller.anomalies.list({ limit: 5 }),
      caller.analytics.crossCouncilComparison(),
      caller.analytics.crossCouncilTrend({ months: 24 }),
    ]);
  } catch {
    // DB not available - show empty state
  }

  const comparisonData = comparison.map((c) => ({
    councilName: c.councilName,
    councilSlug: c.councilSlug,
    totalSpend: Number(c.totalSpend),
    transactionCount: Number(c.transactionCount),
    supplierCount: Number(c.supplierCount),
    avgPayment: Number(c.avgPayment),
  }));

  const maxSpend = Math.max(...comparisonData.map((c) => c.totalSpend), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          UK Council Spending Transparency
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Track and analyze council spending with AI-powered anomaly detection.
          Making public money accountable, one transaction at a time.
        </p>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        <StatCard
          title="Total Spend Tracked"
          value={formatCurrency(overview.totalSpend)}
        />
        <StatCard
          title="Transactions"
          value={formatNumber(overview.totalPayments)}
        />
        <StatCard
          title="Councils"
          value={String(overview.councilCount)}
        />
        <StatCard
          title="Suppliers"
          value={formatNumber(overview.supplierCount)}
        />
        <StatCard
          title="Anomalies Flagged"
          value={String(anomalySummary.total)}
          subtitle={
            anomalySummary.high > 0
              ? `${anomalySummary.high} high severity`
              : undefined
          }
        />
      </section>

      {/* Cross-Council Charts */}
      {comparisonData.length > 1 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <CrossCouncilComparison data={comparisonData} />
          {trend.length > 0 && <CrossCouncilTrend data={trend} />}
        </section>
      )}

      {/* Council Grid with relative spend bars */}
      {councils.length > 0 && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Councils</h2>
            <a
              href="/councils"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all &rarr;
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {councils.map((council) => (
              <CouncilCard
                key={council.id}
                name={council.name}
                slug={council.slug}
                region={council.region}
                totalPayments={council.totalPayments}
                totalSpend={council.totalSpend}
                anomalyCount={council.anomalyCount}
                maxSpend={maxSpend}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Anomalies */}
      {recentAnomalies.data.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Latest Anomalies</h2>
            <a
              href="/anomalies"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all &rarr;
            </a>
          </div>
          <div className="space-y-4">
            {recentAnomalies.data.map((anomaly) => (
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
        </section>
      )}

      {/* Empty state */}
      {councils.length === 0 && (
        <section className="text-center py-16">
          <p className="text-muted-foreground">
            No data loaded yet. Run the scraper to import council spending data.
          </p>
          <pre className="mt-4 bg-muted rounded-lg p-4 inline-block text-sm text-left">
            {`# Start PostgreSQL\ndocker compose up -d\n\n# Run migrations\npnpm db:push\n\n# Scrape Tower Hamlets data\npnpm scrape:tower-hamlets`}
          </pre>
        </section>
      )}
    </div>
  );
}
