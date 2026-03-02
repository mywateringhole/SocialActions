import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { anomalies, councils } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const anomaliesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        councilId: z.number().optional(),
        severity: z.enum(["low", "medium", "high"]).optional(),
        anomalyType: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.councilId) {
        conditions.push(eq(anomalies.councilId, input.councilId));
      }
      if (input.severity) {
        conditions.push(eq(anomalies.severity, input.severity));
      }
      if (input.anomalyType) {
        conditions.push(eq(anomalies.anomalyType, input.anomalyType as typeof anomalies.anomalyType.enumValues[number]));
      }

      const where =
        conditions.length > 0 ? and(...conditions) : undefined;

      const severityOrder = sql`CASE ${anomalies.severity} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;

      const [data, countResult] = await Promise.all([
        ctx.db
          .select({
            id: anomalies.id,
            councilId: anomalies.councilId,
            councilName: councils.name,
            councilSlug: councils.slug,
            anomalyType: anomalies.anomalyType,
            severity: anomalies.severity,
            title: anomalies.title,
            description: anomalies.description,
            periodStart: anomalies.periodStart,
            periodEnd: anomalies.periodEnd,
            relatedEntity: anomalies.relatedEntity,
            metrics: anomalies.metrics,
            createdAt: anomalies.createdAt,
          })
          .from(anomalies)
          .innerJoin(councils, eq(anomalies.councilId, councils.id))
          .where(where)
          .orderBy(severityOrder, desc(anomalies.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(anomalies)
          .where(where),
      ]);

      return {
        data,
        total: Number(countResult[0]?.count ?? 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  summary: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        severity: anomalies.severity,
        count: sql<number>`count(*)`,
      })
      .from(anomalies)
      .groupBy(anomalies.severity);

    return {
      high: Number(result.find((r) => r.severity === "high")?.count ?? 0),
      medium: Number(
        result.find((r) => r.severity === "medium")?.count ?? 0
      ),
      low: Number(result.find((r) => r.severity === "low")?.count ?? 0),
      total: result.reduce((sum, r) => sum + Number(r.count), 0),
    };
  }),
});
