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
