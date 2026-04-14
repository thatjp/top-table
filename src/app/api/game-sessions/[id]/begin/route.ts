import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitGameSessionAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { findLiveActiveSessionForUser, markStaleSessionsIncompleteNow } from "@/lib/game-session-lifecycle";

function clientKey(req: Request, userId: string): string {
  return `${clientIpFromRequest(req)}:${userId}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!originMatchesHost(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (!rateLimitGameSessionAllow(clientKey(req, session.user.id))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const row = await prisma.gameSession.findUnique({
    where: { id },
    select: {
      playerOneId: true,
      playerTwoId: true,
      startedAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (row.playerOneId !== session.user.id) {
    return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
  }

  if (row.playerTwoId === null) {
    return NextResponse.json({ error: "Waiting for your opponent to join" }, { status: 400 });
  }

  if (row.startedAt !== null) {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  await markStaleSessionsIncompleteNow();
  const guestId = row.playerTwoId!;
  const hostLive = await findLiveActiveSessionForUser(row.playerOneId);
  if (hostLive && hostLive.id !== id) {
    return NextResponse.json(
      {
        error:
          "The host already has another match in progress. That session must finish or time out first.",
      },
      { status: 409 },
    );
  }
  const guestLive = await findLiveActiveSessionForUser(guestId);
  if (guestLive && guestLive.id !== id) {
    return NextResponse.json(
      {
        error:
          "Your opponent already has a match in progress. They must finish or leave it before this game can start.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const updated = await prisma.gameSession.updateMany({
    where: { id, startedAt: null, playerTwoId: { not: null } },
    data: { startedAt: now },
  });

  if (updated.count !== 1) {
    return NextResponse.json({ error: "Could not start the game. Try again." }, { status: 409 });
  }

  return NextResponse.json({ startedAt: now.toISOString() }, { status: 200 });
}
