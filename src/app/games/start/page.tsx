import type { Metadata } from "next";
import Link from "next/link";
import { StartGameForm } from "./StartGameForm";

export const metadata: Metadata = {
  title: "New game | Top Table",
  description: "Start a match and invite your opponent with a QR code",
};

export default function StartGamePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New game</h1>
      <p className="mb-8 max-w-lg text-zinc-600 dark:text-zinc-400">
        Sign in with your <strong>email</strong> or <strong>display name</strong> and your 4-digit
        game PIN. You will get a QR code your opponent can scan to join the same session.
      </p>
      <StartGameForm />
    </div>
  );
}
