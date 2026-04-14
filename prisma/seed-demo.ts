/**
 * Seeds 25 approved demo users + games for a realistic leaderboard.
 * Run: npx tsx prisma/seed-demo.ts
 * Idempotent: removes previous demo users (and their games) first.
 */
import { PrismaClient, PoolRules } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_COUNT = 25;
const DISPLAY_NAMES = [
  "Alex Vega",
  "Morgan Chen",
  "Jordan Blake",
  "Casey Ruiz",
  "Riley Park",
  "Quinn Foster",
  "Avery Nolan",
  "Skyler Diaz",
  "Emery Shah",
  "Rowan Meyer",
  "Dakota Singh",
  "Phoenix Ortiz",
  "Harper Kim",
  "Reese Patel",
  "Sage Thompson",
  "River Garcia",
  "Charlie Wu",
  "Jamie Liu",
  "Taylor Brooks",
  "Sam Rivera",
  "Cameron Hayes",
  "Drew Coleman",
  "Blake Nguyen",
  "Finley Wright",
  "Hayden Price",
] as const;

/** Target wins/losses per player (sum of wins === sum of losses === #games). */
function buildWinLossSpecs(): { w: number; l: number }[] {
  const specs: { w: number; l: number }[] = [];
  for (let i = 0; i < DEMO_COUNT; i++) {
    const wins = 9 + ((i * 11) % 14);
    const losses = 6 + ((i * 7 + i * i) % 12);
    specs.push({ w: wins, l: losses });
  }
  let sumW = specs.reduce((a, s) => a + s.w, 0);
  let sumL = specs.reduce((a, s) => a + s.l, 0);
  let diff = sumW - sumL;
  if (diff > 0) {
    specs[DEMO_COUNT - 1]!.l += diff;
  } else if (diff < 0) {
    specs[DEMO_COUNT - 1]!.w += -diff;
  }
  return specs;
}

/**
 * Pair each "win slot" with a "loss slot" from another player.
 * sum(wins) === sum(losses) is required.
 */
function buildGamesFromSpecs(specs: { w: number; l: number }[]): { winnerIdx: number; loserIdx: number }[] {
  const winSlots: number[] = [];
  const lossSlots: number[] = [];
  for (let i = 0; i < specs.length; i++) {
    for (let a = 0; a < specs[i]!.w; a++) winSlots.push(i);
    for (let b = 0; b < specs[i]!.l; b++) lossSlots.push(i);
  }
  if (winSlots.length !== lossSlots.length) {
    throw new Error(`Unbalanced specs: ${winSlots.length} wins vs ${lossSlots.length} losses`);
  }

  // Rotate loss indices so high-loss players align with varied winners (reduces self-pairs)
  const half = Math.floor(lossSlots.length / 2);
  const rotated = lossSlots.slice(half).concat(lossSlots.slice(0, half));

  const games: { winnerIdx: number; loserIdx: number }[] = [];
  for (let k = 0; k < winSlots.length; k++) {
    let wi = winSlots[k]!;
    let li = rotated[k]!;
    if (wi === li) {
      let swapAt = -1;
      for (let j = 0; j < rotated.length; j++) {
        if (j === k) continue;
        if (rotated[j] === wi) continue;
        if (rotated[k] === winSlots[j]) continue;
        swapAt = j;
        break;
      }
      if (swapAt < 0) {
        throw new Error("Could not resolve winner===loser in demo schedule");
      }
      const t = rotated[k]!;
      rotated[k] = rotated[swapAt]!;
      rotated[swapAt] = t;
      li = rotated[k]!;
    }
    games.push({ winnerIdx: wi, loserIdx: li });
  }
  return games;
}

async function main() {
  const deleted = await prisma.user.deleteMany({ where: { isDemo: true } });
  console.log(`Removed ${deleted.count} previous demo users (games cascade).`);

  const passwordHash = await bcrypt.hash("demodemo", 10);
  const now = Date.now();
  const specs = buildWinLossSpecs();

  const users = await prisma.$transaction(
    DISPLAY_NAMES.map((displayName, i) =>
      prisma.user.create({
        data: {
          email: `demo.player.${String(i + 1).padStart(2, "0")}@demo.local`,
          passwordHash,
          displayName,
          validated: true,
          isAdmin: false,
          isDemo: true,
          createdAt: new Date(now - (DEMO_COUNT - i) * 86400000 * 5 - (i % 7) * 3600000),
        },
      }),
    ),
  );

  const ids = users.map((u) => u.id);
  const gamePairs = buildGamesFromSpecs(specs);
  const rulesCycle: PoolRules[] = [PoolRules.Bar, PoolRules.APA, PoolRules.BCA];

  await prisma.$transaction(
    gamePairs.map((g, idx) => {
      const winnerId = ids[g.winnerIdx];
      const loserId = ids[g.loserIdx];
      const playedAt = new Date(now - (gamePairs.length - idx) * 3600000 * 4 - idx * 130000);
      return prisma.game.create({
        data: {
          winnerId,
          loserId,
          loggedByUserId: winnerId,
          playedAt,
          location: `Demo Table ${(idx % 12) + 1} · Hall ${(idx % 5) + 1}`,
          rules: rulesCycle[idx % rulesCycle.length]!,
        },
      });
    }),
  );

  console.log(`Created ${users.length} demo users and ${gamePairs.length} games.`);
  console.log('Password for all demo logins: demodemo (optional — demo users are excluded from opponent picker)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
