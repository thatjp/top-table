import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { originMatchesHost } from "@/lib/same-origin";

const bodySchema = z.object({
  displayName: z.string().min(1).max(120),
  email: z.string().email(),
});

export async function PATCH(req: Request) {
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { displayName, email } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { displayName, email },
    select: { id: true, displayName: true, email: true },
  });

  return NextResponse.json(updated);
}
