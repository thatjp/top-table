import { prisma } from "@/lib/prisma";

export type LocalVenueSuggestion = {
  placeId: string;
  description: string;
};

export function normalizeVenueName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const aPairs = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const pair = a.slice(i, i + 2);
    aPairs.set(pair, (aPairs.get(pair) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2);
    const count = aPairs.get(pair) ?? 0;
    if (count > 0) {
      aPairs.set(pair, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (a.length + b.length - 2);
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

function substringRank(name: string, query: string): number {
  const nameLower = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 10_000;
  const idx = nameLower.indexOf(q);
  if (idx === -1) return 10_000;
  return idx;
}

/**
 * Venues whose name (or normalized name) contains the query; ranked by earliest substring match in display name.
 */
export async function searchLocalVenueSuggestions(
  input: string,
  limit: number,
): Promise<LocalVenueSuggestion[]> {
  const q = input.trim();
  if (q.length < 2) return [];
  const normalized = normalizeVenueName(q);
  if (!normalized) return [];

  const fetchCap = Math.max(limit * 4, 40);
  const rows = await prisma.venue.findMany({
    where: {
      placeId: { not: null },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { normalizedName: { contains: normalized } },
      ],
    },
    orderBy: [{ verificationScore: "desc" }, { name: "asc" }],
    take: Math.min(80, fetchCap),
    select: {
      placeId: true,
      name: true,
    },
  });

  const withPlaceId = rows.filter(
    (row): row is (typeof rows)[number] & { placeId: string } => Boolean(row.placeId),
  );

  withPlaceId.sort((a, b) => {
    const ra = substringRank(a.name, q);
    const rb = substringRank(b.name, q);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  return withPlaceId.slice(0, Math.max(1, limit)).map((row) => ({
    placeId: row.placeId,
    description: row.name,
  }));
}
