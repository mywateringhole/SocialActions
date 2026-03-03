import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { payments, councils } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const analyticsRouter = router({
  /** Overall stats across all councils */
  overview: publicProcedure.query(async ({ ctx }) => {
    const [totals] = await ctx.db
      .select({
        totalPayments: sql<number>`count(*)`,
        totalSpend: sql<string>`coalesce(sum(${payments.netAmount}::numeric), 0)`,
        councilCount: sql<number>`count(distinct ${payments.councilId})`,
        supplierCount: sql<number>`count(distinct ${payments.supplierNameNormalized})`,
      })
      .from(payments);

    return {
      totalPayments: Number(totals?.totalPayments ?? 0),
      totalSpend: Number(totals?.totalSpend ?? 0),
      councilCount: Number(totals?.councilCount ?? 0),
      supplierCount: Number(totals?.supplierCount ?? 0),
    };
  }),

  /** Per-council spend comparison for cross-council charts */
  crossCouncilComparison: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        councilId: payments.councilId,
        councilName: councils.name,
        councilSlug: councils.slug,
        totalSpend: sql<string>`sum(${payments.netAmount}::numeric)`,
        transactionCount: sql<number>`count(*)`,
        avgPayment: sql<string>`avg(${payments.netAmount}::numeric)`,
        supplierCount: sql<number>`count(distinct ${payments.supplierNameNormalized})`,
      })
      .from(payments)
      .innerJoin(councils, eq(payments.councilId, councils.id))
      .groupBy(payments.councilId, councils.name, councils.slug)
      .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`));
  }),

  /** Monthly trend across all councils (for overlay chart) */
  crossCouncilTrend: publicProcedure
    .input(
      z.object({
        months: z.number().min(6).max(120).optional().default(24),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 24;
      return ctx.db
        .select({
          month: sql<string>`date_trunc('month', ${payments.paymentDate}::timestamp)::date`,
          councilId: payments.councilId,
          councilName: councils.name,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          transactionCount: sql<number>`count(*)`,
        })
        .from(payments)
        .innerJoin(councils, eq(payments.councilId, councils.id))
        .where(sql`${payments.paymentDate} IS NOT NULL AND ${payments.paymentDate}::timestamp >= now() - interval '${sql.raw(String(months))} months'`)
        .groupBy(
          sql`date_trunc('month', ${payments.paymentDate}::timestamp)`,
          payments.councilId,
          councils.name
        )
        .orderBy(sql`date_trunc('month', ${payments.paymentDate}::timestamp)`);
    }),

  /** Monthly spending trend for a council */
  monthlyTrend: publicProcedure
    .input(
      z.object({
        councilId: z.number(),
        directorate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(payments.councilId, input.councilId)];
      if (input.directorate) {
        conditions.push(eq(payments.directorate, input.directorate));
      }

      return ctx.db
        .select({
          month: sql<string>`date_trunc('month', ${payments.paymentDate}::timestamp)::date`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          transactionCount: sql<number>`count(*)`,
        })
        .from(payments)
        .where(sql`${payments.councilId} = ${input.councilId} AND ${payments.paymentDate} IS NOT NULL${input.directorate ? sql` AND ${payments.directorate} = ${input.directorate}` : sql``}`)
        .groupBy(
          sql`date_trunc('month', ${payments.paymentDate}::timestamp)`
        )
        .orderBy(
          sql`date_trunc('month', ${payments.paymentDate}::timestamp)`
        );
    }),

  /** Department breakdown for a council */
  departmentBreakdown: publicProcedure
    .input(z.object({ councilId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          directorate: payments.directorate,
          transactionCount: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          avgAmount: sql<string>`avg(${payments.netAmount}::numeric)`,
        })
        .from(payments)
        .where(eq(payments.councilId, input.councilId))
        .groupBy(payments.directorate)
        .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`));
    }),

  /** Expense type breakdown for a council */
  expenseBreakdown: publicProcedure
    .input(z.object({ councilId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          expenseType: payments.expenseType,
          transactionCount: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
        })
        .from(payments)
        .where(eq(payments.councilId, input.councilId))
        .groupBy(payments.expenseType)
        .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`))
        .limit(20);
    }),
});
