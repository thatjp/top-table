import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { originMatchesHost } from "@/lib/same-origin";
import { PoolRules } from "@prisma/client";

const rulesEnum = z.enum(["APA", "BCA", "Bar"]);

const createGameSchema = z.object({
  opponentId: z.string().min(1),
  winnerId: z.string().min(1),
  loserId: z.string().min(1),
  location: z.string().min(1).max(500),
  rules: rulesEnum,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!originMatchesHost(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const logger = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { validated: true },
  });
  if (!logger?.validated) {
    return NextResponse.json(
      { error: "Your account must be approved before you can log games" },
      { status: 403 },
    );
  }

  const { opponentId, winnerId, loserId, location, rules } = parsed.data;

  const players = new Set([session.user.id, opponentId]);
  if (players.size !== 2) {
    return NextResponse.json(
      { error: "Opponent must be a different player" },
      { status: 400 },
    );
  }

  if (winnerId === loserId) {
    return NextResponse.json({ error: "Winner and loser must differ" }, { status: 400 });
  }

  const winnerOk = winnerId === session.user.id || winnerId === opponentId;
  const loserOk = loserId === session.user.id || loserId === opponentId;
  if (!winnerOk || !loserOk) {
    return NextResponse.json(
      { error: "Winner and loser must be the two players in the game" },
      { status: 400 },
    );
  }

  const userIds = [session.user.id, opponentId, winnerId, loserId];
  const uniqueUsers = await prisma.user.findMany({
    where: { id: { in: [...new Set(userIds)] } },
    select: { id: true, validated: true },
  });

  if (uniqueUsers.length !== 2) {
    return NextResponse.json({ error: "Unknown player" }, { status: 400 });
  }

  if (!uniqueUsers.every((u) => u.validated)) {
    return NextResponse.json(
      { error: "Both players must be admin-validated to log a game" },
      { status: 403 },
    );
  }

  const playedAt = new Date();

  const game = await prisma.game.create({
    data: {
      winnerId,
      loserId,
      playedAt,
      location,
      rules: rules as PoolRules,
      loggedByUserId: session.user.id,
    },
  });

  return NextResponse.json({ id: game.id }, { status: 201 });
}
