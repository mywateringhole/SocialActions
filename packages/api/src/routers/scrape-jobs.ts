import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { scrapeJobs, councils } from "@socialactions/db/schema";
import { router, publicProcedure } from "../trpc";

export const scrapeJobsRouter = router({
  /** List recent scrape jobs with council info */
  list: publicProcedure
    .input(
      z.object({
        councilId: z.number().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = input.councilId
        ? eq(scrapeJobs.councilId, input.councilId)
        : undefined;

      const [data, countResult] = await Promise.all([
        ctx.db
          .select({
            id: scrapeJobs.id,
            councilId: scrapeJobs.councilId,
            councilName: councils.name,
            councilSlug: councils.slug,
            status: scrapeJobs.status,
            jobType: scrapeJobs.jobType,
            filesDiscovered: scrapeJobs.filesDiscovered,
            filesProcessed: scrapeJobs.filesProcessed,
            rowsInserted: scrapeJobs.rowsInserted,
            rowsSkipped: scrapeJobs.rowsSkipped,
            errors: scrapeJobs.errors,
            startedAt: scrapeJobs.startedAt,
            completedAt: scrapeJobs.completedAt,
          })
          .from(scrapeJobs)
          .innerJoin(councils, eq(scrapeJobs.councilId, councils.id))
          .where(where)
          .orderBy(desc(scrapeJobs.startedAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(scrapeJobs)
          .where(where),
      ]);

      return {
        data,
        total: Number(countResult[0]?.count ?? 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /** Get the latest scrape job per council for status overview */
  latestPerCouncil: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute<{
      id: number;
      councilId: number;
      councilName: string;
      councilSlug: string;
      status: string;
      jobType: string;
      filesDiscovered: number;
      filesProcessed: number;
      rowsInserted: number;
      rowsSkipped: number;
      startedAt: string;
      completedAt: string | null;
      errors: string[] | null;
    }>(sql`
      SELECT DISTINCT ON (sj.council_id)
        sj.id,
        sj.council_id as "councilId",
        c.name as "councilName",
        c.slug as "councilSlug",
        sj.status,
        sj.job_type as "jobType",
        sj.files_discovered as "filesDiscovered",
        sj.files_processed as "filesProcessed",
        sj.rows_inserted as "rowsInserted",
        sj.rows_skipped as "rowsSkipped",
        sj.started_at as "startedAt",
        sj.completed_at as "completedAt",
        sj.errors
      FROM scrape_jobs sj
      INNER JOIN councils c ON sj.council_id = c.id
      ORDER BY sj.council_id, sj.started_at DESC
    `);

    return [...result];
  }),
});
