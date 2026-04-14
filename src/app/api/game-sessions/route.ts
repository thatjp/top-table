import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clientIpFromRequest } from "@/lib/client-ip";
import { rateLimitGameSessionAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { verifyHostToken } from "@/lib/qr-token";

const bodySchema = z.object({
  token: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/),
});

function clientKey(req: Request, userId: string): string {
  return `${clientIpFromRequest(req)}:${userId}`;
}

export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const verified = verifyHostToken(parsed.data.token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  const hostId = verified.userId;
  const guestId = session.user.id;

  if (hostId === guestId) {
    return NextResponse.json({ error: "You cannot start a game with yourself" }, { status: 400 });
  }

  const [host, guest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: hostId },
      select: { id: true, displayName: true, validated: true, isDemo: true },
    }),
    prisma.user.findUnique({
      where: { id: guestId },
      select: { id: true, displayName: true, validated: true, isDemo: true, pinHash: true },
    }),
  ]);

  if (!host || !guest) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (!host.validated || !guest.validated) {
    return NextResponse.json(
      { error: "Both players must be approved to start a verified game" },
      { status: 403 },
    );
  }

  if (host.isDemo || guest.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot use QR game start" },
      { status: 403 },
    );
  }

  if (!guest.pinHash) {
    return NextResponse.json(
      { error: "Set a game PIN in Settings before starting a verified game" },
      { status: 403 },
    );
  }

  const pinOk = await bcrypt.compare(parsed.data.pin, guest.pinHash);
  if (!pinOk) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const sessionRow = await prisma.gameSession.create({
    data: {
      playerOneId: hostId,
      playerTwoId: guestId,
    },
    select: {
      id: true,
      startedAt: true,
      playerOne: { select: { displayName: true } },
      playerTwo: { select: { displayName: true } },
    },
  });

  return NextResponse.json({
    id: sessionRow.id,
    startedAt: sessionRow.startedAt.toISOString(),
    playerOneName: sessionRow.playerOne.displayName,
    playerTwoName: sessionRow.playerTwo.displayName,
  });
}
