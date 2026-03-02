import { caller } from "@/lib/trpc-server";
import { CouncilCard } from "@/components/cards/council-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Councils - SocialActions",
};

export default async function CouncilsPage() {
  let councils: Awaited<ReturnType<typeof caller.councils.list>> = [];

  try {
    councils = await caller.councils.list();
  } catch {
    // DB not available
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Councils</h1>

      {councils.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {councils.map((council) => (
            <CouncilCard
              key={council.id}
              name={council.name}
              slug={council.slug}
              region={council.region}
              totalPayments={council.totalPayments}
              totalSpend={council.totalSpend}
              anomalyCount={council.anomalyCount}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No councils loaded yet. Run the scraper to import data.
        </p>
      )}
    </div>
  );
}
