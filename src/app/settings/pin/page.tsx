import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { SettingsPinForm } from "@/components/SettingsPinForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Game PIN | Top Table",
};

export default async function SettingsPinPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings/pin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pinHash: true },
  });

  const hasExistingPin = !!user?.pinHash;

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Game PIN</h1>
      <p className="mb-8 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
        Use this 4-digit PIN when you scan someone else&apos;s QR code to start a verified game. It
        is separate from your login password.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <SettingsPinForm hasExistingPin={hasExistingPin} />
      </Suspense>
    </div>
  );
}
