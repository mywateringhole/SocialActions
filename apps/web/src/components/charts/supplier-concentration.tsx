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

interface SupplierData {
  supplierName: string | null;
  totalAmount: string;
  transactionCount: number;
}

interface SupplierConcentrationProps {
  data: SupplierData[];
  title?: string;
}

export function SupplierConcentration({
  data,
  title = "Top Suppliers",
}: SupplierConcentrationProps) {
  const chartData = data.slice(0, 10).map((d) => {
    const name = d.supplierName ?? "Unknown";
    return {
      name: name.length > 25 ? name.slice(0, 25) + "..." : name,
      amount: Number(d.totalAmount),
      transactions: d.transactionCount,
    };
  });

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
                width={180}
              />
              <Tooltip
                formatter={(value: number) => [
                  `\u00a3${value.toLocaleString("en-GB")}`,
                  "Total Spend",
                ]}
              />
              <Bar dataKey="amount" fill="hsl(222.2, 47.4%, 30%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
