import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";
import { getLeaderboardForPlace } from "@/lib/venue-leaderboard";

type RouteContext = {
  params: Promise<{ placeId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { placeId: raw } = await context.params;
  const placeId = decodeURIComponent(raw);

  const demoMode = (await cookies()).get(DEMO_LEADERBOARD_COOKIE)?.value === "1";
  const rows = await getLeaderboardForPlace(placeId, { demo: demoMode, period: "all" });

  const players = rows.slice(0, 3).map((r) => ({
    rank: r.rank,
    displayName: r.displayName,
    wins: r.wins,
    losses: r.losses,
    gamesPlayed: r.gamesPlayed,
  }));

  const totalGames = rows.reduce((sum, r) => sum + r.gamesPlayed, 0);

  return NextResponse.json({ players, totalGames });
}

