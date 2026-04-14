import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  passwordHash: true,
  pinHash: true,
  validated: true,
  isDemo: true,
  isAdmin: true,
} as const;

export type ResolvedUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  pinHash: string | null;
  validated: boolean;
  isDemo: boolean;
  isAdmin: boolean;
};

export type ResolveLoginError = "not_found" | "ambiguous_display_name";

/**
 * If the string contains `@`, match by email (case-insensitive). Otherwise match by display name
 * (case-insensitive). Multiple users with the same display name require signing in with email.
 */
export async function resolveUserByLoginIdentifier(
  raw: string,
): Promise<{ ok: true; user: ResolvedUser } | { ok: false; error: ResolveLoginError }> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "not_found" };
  }

  if (trimmed.includes("@")) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: "insensitive" } },
      select: userSelect,
    });
    if (!user) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true, user };
  }

  const matches = await prisma.user.findMany({
    where: { displayName: { equals: trimmed, mode: "insensitive" } },
    select: userSelect,
    take: 2,
  });
  if (matches.length === 0) {
    return { ok: false, error: "not_found" };
  }
  if (matches.length > 1) {
    return { ok: false, error: "ambiguous_display_name" };
  }
  return { ok: true, user: matches[0]! };
}
