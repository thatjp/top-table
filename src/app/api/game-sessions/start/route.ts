import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitGameSessionStartAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { resolveUserByLoginIdentifier } from "@/lib/resolve-login-identifier";
import {
  closeStaleOpenLobbiesNow,
  findLiveActiveSessionForUser,
  findOpenHostLobby,
  markStaleSessionsIncompleteNow,
} from "@/lib/game-session-lifecycle";

const bodySchema = z.object({
  login: z.string().min(1).max(200),
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!rateLimitGameSessionStartAllow(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!originMatchesHost(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await auth();
  let user:
    | {
        id: string;
        validated: boolean;
        isDemo: boolean;
        pinHash: string | null;
      }
    | null = null;

  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, validated: true, isDemo: true, pinHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  } else {
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
    const pin = parsed.data.pin;
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
        { error: "Unknown account, or no game PIN set. Use Settings after you sign in." },
        { status: 403 },
      );
    }

    user = resolved.user;
    if (!user.pinHash) {
      return NextResponse.json(
        { error: "No game PIN set. Use Settings after you sign in." },
        { status: 403 },
      );
    }

    const pinOk = await bcrypt.compare(pin, user.pinHash);
    if (!pinOk) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
    }
  }

  if (!user.validated || user.isDemo) {
    return NextResponse.json(
      { error: "Only approved, non-demo accounts can start a game this way." },
      { status: 403 },
    );
  }

  await markStaleSessionsIncompleteNow();
  await closeStaleOpenLobbiesNow(user.id);
  if (await findLiveActiveSessionForUser(user.id)) {
    return NextResponse.json(
      {
        error:
          "You already have a match in progress. Open it from the home page or wait for it to time out before starting another.",
      },
      { status: 409 },
    );
  }
  const openLobby = await findOpenHostLobby(user.id);
  if (openLobby) {
    return NextResponse.json({ sessionId: openLobby.id, resumed: true }, { status: 200 });
  }

  let inviteToken = randomBytes(32).toString("hex");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const sessionRow = await prisma.gameSession.create({
        data: {
          playerOneId: user.id,
          playerTwoId: null,
          inviteToken,
          startedAt: null,
        },
        select: { id: true },
      });
      return NextResponse.json({ sessionId: sessionRow.id }, { status: 201 });
    } catch {
      inviteToken = randomBytes(32).toString("hex");
    }
  }

  return NextResponse.json({ error: "Could not create session. Try again." }, { status: 500 });
}
