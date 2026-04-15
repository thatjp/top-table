import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { StartGameForm } from "./StartGameForm";
import { StartGameQuickStart } from "./StartGameQuickStart";

export const metadata: Metadata = {
  title: "New game | Top Table",
  description: "Start a match and invite your opponent with a QR code",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartGamePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const errorRaw = sp.error;
  const error = typeof errorRaw === "string" ? errorRaw : Array.isArray(errorRaw) ? errorRaw[0] : null;
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
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New game</h1>
      {error ? (
        <p className="mb-4 max-w-lg rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <p className="mb-8 max-w-lg text-zinc-600 dark:text-zinc-400">
        {loggedIn ? (
          <>
            You are already signed in. Start a game and share your QR code so your opponent can
            join the same session.
          </>
        ) : (
          <>
            Sign in with your <strong>email</strong> or <strong>display name</strong> and your
            4-digit game PIN. You will get a QR code your opponent can scan to join the same
            session.
          </>
        )}
      </p>
      {loggedIn ? <StartGameQuickStart /> : <StartGameForm />}
    </div>
  );
}
