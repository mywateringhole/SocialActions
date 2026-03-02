import { z } from "zod";
import { eq, sql, desc, ilike, and } from "drizzle-orm";
import { payments, councils } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const suppliersRouter = router({
  topByCouncil: publicProcedure
    .input(
      z.object({
        councilId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          supplierName: payments.supplierName,
          supplierNameNormalized: payments.supplierNameNormalized,
          transactionCount: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          avgAmount: sql<string>`avg(${payments.netAmount}::numeric)`,
          firstPayment: sql<string>`min(${payments.paymentDate})`,
          lastPayment: sql<string>`max(${payments.paymentDate})`,
        })
        .from(payments)
        .where(eq(payments.councilId, input.councilId))
        .groupBy(payments.supplierName, payments.supplierNameNormalized)
        .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`))
        .limit(input.limit);
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(2),
        councilId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        ilike(
          payments.supplierNameNormalized,
          `%${input.query.toUpperCase()}%`
        ),
      ];
      if (input.councilId) {
        conditions.push(eq(payments.councilId, input.councilId));
      }

      return ctx.db
        .select({
          supplierNameNormalized: payments.supplierNameNormalized,
          supplierName: sql<string>`max(${payments.supplierName})`,
          councilId: payments.councilId,
          transactionCount: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
        })
        .from(payments)
        .where(and(...conditions))
        .groupBy(payments.supplierNameNormalized, payments.councilId)
        .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`))
        .limit(input.limit);
    }),

  detail: publicProcedure
    .input(
      z.object({
        supplierNameNormalized: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Cross-council summary
      const summary = await ctx.db
        .select({
          councilId: payments.councilId,
          councilName: councils.name,
          councilSlug: councils.slug,
          transactionCount: sql<number>`count(*)`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          firstPayment: sql<string>`min(${payments.paymentDate})`,
          lastPayment: sql<string>`max(${payments.paymentDate})`,
        })
        .from(payments)
        .innerJoin(councils, eq(payments.councilId, councils.id))
        .where(
          eq(
            payments.supplierNameNormalized,
            input.supplierNameNormalized
          )
        )
        .groupBy(payments.councilId, councils.name, councils.slug)
        .orderBy(desc(sql`sum(${payments.netAmount}::numeric)`));

      // Monthly trend
      const trend = await ctx.db
        .select({
          month: sql<string>`date_trunc('month', ${payments.paymentDate}::timestamp)::date`,
          totalAmount: sql<string>`sum(${payments.netAmount}::numeric)`,
          transactionCount: sql<number>`count(*)`,
        })
        .from(payments)
        .where(
          eq(
            payments.supplierNameNormalized,
            input.supplierNameNormalized
          )
        )
        .groupBy(
          sql`date_trunc('month', ${payments.paymentDate}::timestamp)`
        )
        .orderBy(
          sql`date_trunc('month', ${payments.paymentDate}::timestamp)`
        );

      return { summary, trend };
    }),
});
