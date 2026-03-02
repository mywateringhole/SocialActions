"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  month: string;
  totalAmount: string;
  transactionCount: number;
}

interface SpendingTrendProps {
  data: DataPoint[];
  title?: string;
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatTooltipValue(value: number) {
  return `\u00a3${(value / 1000).toFixed(0)}K`;
}

export function SpendingTrend({
  data,
  title = "Spending Trend",
}: SpendingTrendProps) {
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    amount: Number(d.totalAmount),
    transactions: d.transactionCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `\u00a3${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatTooltipValue(value),
                  "Spend",
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(222.2, 47.4%, 11.2%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
