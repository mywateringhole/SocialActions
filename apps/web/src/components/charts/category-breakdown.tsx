"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryData {
  name: string;
  amount: number;
  count: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  title?: string;
}

export function CategoryBreakdown({
  data,
  title = "Department Breakdown",
}: CategoryBreakdownProps) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.name && d.name.length > 20 ? d.name.slice(0, 20) + "..." : (d.name ?? "Unknown"),
    amount: d.amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                fontSize={12}
                tickFormatter={(v) => `\u00a3${(v / 1000000).toFixed(1)}M`}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                width={150}
              />
              <Tooltip
                formatter={(value: number) => [
                  `\u00a3${value.toLocaleString("en-GB")}`,
                  "Total Spend",
                ]}
              />
              <Bar dataKey="amount" fill="hsl(222.2, 47.4%, 11.2%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
