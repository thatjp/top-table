import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GameLogForm } from "@/components/GameLogForm";

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

type SearchParams = { session?: string; opponent?: string };

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/games/new");
  }

  const sp = await searchParams;
  const sessionId = sp.session?.trim();
  const opponentFromQuery = sp.opponent?.trim();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { validated: true, displayName: true },
  });

  const opponents = await prisma.user.findMany({
    where: {
      validated: true,
      isDemo: false,
      id: { not: session.user.id },
    },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const now = new Date();
  const dateTimeLabel = now.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let opponent: { id: string; displayName: string } | null = null;
  let gameLengthLabel: string | null = null;
  let sessionResolved = false;

  if (sessionId) {
    const row = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        playerOne: { select: { id: true, displayName: true } },
        playerTwo: { select: { id: true, displayName: true } },
      },
    });
    if (
      row &&
      (row.playerOneId === session.user.id || row.playerTwoId === session.user.id)
    ) {
      sessionResolved = true;
      opponent =
        row.playerOneId === session.user.id
          ? { id: row.playerTwo.id, displayName: row.playerTwo.displayName }
          : { id: row.playerOne.id, displayName: row.playerOne.displayName };
      gameLengthLabel = formatGameLength(row.startedAt, now);
    }
  }

  if (!opponent && opponentFromQuery) {
    const o = opponents.find((x) => x.id === opponentFromQuery);
    if (o) opponent = o;
  }

  if (!opponent && opponents.length === 1) {
    opponent = opponents[0]!;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Log a game</h1>
      <div className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        <p>{dateTimeLabel}</p>
        {gameLengthLabel ? (
          <p className="mt-1">
            Game length: <span className="text-zinc-800 dark:text-zinc-200">{gameLengthLabel}</span>
          </p>
        ) : null}
      </div>

      {!me?.validated ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Your account is not validated yet. You cannot log games until an admin approves your
          profile.
        </div>
      ) : opponents.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          There are no other validated players to choose yet. Ask an admin to validate more accounts,
          or check back later.
        </p>
      ) : opponent && me?.validated ? (
        <GameLogForm
          currentUserId={session.user.id}
          currentUserName={me.displayName}
          opponent={opponent}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {sessionId && !sessionResolved
              ? "That game session was not found or you were not a player in it."
              : "Choose who you played to continue."}
          </p>
          <ul className="flex flex-col gap-2">
            {opponents.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/games/new?opponent=${encodeURIComponent(o.id)}`}
                  className="flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  vs {o.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
