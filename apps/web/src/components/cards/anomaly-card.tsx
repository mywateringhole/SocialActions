"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { anomalyTypeLabel, severityColor, formatDate } from "@/lib/utils";

interface AnomalyCardProps {
  title: string;
  description: string;
  severity: string;
  anomalyType: string;
  councilName?: string;
  councilSlug?: string;
  periodStart?: string | null;
  relatedEntity?: string | null;
}

export function AnomalyCard({
  title,
  description,
  severity,
  anomalyType,
  councilName,
  councilSlug,
  periodStart,
  relatedEntity,
}: AnomalyCardProps) {
  return (
    <Card className={`border-l-4 ${severityColor(severity)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge
            variant={
              severity === "high"
                ? "destructive"
                : severity === "medium"
                  ? "default"
                  : "secondary"
            }
            className="shrink-0"
          >
            {severity}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {anomalyTypeLabel(anomalyType)}
          </Badge>
          {councilName && (
            <a
              href={`/councils/${councilSlug}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              {councilName}
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          {periodStart && <span>Period: {formatDate(periodStart)}</span>}
          {relatedEntity && <span>Entity: {relatedEntity}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
