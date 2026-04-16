import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GameLogForm } from "@/components/GameLogForm";
import { markStaleSessionsIncompleteNow } from "@/lib/game-session-lifecycle";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Log game | Top Table",
  description: "Record a pool match",
};

function formatGameLength(start: Date, end: Date): string {
  const totalSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function NewGamePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/games/new");
  }

  const rawSession = searchParams.session;
  const sessionId = (
    typeof rawSession === "string"
      ? rawSession
      : Array.isArray(rawSession)
        ? rawSession[0] ?? ""
        : ""
  ).trim();
  if (!sessionId) {
    redirect("/");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { validated: true, displayName: true },
  });

  await markStaleSessionsIncompleteNow();

  const row = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      playerOne: { select: { id: true, displayName: true, validated: true, isDemo: true } },
      playerTwo: { select: { id: true, displayName: true, validated: true, isDemo: true } },
    },
  });
  if (!row || (row.playerOneId !== session.user.id && row.playerTwoId !== session.user.id)) {
    redirect("/");
  }

  if (!row.playerTwoId || !row.playerTwo) {
    redirect(`/games/session/${sessionId}`);
  }

  if (!row.startedAt) {
    redirect(`/games/session/${sessionId}`);
  }

  if (row.closedAt) {
    redirect("/");
  }

  const isHost = row.playerOneId === session.user.id;
  const now = new Date();
  const dateTimeLabel = now.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const opponent =
    row.playerOneId === session.user.id
      ? { id: row.playerTwo.id, displayName: row.playerTwo.displayName }
      : { id: row.playerOne.id, displayName: row.playerOne.displayName };
  const gameLengthLabel = formatGameLength(row.startedAt, now);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <div className="max-w-lg">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Log a game</h1>
        <div className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          <p>{dateTimeLabel}</p>
          {gameLengthLabel ? (
            <p className="mt-1">
              Game length:{" "}
              <span className="text-zinc-800 dark:text-zinc-200">{gameLengthLabel}</span>
            </p>
          ) : null}
        </div>

        {!me?.validated ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Your account is not validated yet. You cannot log games until an admin approves your
            profile.
          </div>
        ) : !opponent || !row.playerOne.validated || !row.playerTwo.validated || row.playerOne.isDemo || row.playerTwo.isDemo ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            This session is not eligible for logging a completed game.
          </div>
        ) : !isHost ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
            Only the host can log the result and close this session. You can leave this page; your
            session will update when the host saves the game.
          </div>
        ) : (
          <GameLogForm
            sessionId={sessionId}
            currentUserId={session.user.id}
            currentUserName={me.displayName}
            opponent={opponent}
          />
        )}
      </div>
    </div>
  );
}
