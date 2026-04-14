import { prisma } from "@/lib/prisma";
import { periodBoundsUtc } from "@/lib/leaderboard-period";

export type LeaderboardRow = {
  rank: number;
  id: string;
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winPct: number;
};

export type LeaderboardPeriod = "all" | "year" | "month" | "week";

export function parseLeaderboardPeriod(
  raw: string | string[] | undefined,
): LeaderboardPeriod {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "week" || v === "month" || v === "year") return v;
  return "all";
}

function minGamesThreshold(): number {
  const n = Number(process.env.MIN_GAMES_FOR_LEADERBOARD ?? 5);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

export type GetLeaderboardOptions = {
  /** When true, only demo users and games between demo users. */
  demo: boolean;
  /** Calendar week (Sun start), month (1st), year (Jan 1), or all time — see LEADERBOARD_TIMEZONE. */
  period: LeaderboardPeriod;
};

export async function getLeaderboard(options: GetLeaderboardOptions): Promise<LeaderboardRow[]> {
  const minGames = minGamesThreshold();
  const { demo, period } = options;

  const userWhere = demo
    ? { validated: true as const, isDemo: true }
    : { validated: true as const, isDemo: false };

  const playedAtFilter =
    period === "all"
      ? {}
      : (() => {
          const { gte, lte } = periodBoundsUtc(period);
          return { playedAt: { gte, lte } };
        })();

  const games = await prisma.game.findMany({
    where: {
      winner: userWhere,
      loser: userWhere,
      ...playedAtFilter,
    },
    select: { winnerId: true, loserId: true },
  });

  const validatedUsers = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, displayName: true },
  });

  const stats = new Map<string, { wins: number; losses: number }>();
  for (const u of validatedUsers) {
    stats.set(u.id, { wins: 0, losses: 0 });
  }

  for (const g of games) {
    const w = stats.get(g.winnerId);
    const l = stats.get(g.loserId);
    if (w) w.wins += 1;
    if (l) l.losses += 1;
  }

  const rows = validatedUsers
    .map((u) => {
      const s = stats.get(u.id)!;
      const gamesPlayed = s.wins + s.losses;
      const winPct = gamesPlayed > 0 ? s.wins / gamesPlayed : 0;
      return {
        id: u.id,
        displayName: u.displayName,
        wins: s.wins,
        losses: s.losses,
        gamesPlayed,
        winPct,
      };
    })
    .filter((r) => r.gamesPlayed >= minGames)
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    })
    .map((r, i) => ({ rank: i + 1, ...r }));

  return rows;
}
