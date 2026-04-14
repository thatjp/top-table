import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitPinChangeAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";

const pinBody = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    pinConfirm: z.string().regex(/^\d{4}$/),
    currentPin: z.string().regex(/^\d{4}$/).optional(),
  })
  .refine((d) => d.pin === d.pinConfirm, {
    message: "PINs do not match",
    path: ["pinConfirm"],
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!originMatchesHost(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimitPinChangeAllow(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pinBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, pinHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.pinHash) {
    const current = parsed.data.currentPin;
    if (!current) {
      return NextResponse.json({ error: "Current PIN required" }, { status: 400 });
    }
    const ok = await bcrypt.compare(current, user.pinHash);
    if (!ok) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 403 });
    }
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });

  return NextResponse.json({ ok: true });
}
