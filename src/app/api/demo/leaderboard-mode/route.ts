import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEMO_LEADERBOARD_COOKIE } from "@/lib/demo";
import { originMatchesHost } from "@/lib/same-origin";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function demoLeaderboardEnabledFromRequest(req: Request): boolean {
  const raw = req.headers.get("cookie") ?? "";
  return raw.split(";").some((part) => part.trim().startsWith(`${DEMO_LEADERBOARD_COOKIE}=1`));
}

/** Admin-only: read whether demo leaderboard cookie is set (for UI toggle). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ enabled: demoLeaderboardEnabledFromRequest(req) });
}

/** Admin-only: enable or disable demo leaderboard on `/`. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const enabled = (body as { enabled?: boolean }).enabled === true;
  const res = NextResponse.json({ ok: true, enabled });

  if (enabled) {
    res.cookies.set(DEMO_LEADERBOARD_COOKIE, "1", {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    });
  } else {
    res.cookies.delete(DEMO_LEADERBOARD_COOKIE);
  }

  return res;
}
