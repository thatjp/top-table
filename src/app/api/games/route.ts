import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markStaleSessionsIncompleteNow } from "@/lib/game-session-lifecycle";
import { originMatchesHost } from "@/lib/same-origin";
import { PoolRules } from "@prisma/client";

const rulesEnum = z.enum(["APA", "BCA", "Bar"]);

const placeIdSchema = z
  .string()
  .min(3)
  .max(512)
  .regex(/^[A-Za-z0-9_\-:]+$/, "Invalid place id");

const createGameSchema = z
  .object({
    sessionId: z.string().min(1),
    opponentId: z.string().min(1),
    winnerId: z.string().min(1),
    loserId: z.string().min(1),
    location: z.string().min(1).max(500),
    rules: rulesEnum,
    placeId: z.union([placeIdSchema, z.null()]).optional(),
    locationLat: z.number().gte(-90).lte(90).optional().nullable(),
    locationLng: z.number().gte(-180).lte(180).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const hasPlace = val.placeId != null && val.placeId.length > 0;
    if (hasPlace && (val.locationLat == null || val.locationLng == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "locationLat and locationLng are required when placeId is set",
        path: ["locationLat"],
      });
    }
    if (!hasPlace && (val.locationLat != null || val.locationLng != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "placeId is required when coordinates are sent",
        path: ["placeId"],
      });
    }
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

  const {
    sessionId,
    opponentId,
    winnerId,
    loserId,
    location,
    rules,
    placeId,
    locationLat,
    locationLng,
  } = parsed.data;

  await markStaleSessionsIncompleteNow();

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      playerOneId: true,
      playerTwoId: true,
      startedAt: true,
      closedAt: true,
    },
  });

  if (!gameSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (gameSession.playerTwoId === null) {
    return NextResponse.json({ error: "This session is not ready to log" }, { status: 400 });
  }

  if (gameSession.startedAt === null) {
    return NextResponse.json({ error: "The match has not started yet" }, { status: 400 });
  }

  if (gameSession.closedAt !== null) {
    return NextResponse.json({ error: "This session is already closed" }, { status: 409 });
  }

  if (gameSession.playerOneId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the host can log the result and close this session" },
      { status: 403 },
    );
  }

  if (gameSession.playerTwoId !== opponentId) {
    return NextResponse.json(
      { error: "Opponent does not match this session" },
      { status: 400 },
    );
  }

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

  try {
    const game = await prisma.$transaction(async (tx) => {
      const g = await tx.game.create({
        data: {
          winnerId,
          loserId,
          playedAt,
          location,
          placeId: placeId ?? null,
          locationLat: locationLat ?? null,
          locationLng: locationLng ?? null,
          rules: rules as PoolRules,
          loggedByUserId: session.user.id,
        },
      });

      const closed = await tx.gameSession.updateMany({
        where: {
          id: gameSession.id,
          closedAt: null,
          playerOneId: session.user.id,
          startedAt: { not: null },
          playerTwoId: opponentId,
        },
        data: {
          closedAt: playedAt,
          closedByUserId: session.user.id,
          inviteToken: null,
        },
      });

      if (closed.count !== 1) {
        throw new Error("SESSION_CLOSE_CONFLICT");
      }

      return g;
    });

    return NextResponse.json(
      { id: game.id, sessionClosed: true },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_CLOSE_CONFLICT") {
      return NextResponse.json(
        { error: "Could not close this session. It may have already been logged." },
        { status: 409 },
      );
    }
    throw e;
  }
}
