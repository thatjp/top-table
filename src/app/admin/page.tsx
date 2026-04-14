import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PendingUsersList } from "./PendingUsersList";

export const metadata: Metadata = {
  title: "Admin | Top Table",
  description: "Validate new player accounts",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/");
  }

  const pending = await prisma.user.findMany({
    where: { validated: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Pending accounts
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Approve players so they can log games and appear on the leaderboard once they have enough
        matches.
      </p>
      <PendingUsersList users={pending} />
    </div>
  );
}
