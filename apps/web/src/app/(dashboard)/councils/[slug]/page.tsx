export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc-server";
import { StatCard } from "@/components/cards/stat-card";
import { SpendingTrend } from "@/components/charts/spending-trend";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { SupplierConcentration } from "@/components/charts/supplier-concentration";
import { AnomalyCard } from "@/components/cards/anomaly-card";
import { TransactionsTable } from "./transactions-table";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const council = await caller.councils.bySlug({ slug });
  if (!council) return { title: "Council Not Found" };
  return { title: `${council.name} - SocialActions` };
}

export default async function CouncilDetailPage({ params }: Props) {
  const { slug } = await params;
  const council = await caller.councils.bySlug({ slug });

  if (!council) notFound();

  const [trend, departments, suppliers, anomalies] = await Promise.all([
    caller.analytics.monthlyTrend({ councilId: council.id }),
    caller.analytics.departmentBreakdown({ councilId: council.id }),
    caller.suppliers.topByCouncil({ councilId: council.id, limit: 20 }),
    caller.anomalies.list({ councilId: council.id, limit: 20 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{council.name}</h1>
        <p className="text-muted-foreground mt-1">{council.region}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Spend"
          value={formatCurrency(council.stats.totalSpend)}
        />
        <StatCard
          title="Transactions"
          value={formatNumber(council.stats.totalPayments)}
        />
        <StatCard
          title="Avg Payment"
          value={formatCurrency(council.stats.avgPayment)}
        />
        <StatCard
          title="Anomalies"
          value={String(council.stats.anomalyCount)}
          subtitle={
            council.stats.earliestDate
              ? `${formatDate(council.stats.earliestDate)} - ${formatDate(council.stats.latestDate)}`
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SpendingTrend data={trend} />
        <CategoryBreakdown
          data={departments.map((d) => ({
            name: d.directorate ?? "Unknown",
            amount: Number(d.totalAmount),
            count: d.transactionCount,
          }))}
        />
      </div>

      {/* Suppliers */}
      <div className="mb-8">
        <SupplierConcentration data={suppliers} />
      </div>

      {/* Anomalies */}
      {anomalies.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Anomalies</h2>
          <div className="space-y-4">
            {anomalies.data.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                title={anomaly.title}
                description={anomaly.description}
                severity={anomaly.severity}
                anomalyType={anomaly.anomalyType}
                periodStart={anomaly.periodStart}
                relatedEntity={anomaly.relatedEntity}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        <TransactionsTable councilId={council.id} />
      </div>
    </div>
  );
}
