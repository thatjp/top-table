import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { VenuesMapSection } from "@/components/VenuesMapSection";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";
import { listVenuesWithStats } from "@/lib/venue-leaderboard";

export const metadata: Metadata = {
  title: "Venues | Top Table",
  description: "Map of pool venues with logged games and per-venue leaderboards",
};

export default async function VenuesPage() {
  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const venues = await listVenuesWithStats({ demo: demoMode });
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() ?? "";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
      <Link
        href="/"
        className="mb-6 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Venues
      </h1>
      <p className="mb-8 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Bars and halls where games have been logged with Google Places. Tap a marker or a row to
        open that venue&apos;s leaderboard.
      </p>

      {demoMode ? (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
          <strong>Demo mode</strong> — only venues from demo-vs-demo games are shown.
        </div>
      ) : null}

      {venues.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No mapped venues yet. Log a game and choose a place from search to add one here.
        </p>
      ) : (
        <>
          {mapKey ? (
            <VenuesMapSection venues={venues} apiKey={mapKey} />
          ) : (
            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Set <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code>{" "}
              to show the map. Venue list below still works.
            </p>
          )}
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {venues.map((v) => (
              <li key={v.placeId}>
                <Link
                  href={`/venues/${encodeURIComponent(v.placeId)}`}
                  className="flex flex-col gap-1 px-4 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-900/50"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{v.label}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {v.gamesPlayed} games · {v.uniquePlayers} players
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
