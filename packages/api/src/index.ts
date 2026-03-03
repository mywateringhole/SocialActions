import { router } from "./trpc";
import { councilsRouter } from "./routers/councils";
import { paymentsRouter } from "./routers/payments";
import { suppliersRouter } from "./routers/suppliers";
import { analyticsRouter } from "./routers/analytics";
import { anomaliesRouter } from "./routers/anomalies";
import { scrapeJobsRouter } from "./routers/scrape-jobs";

export const appRouter = router({
  councils: councilsRouter,
  payments: paymentsRouter,
  suppliers: suppliersRouter,
  analytics: analyticsRouter,
  anomalies: anomaliesRouter,
  scrapeJobs: scrapeJobsRouter,
});

export type AppRouter = typeof appRouter;

export { type Context } from "./trpc";
