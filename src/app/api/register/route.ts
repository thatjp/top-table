import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitRegisterAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    displayName: z.string().min(1).max(120),
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    pinConfirm: z.string().regex(/^\d{4}$/),
  })
  .refine((d) => d.pin === d.pinConfirm, {
    message: "PINs do not match",
    path: ["pinConfirm"],
  });

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!rateLimitRegisterAllow(ip)) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, displayName, pin } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Unable to register with the details provided." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      pinHash,
      displayName,
      validated: false,
      isAdmin: false,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
