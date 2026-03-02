import { z } from "zod";
import { eq, and, gte, lte, ilike, sql, desc, asc } from "drizzle-orm";
import { payments } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const paymentsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        councilId: z.number().optional(),
        councilSlug: z.string().optional(),
        directorate: z.string().optional(),
        supplierSearch: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
        sortBy: z
          .enum(["date", "amount", "supplier"])
          .optional()
          .default("date"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.councilId) {
        conditions.push(eq(payments.councilId, input.councilId));
      }
      if (input.directorate) {
        conditions.push(eq(payments.directorate, input.directorate));
      }
      if (input.supplierSearch) {
        conditions.push(
          ilike(payments.supplierNameNormalized, `%${input.supplierSearch.toUpperCase()}%`)
        );
      }
      if (input.dateFrom) {
        conditions.push(gte(payments.paymentDate, input.dateFrom));
      }
      if (input.dateTo) {
        conditions.push(lte(payments.paymentDate, input.dateTo));
      }
      if (input.minAmount !== undefined) {
        conditions.push(
          gte(payments.netAmount, String(input.minAmount))
        );
      }
      if (input.maxAmount !== undefined) {
        conditions.push(
          lte(payments.netAmount, String(input.maxAmount))
        );
      }

      const where =
        conditions.length > 0 ? and(...conditions) : undefined;

      const sortColumn =
        input.sortBy === "amount"
          ? payments.netAmount
          : input.sortBy === "supplier"
            ? payments.supplierName
            : payments.paymentDate;

      const orderFn = input.sortOrder === "asc" ? asc : desc;

      const [data, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(payments)
          .where(where)
          .orderBy(orderFn(sortColumn))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(payments)
          .where(where),
      ]);

      return {
        data,
        total: Number(countResult[0]?.count ?? 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),
});
