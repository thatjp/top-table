import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { joinSessionAsUser } from "@/lib/game-session-join";
import { rateLimitGameSessionJoinAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { resolveUserByLoginIdentifier } from "@/lib/resolve-login-identifier";

const bodySchema = z.object({
  inviteToken: z.string().min(16),
  login: z.string().min(1).max(200).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
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

  const { inviteToken } = parsed.data;
  const session = await auth();
  if (session?.user?.id) {
    const joined = await joinSessionAsUser(inviteToken, session.user.id);
    if (!joined.ok) {
      return NextResponse.json({ error: joined.error }, { status: joined.status });
    }
    return NextResponse.json({ sessionId: joined.sessionId }, { status: 200 });
  }

  const login = parsed.data.login;
  const pin = parsed.data.pin;
  if (!login || !pin) {
    return NextResponse.json(
      { error: "Email/display name and PIN are required when not signed in." },
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

  if (!resolved.user.pinHash) {
    return NextResponse.json({ error: "No game PIN set." }, { status: 403 });
  }
  const pinOk = await bcrypt.compare(pin, resolved.user.pinHash);
  if (!pinOk) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const joined = await joinSessionAsUser(inviteToken, resolved.user.id);
  if (!joined.ok) {
    return NextResponse.json({ error: joined.error }, { status: joined.status });
  }
  return NextResponse.json({ sessionId: joined.sessionId }, { status: 200 });
}
