"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionsTableProps {
  councilId: number;
}

export function TransactionsTable({ councilId }: TransactionsTableProps) {
  const [offset, setOffset] = useState(0);
  const [supplierSearch, setSupplierSearch] = useState("");
  const limit = 25;

  const { data, isLoading } = trpc.payments.list.useQuery({
    councilId,
    supplierSearch: supplierSearch || undefined,
    limit,
    offset,
    sortBy: "date",
    sortOrder: "desc",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle className="text-base">Transactions</CardTitle>
          <input
            type="text"
            placeholder="Search supplier..."
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setOffset(0);
            }}
            className="border rounded-md px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Supplier</th>
                    <th className="pb-2 font-medium">Directorate</th>
                    <th className="pb-2 font-medium">Expense Type</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 whitespace-nowrap">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="py-2 max-w-[200px] truncate">
                        {payment.supplierName ?? "N/A"}
                      </td>
                      <td className="py-2 max-w-[150px] truncate">
                        {payment.directorate ?? "N/A"}
                      </td>
                      <td className="py-2 max-w-[150px] truncate">
                        {payment.expenseType ?? "N/A"}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap font-mono">
                        {formatCurrency(Number(payment.netAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-sm">
              <span className="text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, data.total)} of{" "}
                {data.total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= data.total}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
