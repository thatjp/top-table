import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ActiveGameCard } from "@/components/ActiveGameCard";
import { IncompleteSessionsWarning } from "@/components/IncompleteSessionsWarning";
import { LeaderboardPeriodNav } from "@/components/LeaderboardPeriodNav";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { auth } from "@/auth";
import {
  findIncompleteHostedSessions,
  findLiveActiveSessionForUser,
  markStaleSessionsIncompleteNow,
} from "@/lib/game-session-lifecycle";
import { getLeaderboard, parseLeaderboardPeriod } from "@/lib/leaderboard";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top Table | Local pool leaderboard",
  description: "Public leaderboard of validated pool players by win percentage",
};

function minGamesLabel(): number {
  const n = Number(process.env.MIN_GAMES_FOR_LEADERBOARD ?? 5);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = parseLeaderboardPeriod(sp.period);

  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const rows = await getLeaderboard({ demo: demoMode, period });
  const minGames = minGamesLabel();

  const authSession = await auth();
  let liveActive = null as Awaited<ReturnType<typeof findLiveActiveSessionForUser>>;
  let incompleteHosted: Awaited<ReturnType<typeof findIncompleteHostedSessions>> = [];
  if (authSession?.user?.id) {
    await markStaleSessionsIncompleteNow();
    liveActive = await findLiveActiveSessionForUser(authSession.user.id);
    incompleteHosted = await findIncompleteHostedSessions(authSession.user.id);
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4 py-6 md:py-10">
      {incompleteHosted.length > 0 ? (
        <IncompleteSessionsWarning sessions={incompleteHosted} />
      ) : null}
      {liveActive ? (
        <ActiveGameCard
          sessionId={liveActive.id}
          playerOneName={liveActive.playerOne.displayName}
          playerTwoName={liveActive.playerTwo!.displayName}
          startedAtIso={liveActive.startedAt.toISOString()}
        />
      ) : null}
      {demoMode ? (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
          <strong>Demo leaderboard</strong> — showing seeded demo players only
        </div>
      ) : null}

      <div className="mb-8 hidden md:block">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Top Table
        </h1>
      </div>

      <LeaderboardPeriodNav current={period} />

      <div className="mt-4 min-h-0 flex-1 overflow-auto md:mt-6 md:flex-none md:overflow-visible">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            {demoMode ? (
              <>
                No demo players meet the minimum with games in this period. Seed with{" "}
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">npm run db:seed-demo</code> or try{" "}
                <strong>All time</strong>.
              </>
            ) : period === "all" ? (
              <>
                No players qualify yet. Once validated players log enough games, they will show up here.
              </>
            ) : (
              <>
                No players have at least <strong>{minGames}</strong> games in this window. Try{" "}
                <strong>All time</strong>, <strong>Year</strong>, or <strong>Month</strong>.
              </>
            )}
          </p>
        ) : (
          <LeaderboardTable rows={rows} />
        )}
      </div>
    </div>
  );
}
