import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { councils, payments, anomalies } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const councilsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: councils.id,
        name: councils.name,
        slug: councils.slug,
        region: councils.region,
        isActive: councils.isActive,
      })
      .from(councils)
      .where(eq(councils.isActive, true))
      .orderBy(councils.name);

    // Get summary stats for each council
    const withStats = await Promise.all(
      result.map(async (council) => {
        const [stats] = await ctx.db
          .select({
            totalPayments: sql<number>`count(*)`,
            totalSpend: sql<string>`coalesce(sum(${payments.netAmount}::numeric), 0)`,
          })
          .from(payments)
          .where(eq(payments.councilId, council.id));

        const [anomalyCount] = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(anomalies)
          .where(eq(anomalies.councilId, council.id));

        return {
          ...council,
          totalPayments: Number(stats?.totalPayments ?? 0),
          totalSpend: Number(stats?.totalSpend ?? 0),
          anomalyCount: Number(anomalyCount?.count ?? 0),
        };
      })
    );

    return withStats;
  }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [council] = await ctx.db
        .select()
        .from(councils)
        .where(eq(councils.slug, input.slug))
        .limit(1);

      if (!council) return null;

      const [stats] = await ctx.db
        .select({
          totalPayments: sql<number>`count(*)`,
          totalSpend: sql<string>`coalesce(sum(${payments.netAmount}::numeric), 0)`,
          avgPayment: sql<string>`coalesce(avg(${payments.netAmount}::numeric), 0)`,
          maxPayment: sql<string>`coalesce(max(${payments.netAmount}::numeric), 0)`,
          earliestDate: sql<string>`min(${payments.paymentDate})`,
          latestDate: sql<string>`max(${payments.paymentDate})`,
        })
        .from(payments)
        .where(eq(payments.councilId, council.id));

      const [anomalyCount] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(anomalies)
        .where(eq(anomalies.councilId, council.id));

      return {
        ...council,
        stats: {
          totalPayments: Number(stats?.totalPayments ?? 0),
          totalSpend: Number(stats?.totalSpend ?? 0),
          avgPayment: Number(stats?.avgPayment ?? 0),
          maxPayment: Number(stats?.maxPayment ?? 0),
          earliestDate: stats?.earliestDate ?? null,
          latestDate: stats?.latestDate ?? null,
          anomalyCount: Number(anomalyCount?.count ?? 0),
        },
      };
    }),
});
