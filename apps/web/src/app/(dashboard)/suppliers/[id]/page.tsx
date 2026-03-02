export const dynamic = "force-dynamic";

import { caller } from "@/lib/trpc-server";
import { StatCard } from "@/components/cards/stat-card";
import { SpendingTrend } from "@/components/charts/spending-trend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  return { title: `${decoded} - Supplier - SocialActions` };
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;
  const supplierNameNormalized = decodeURIComponent(id);

  const detail = await caller.suppliers.detail({ supplierNameNormalized });

  const totalAmount = detail.summary.reduce(
    (sum, s) => sum + Number(s.totalAmount),
    0
  );
  const totalTransactions = detail.summary.reduce(
    (sum, s) => sum + s.transactionCount,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{supplierNameNormalized}</h1>
        <p className="text-muted-foreground mt-1">Cross-council supplier view</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Spend"
          value={formatCurrency(totalAmount)}
        />
        <StatCard
          title="Transactions"
          value={formatNumber(totalTransactions)}
        />
        <StatCard
          title="Councils"
          value={String(detail.summary.length)}
        />
      </div>

      {/* Spending Trend */}
      <div className="mb-8">
        <SpendingTrend data={detail.trend} title="Monthly Spending Trend" />
      </div>

      {/* Council Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spend by Council</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Council</th>
                <th className="pb-2 font-medium text-right">Transactions</th>
                <th className="pb-2 font-medium text-right">Total Spend</th>
                <th className="pb-2 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {detail.summary.map((row) => (
                <tr
                  key={row.councilId}
                  className="border-b last:border-0"
                >
                  <td className="py-2">
                    <a
                      href={`/councils/${row.councilSlug}`}
                      className="hover:underline text-primary"
                    >
                      {row.councilName}
                    </a>
                  </td>
                  <td className="py-2 text-right">
                    {formatNumber(row.transactionCount)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(Number(row.totalAmount))}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {row.firstPayment} - {row.lastPayment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
