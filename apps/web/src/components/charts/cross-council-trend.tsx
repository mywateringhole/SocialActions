"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendDataPoint {
  month: string;
  councilName: string;
  totalAmount: string;
}

interface CrossCouncilTrendProps {
  data: TrendDataPoint[];
}

const COLORS = [
  "hsl(222, 47%, 11%)",
  "hsl(200, 60%, 40%)",
  "hsl(30, 80%, 50%)",
  "hsl(150, 50%, 40%)",
  "hsl(280, 50%, 50%)",
  "hsl(350, 60%, 50%)",
];

function formatMonth(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function CrossCouncilTrend({ data }: CrossCouncilTrendProps) {
  // Pivot data: group by month, with each council as a column
  const councilNames = [...new Set(data.map((d) => d.councilName))];
  const shortNames = councilNames.map((n) =>
    n.replace("London Borough of ", "")
  );

  const byMonth = new Map<string, Record<string, number>>();
  for (const d of data) {
    const key = d.month;
    if (!byMonth.has(key)) {
      byMonth.set(key, {});
    }
    const row = byMonth.get(key)!;
    const shortName = d.councilName.replace("London Borough of ", "");
    row[shortName] = Number(d.totalAmount);
  }

  const chartData = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month: formatMonth(month),
      ...values,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Spending Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `£${(v / 1e6).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `£${(value / 1e6).toFixed(1)}M`,
                  name,
                ]}
              />
              <Legend fontSize={11} />
              {shortNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
