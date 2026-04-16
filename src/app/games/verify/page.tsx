import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyHostToken } from "@/lib/qr-token";
import { VerifyGameForm } from "./VerifyGameForm";

export const metadata: Metadata = {
  title: "Verify game | Top Table",
  description: "Confirm a match with a QR code",
};

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function VerifyGamePage({ searchParams }: PageProps) {
  const raw = searchParams.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? "" : "";

  let hostDisplayName: string | null = null;
  let invalid = true;

  if (token) {
    const v = verifyHostToken(token);
    if (v) {
      const host = await prisma.user.findUnique({
        where: { id: v.userId },
        select: { displayName: true, validated: true, isDemo: true },
      });
      if (host?.validated && !host.isDemo) {
        invalid = false;
        hostDisplayName = host.displayName;
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Start a game</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">QR verification</p>
      <VerifyGameForm token={token} hostDisplayName={hostDisplayName} invalid={invalid} />
    </div>
  );
}
