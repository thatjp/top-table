import { prisma } from "@/lib/prisma";

/**
 * Items that need admin attention (same criteria as /admin pending list).
 */
export async function countAdminActionableRequests(): Promise<number> {
  return prisma.user.count({ where: { validated: false } });
}
