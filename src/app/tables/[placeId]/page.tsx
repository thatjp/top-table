import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";
import { LeaderboardPeriodNav } from "@/components/LeaderboardPeriodNav";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { parseLeaderboardPeriod } from "@/lib/leaderboard";
import { getLeaderboardForPlace, getVenueMetrics } from "@/lib/venue-leaderboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ placeId?: string | string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstDynamicParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const raw = firstDynamicParam(resolved.placeId);
  if (!raw) return { title: "Table | Top Table" };
  const placeId = decodeURIComponent(raw);
  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const metrics = await getVenueMetrics(placeId, { demo: demoMode });
  return {
    title: metrics ? `${metrics.label} | Tables` : "Table | Top Table",
  };
}

function minGamesLabel(): number {
  const n = Number(process.env.MIN_GAMES_FOR_LEADERBOARD ?? 5);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

export default async function TableDetailPage({ params, searchParams }: PageProps) {
  const resolved = await params;
  const raw = firstDynamicParam(resolved.placeId);
  if (!raw) notFound();
  const placeId = decodeURIComponent(raw);
  const sp = await searchParams;
  const period = parseLeaderboardPeriod(sp.period);

  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const metrics = await getVenueMetrics(placeId, { demo: demoMode });
  if (!metrics) {
    notFound();
  }

  const rows = await getLeaderboardForPlace(placeId, { demo: demoMode, period });
  const minGames = minGamesLabel();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-6">
      <Link
        href={`/tables?v=${encodeURIComponent(placeId)}`}
        className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        aria-label="Close"
      >
        ×
      </Link>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {metrics.label}
        </h1>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Leaderboard for games logged at this table (min. {minGames} games to rank).
        </p>
        {metrics.lastPlayedAtIso ? (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Last game:{" "}
            {new Date(metrics.lastPlayedAtIso).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {metrics.gamesPlayed} games · {metrics.uniquePlayers} distinct players
          </p>
        ) : (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {metrics.gamesPlayed} games · {metrics.uniquePlayers} distinct players
          </p>
        )}

        {demoMode ? (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
            <strong>Demo mode</strong> — stats use demo-vs-demo games only.
          </div>
        ) : null}

        <LeaderboardPeriodNav
          current={period}
          venueBasePath={`/tables/${encodeURIComponent(placeId)}`}
        />

        <div className="mt-4 flex-1 overflow-auto pb-20">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              No players meet the minimum game count at this table for this time range.
            </p>
          ) : (
            <LeaderboardTable rows={rows} />
          )}
        </div>

      <Link
        href={`/tables?v=${encodeURIComponent(placeId)}`}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 w-full max-w-4xl px-4"
      >
        <div className="w-full rounded-full bg-zinc-900 py-2 text-center text-sm font-medium text-zinc-50 shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          Close
        </div>
      </Link>
    </div>
  );
}
