import { caller } from "@/lib/trpc-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/stat-card";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scraper Status - SocialActions",
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeSince(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

export default async function AdminStatusPage() {
  let latestJobs: Awaited<ReturnType<typeof caller.scrapeJobs.latestPerCouncil>> = [];
  let recentJobs: Awaited<ReturnType<typeof caller.scrapeJobs.list>> = { data: [], total: 0, limit: 20, offset: 0 };

  try {
    [latestJobs, recentJobs] = await Promise.all([
      caller.scrapeJobs.latestPerCouncil(),
      caller.scrapeJobs.list({ limit: 20 }),
    ]);
  } catch {
    // DB not available
  }

  const completedCount = latestJobs.filter((j) => j.status === "completed").length;
  const failedCount = latestJobs.filter((j) => j.status === "failed").length;
  const totalRows = latestJobs.reduce((sum, j) => sum + (j.rowsInserted ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Scraper Status</h1>
        <p className="text-muted-foreground mt-1">
          Monitor scraping jobs and data freshness across all councils.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Councils Tracked" value={String(latestJobs.length)} />
        <StatCard
          title="Last Run Status"
          value={`${completedCount} OK`}
          subtitle={failedCount > 0 ? `${failedCount} failed` : undefined}
        />
        <StatCard
          title="Total Rows (Last Run)"
          value={formatNumber(totalRows)}
        />
        <StatCard
          title="Schedule"
          value="Monthly"
          subtitle="1st of month, 06:00 UTC"
        />
      </div>

      {/* Per-Council Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Council Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {latestJobs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold">Council</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Files</th>
                  <th className="pb-2 font-semibold text-right">Rows</th>
                  <th className="pb-2 font-semibold">Last Run</th>
                  <th className="pb-2 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {latestJobs.map((job) => {
                  const duration =
                    job.startedAt && job.completedAt
                      ? Math.round(
                          (new Date(job.completedAt).getTime() -
                            new Date(job.startedAt).getTime()) /
                            1000
                        )
                      : null;

                  return (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <a
                          href={`/councils/${job.councilSlug}`}
                          className="font-medium hover:underline"
                        >
                          {job.councilName}
                        </a>
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "running"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {job.filesProcessed}/{job.filesDiscovered}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(job.rowsInserted ?? 0)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {timeSince(job.completedAt ?? job.startedAt)}
                      </td>
                      <td className="py-2 text-muted-foreground font-mono">
                        {duration !== null ? `${duration}s` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground">No scrape jobs found. Run the scraper to see status.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Scrape Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Council</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Files</th>
                  <th className="pb-2 font-semibold text-right">Rows +/-</th>
                  <th className="pb-2 font-semibold">Started</th>
                  <th className="pb-2 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.data.map((job) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 font-mono text-muted-foreground">#{job.id}</td>
                    <td className="py-2">{job.councilName}</td>
                    <td className="py-2">{job.jobType}</td>
                    <td className="py-2">
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "running"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {job.filesProcessed}/{job.filesDiscovered}
                    </td>
                    <td className="py-2 text-right font-mono">
                      +{formatNumber(job.rowsInserted ?? 0)} ~{formatNumber(job.rowsSkipped ?? 0)}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {formatDateTime(String(job.startedAt))}
                    </td>
                    <td className="py-2">
                      {job.errors && (job.errors as string[]).length > 0 ? (
                        <span className="text-red-600 text-xs">
                          {(job.errors as string[]).length} error{(job.errors as string[]).length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground">No recent jobs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
