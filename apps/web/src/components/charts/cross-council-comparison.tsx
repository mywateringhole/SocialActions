"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CouncilComparisonData {
  councilName: string;
  councilSlug: string;
  totalSpend: number;
  transactionCount: number;
  supplierCount: number;
  avgPayment: number;
}

interface CrossCouncilComparisonProps {
  data: CouncilComparisonData[];
}

const COLORS = [
  "hsl(222, 47%, 11%)",
  "hsl(222, 47%, 25%)",
  "hsl(222, 47%, 40%)",
  "hsl(200, 60%, 40%)",
  "hsl(200, 60%, 55%)",
  "hsl(180, 50%, 45%)",
];

export function CrossCouncilComparison({
  data,
}: CrossCouncilComparisonProps) {
  const chartData = data.map((d) => ({
    name: d.councilName.replace("London Borough of ", ""),
    totalSpend: d.totalSpend,
    transactions: d.transactionCount,
    suppliers: d.supplierCount,
    slug: d.councilSlug,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Total Spend by Council</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} angle={-15} textAnchor="end" height={60} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `£${(v / 1e9).toFixed(1)}B`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `£${(value / 1e6).toFixed(1)}M`,
                  "Total Spend",
                ]}
              />
              <Bar dataKey="totalSpend" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
