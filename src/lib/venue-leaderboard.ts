import { prisma } from "@/lib/prisma";
import { periodBoundsUtc } from "@/lib/leaderboard-period";
import type { GetLeaderboardOptions, LeaderboardRow } from "@/lib/leaderboard";

function minGamesThreshold(): number {
  const n = Number(process.env.MIN_GAMES_FOR_LEADERBOARD ?? 5);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

export type VenueMapRow = {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
  gamesPlayed: number;
  uniquePlayers: number;
  lastPlayedAtIso: string;
};

/**
 * Venues that appear in logged games with coordinates (for map markers only).
 */
export async function listVenuesWithStats(options: {
  demo: boolean;
}): Promise<VenueMapRow[]> {
  const userWhere = options.demo
    ? { validated: true as const, isDemo: true }
    : { validated: true as const, isDemo: false };

  const games = await prisma.game.findMany({
    where: {
      placeId: { not: null },
      locationLat: { not: null },
      locationLng: { not: null },
      winner: userWhere,
      loser: userWhere,
    },
    select: {
      placeId: true,
      location: true,
      locationLat: true,
      locationLng: true,
      playedAt: true,
      winnerId: true,
      loserId: true,
    },
    orderBy: { playedAt: "desc" },
  });

  const byPlace = new Map<
    string,
    {
      placeId: string;
      label: string;
      lat: number;
      lng: number;
      games: number;
      playerIds: Set<string>;
      lastPlayedAt: Date;
    }
  >();

  for (const g of games) {
    if (!g.placeId || g.locationLat == null || g.locationLng == null) continue;
    let v = byPlace.get(g.placeId);
    if (!v) {
      v = {
        placeId: g.placeId,
        label: g.location,
        lat: g.locationLat,
        lng: g.locationLng,
        games: 0,
        playerIds: new Set(),
        lastPlayedAt: g.playedAt,
      };
      byPlace.set(g.placeId, v);
    }
    v.games += 1;
    v.playerIds.add(g.winnerId);
    v.playerIds.add(g.loserId);
    if (g.playedAt > v.lastPlayedAt) {
      v.lastPlayedAt = g.playedAt;
    }
  }

  const rows: VenueMapRow[] = [...byPlace.values()].map((v) => ({
    placeId: v.placeId,
    label: v.label,
    latitude: v.lat,
    longitude: v.lng,
    gamesPlayed: v.games,
    uniquePlayers: v.playerIds.size,
    lastPlayedAtIso: v.lastPlayedAt.toISOString(),
  }));

  if (!options.demo) {
    const seededVenues = await prisma.venue.findMany({
      where: { placeId: { not: null } },
      orderBy: { name: "asc" },
      select: {
        placeId: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });

    for (const venue of seededVenues) {
      if (!venue.placeId || byPlace.has(venue.placeId)) continue;
      rows.push({
        placeId: venue.placeId,
        label: venue.name,
        latitude: venue.latitude,
        longitude: venue.longitude,
        gamesPlayed: 0,
        uniquePlayers: 0,
        lastPlayedAtIso: new Date(0).toISOString(),
      });
    }
  }

  return rows;
}

export async function getLeaderboardForPlace(
  placeId: string,
  options: Pick<GetLeaderboardOptions, "demo" | "period">,
): Promise<LeaderboardRow[]> {
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
      placeId,
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

export async function getVenueMetrics(
  placeId: string,
  options: { demo: boolean },
): Promise<{
  label: string;
  gamesPlayed: number;
  uniquePlayers: number;
  lastPlayedAtIso: string | null;
} | null> {
  const userWhere = options.demo
    ? { validated: true as const, isDemo: true }
    : { validated: true as const, isDemo: false };

  const games = await prisma.game.findMany({
    where: {
      placeId,
      winner: userWhere,
      loser: userWhere,
    },
    select: {
      location: true,
      playedAt: true,
      winnerId: true,
      loserId: true,
    },
    orderBy: { playedAt: "desc" },
  });

  if (games.length === 0) {
    const seeded = await prisma.venue.findFirst({
      where: { placeId },
      select: { name: true },
    });
    if (!seeded) return null;
    return {
      label: seeded.name,
      gamesPlayed: 0,
      uniquePlayers: 0,
      lastPlayedAtIso: null,
    };
  }

  const players = new Set<string>();
  let last: Date | null = null;
  for (const g of games) {
    players.add(g.winnerId);
    players.add(g.loserId);
    if (!last || g.playedAt > last) last = g.playedAt;
  }

  return {
    label: games[0]!.location,
    gamesPlayed: games.length,
    uniquePlayers: players.size,
    lastPlayedAtIso: last ? last.toISOString() : null,
  };
}
