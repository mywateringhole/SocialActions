"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface CouncilCardProps {
  name: string;
  slug: string;
  region: string;
  totalPayments: number;
  totalSpend: number;
  anomalyCount: number;
  maxSpend?: number;
}

export function CouncilCard({
  name,
  slug,
  region,
  totalPayments,
  totalSpend,
  anomalyCount,
  maxSpend,
}: CouncilCardProps) {
  const spendPercent = maxSpend && maxSpend > 0 ? (totalSpend / maxSpend) * 100 : 0;

  return (
    <a href={`/councils/${slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{name}</CardTitle>
            {anomalyCount > 0 && (
              <Badge variant="destructive" className="shrink-0">
                {anomalyCount} flags
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{region}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Spend</p>
              <p className="font-semibold">{formatCurrency(totalSpend)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Transactions</p>
              <p className="font-semibold">{formatNumber(totalPayments)}</p>
            </div>
          </div>
          {maxSpend && maxSpend > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.max(spendPercent, 2)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
