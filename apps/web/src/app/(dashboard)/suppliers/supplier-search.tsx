"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function SupplierSearch() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = trpc.suppliers.search.useQuery(
    { query: searchTerm, limit: 30 },
    { enabled: searchTerm.length >= 2 }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.length >= 2) {
      setSearchTerm(query);
    }
  }

  // Group results by supplier (across councils)
  const grouped = new Map<
    string,
    {
      supplierName: string;
      normalized: string;
      councils: Array<{
        councilId: number;
        transactionCount: number;
        totalAmount: number;
      }>;
      totalAmount: number;
      totalTransactions: number;
    }
  >();

  if (data) {
    for (const row of data) {
      const key = row.supplierNameNormalized ?? "";
      if (!grouped.has(key)) {
        grouped.set(key, {
          supplierName: row.supplierName,
          normalized: row.supplierNameNormalized ?? "",
          councils: [],
          totalAmount: 0,
          totalTransactions: 0,
        });
      }
      const group = grouped.get(key)!;
      group.councils.push({
        councilId: row.councilId,
        transactionCount: row.transactionCount,
        totalAmount: Number(row.totalAmount),
      });
      group.totalAmount += Number(row.totalAmount);
      group.totalTransactions += row.transactionCount;
    }
  }

  const results = Array.from(grouped.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search supplier name (min 2 characters)..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={query.length < 2}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </form>

      {isLoading && searchTerm && (
        <p className="text-muted-foreground">Searching...</p>
      )}

      {searchTerm && !isLoading && results.length === 0 && (
        <p className="text-muted-foreground">
          No suppliers found matching &quot;{searchTerm}&quot;
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            {results.length} supplier{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((supplier) => (
            <a
              key={supplier.normalized}
              href={`/suppliers/${encodeURIComponent(supplier.normalized)}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{supplier.supplierName}</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.councils.length} council{supplier.councils.length !== 1 ? "s" : ""}
                        {" "}&middot;{" "}
                        {formatNumber(supplier.totalTransactions)} transactions
                      </p>
                    </div>
                    <p className="text-lg font-bold font-mono">
                      {formatCurrency(supplier.totalAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {!searchTerm && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Enter a supplier name to search across all councils.</p>
            <p className="text-sm mt-2">
              Try searching for common suppliers like &quot;capita&quot;, &quot;serco&quot;, or &quot;bt&quot;.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
