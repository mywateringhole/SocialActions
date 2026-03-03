import { caller } from "@/lib/trpc-server";
import { CouncilCard } from "@/components/cards/council-card";
import { CrossCouncilComparison } from "@/components/charts/cross-council-comparison";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Councils - SocialActions",
};

export default async function CouncilsPage() {
  let councils: Awaited<ReturnType<typeof caller.councils.list>> = [];
  let comparison: Awaited<ReturnType<typeof caller.analytics.crossCouncilComparison>> = [];

  try {
    [councils, comparison] = await Promise.all([
      caller.councils.list(),
      caller.analytics.crossCouncilComparison(),
    ]);
  } catch {
    // DB not available
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Councils</h1>

      {councils.length > 0 ? (
        <>
          {/* Comparison Chart */}
          {comparisonData.length > 1 && (
            <div className="mb-8">
              <CrossCouncilComparison data={comparisonData} />
            </div>
          )}

          {/* Comparison Table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold">Council</th>
                  <th className="pb-3 font-semibold text-right">Total Spend</th>
                  <th className="pb-3 font-semibold text-right">Transactions</th>
                  <th className="pb-3 font-semibold text-right">Suppliers</th>
                  <th className="pb-3 font-semibold text-right">Avg Payment</th>
                  <th className="pb-3 font-semibold text-right">Anomalies</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((c, i) => {
                  const council = councils.find((co) => co.slug === c.councilSlug);
                  return (
                    <tr key={c.councilSlug} className="border-b hover:bg-muted/50">
                      <td className="py-3">
                        <a
                          href={`/councils/${c.councilSlug}`}
                          className="font-medium hover:underline"
                        >
                          {c.councilName.replace("London Borough of ", "")}
                        </a>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatCurrency(c.totalSpend)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatNumber(c.transactionCount)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatNumber(c.supplierCount)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatCurrency(c.avgPayment)}
                      </td>
                      <td className="py-3 text-right">
                        {council && council.anomalyCount > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {council.anomalyCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Council Cards */}
          <h2 className="text-xl font-semibold mb-4">Council Details</h2>
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
        </>
      ) : (
        <p className="text-muted-foreground">
          No councils loaded yet. Run the scraper to import data.
        </p>
      )}
    </div>
  );
}
