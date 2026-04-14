"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  sessionId: string;
  playerOneName: string;
  playerTwoName: string;
  startedAtIso: string;
};

export function GameSessionContent({
  sessionId,
  playerOneName,
  playerTwoName,
  startedAtIso,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startMs = new Date(startedAtIso).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 self-start text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Leaderboard
      </Link>

      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50 sm:p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Game Started
        </h1>
        <p
          className="mt-3 text-center font-mono text-3xl font-medium tabular-nums tracking-tight text-zinc-800 dark:text-zinc-100"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatElapsed(elapsedSeconds)}
        </p>

        <div className="mt-8 w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex min-w-min flex-row items-center justify-center gap-3 px-1 text-xl font-semibold text-zinc-900 sm:gap-5 sm:text-2xl md:text-3xl dark:text-zinc-50">
            <span className="whitespace-nowrap">{playerOneName}</span>
            <span className="shrink-0 text-base font-medium tracking-widest text-zinc-400 sm:text-lg md:text-xl dark:text-zinc-500">
              vs
            </span>
            <span className="whitespace-nowrap">{playerTwoName}</span>
          </div>
        </div>

        <Link
          href={`/games/new?session=${encodeURIComponent(sessionId)}`}
          className="mt-6 flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white sm:w-auto dark:bg-zinc-100 dark:text-zinc-900"
        >
          Log completed game
        </Link>
      </div>
    </div>
  );
}
