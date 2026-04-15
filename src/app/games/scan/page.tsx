import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { QrScannerClient } from "./QrScannerClient";

export const metadata: Metadata = {
  title: "Scan QR | Top Table",
  description: "Scan a game QR code with your camera",
};

export default async function ScanQrPage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user?.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Scan QR</h1>
      <p className="mb-8 max-w-lg text-zinc-600 dark:text-zinc-400">
        Open your camera to scan a Top Table game code and jump directly to the linked page.
      </p>
      {!loggedIn ? (
        <div className="mb-6 max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          You can scan links without signing in, but joining or starting a game may still require a
          login.
        </div>
      ) : null}
      <QrScannerClient />
    </div>
  );
}
