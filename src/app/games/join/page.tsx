import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { joinSessionAsUser } from "@/lib/game-session-join";
import { JoinGameForm } from "./JoinGameForm";

export const metadata: Metadata = {
  title: "Join game | Top Table",
  description: "Join a match from a QR invite",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JoinGamePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.t;
  const inviteToken =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? "" : "";
  const validToken = inviteToken.length >= 32;

  const session = await auth();
  if (session?.user?.id && validToken) {
    const joined = await joinSessionAsUser(inviteToken, session.user.id);
    if (joined.ok) {
      redirect(`/games/session/${joined.sessionId}`);
    }
    redirect(`/games/start?error=${encodeURIComponent(joined.error)}`);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Join game</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Enter the <strong>email</strong> or <strong>display name</strong> and game PIN for the
        account that is joining (not the host&apos;s).
      </p>
      {!validToken ? (
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          This link is missing a valid invite. Ask your opponent to open their session and share the
          QR code again.
        </div>
      ) : (
        <JoinGameForm inviteToken={inviteToken} />
      )}
    </div>
  );
}
