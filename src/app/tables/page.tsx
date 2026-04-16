import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TablesDirectory } from "@/components/TablesDirectory";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";
import { listVenuesWithStats } from "@/lib/venue-leaderboard";

export const metadata: Metadata = {
  title: "Tables | Top Table",
  description: "Map of NYC pool tables and bars with logged games and per-table leaderboards",
};

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function TablesPage({ searchParams }: PageProps) {
  const initialSelectedPlaceIdParam = searchParams.v;
  const initialSelectedPlaceId = Array.isArray(initialSelectedPlaceIdParam)
    ? initialSelectedPlaceIdParam[0]
    : initialSelectedPlaceIdParam ?? null;
  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const venues = await listVenuesWithStats({ demo: demoMode });
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() ?? "";

  return (
    <div className="flex w-full flex-1 flex-col">
      {venues.length === 0 ? (
        <p className="mx-auto my-10 max-w-4xl rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No mapped tables yet. Log a game and choose a place from search to add one here.
        </p>
      ) : (
        <TablesDirectory
          venues={venues}
          mapKey={mapKey}
          initialSelectedPlaceId={initialSelectedPlaceId}
        />
      )}
    </div>
  );
}
