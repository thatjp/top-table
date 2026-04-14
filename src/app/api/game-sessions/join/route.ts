import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitGameSessionJoinAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { resolveUserByLoginIdentifier } from "@/lib/resolve-login-identifier";
import {
  findGuestOtherOpenLobby,
  findLiveActiveSessionForUser,
  markStaleSessionsIncompleteNow,
} from "@/lib/game-session-lifecycle";

const bodySchema = z.object({
  inviteToken: z.string().min(16),
  login: z.string().min(1).max(200),
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!rateLimitGameSessionJoinAllow(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const login = parsed.data.login;
  const { inviteToken, pin } = parsed.data;

  const row = await prisma.gameSession.findUnique({
    where: { inviteToken },
    select: {
      id: true,
      playerOneId: true,
      playerTwoId: true,
    },
  });

  if (!row || row.playerTwoId !== null) {
    return NextResponse.json(
      { error: "This invite is invalid or the game already has two players." },
      { status: 400 },
    );
  }

  const resolved = await resolveUserByLoginIdentifier(login);
  if (!resolved.ok) {
    if (resolved.error === "ambiguous_display_name") {
      return NextResponse.json(
        {
          error:
            "Several players use that display name. Use the email address on your account instead.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unknown account, or no game PIN set." },
      { status: 403 },
    );
  }

  const guest = resolved.user;

  if (!guest.pinHash) {
    return NextResponse.json({ error: "No game PIN set." }, { status: 403 });
  }

  if (!guest.validated || guest.isDemo) {
    return NextResponse.json(
      { error: "Only approved, non-demo accounts can join this way." },
      { status: 403 },
    );
  }

  if (guest.id === row.playerOneId) {
    return NextResponse.json({ error: "You cannot join your own game." }, { status: 400 });
  }

  const pinOk = await bcrypt.compare(pin, guest.pinHash);
  if (!pinOk) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  await markStaleSessionsIncompleteNow();
  if (await findLiveActiveSessionForUser(guest.id)) {
    return NextResponse.json(
      {
        error:
          "You already have a match in progress. Open it from the home page or wait for it to time out before joining another game.",
      },
      { status: 409 },
    );
  }
  if (await findGuestOtherOpenLobby(guest.id, row.id)) {
    return NextResponse.json(
      {
        error:
          "You are already in another game lobby. Open that session or leave it before joining this one.",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.gameSession.updateMany({
    where: { id: row.id, playerTwoId: null, inviteToken },
    data: { playerTwoId: guest.id, inviteToken: null },
  });

  if (updated.count !== 1) {
    return NextResponse.json(
      { error: "This game was just joined by someone else. Ask for a new invite." },
      { status: 409 },
    );
  }

  return NextResponse.json({ sessionId: row.id }, { status: 200 });
}
