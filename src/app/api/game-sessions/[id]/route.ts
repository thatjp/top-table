import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitGameSessionAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";

function clientKey(req: Request, userId: string): string {
  return `${clientIpFromRequest(req)}:${userId}`;
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    select: { playerOneId: true, startedAt: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (row.playerOneId !== session.user.id) {
    return NextResponse.json({ error: "Only the host can cancel this lobby" }, { status: 403 });
  }

  if (row.startedAt !== null) {
    return NextResponse.json({ error: "The match has already started" }, { status: 400 });
  }

  await prisma.gameSession.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
