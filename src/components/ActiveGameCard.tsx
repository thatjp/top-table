"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function ActiveGameCard({
  sessionId,
  playerOneName,
  playerTwoName,
  startedAtIso,
}: Props) {
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startMs = new Date(startedAtIso).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const secId = setInterval(tick, 1000);
    const refreshId = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => {
      clearInterval(secId);
      clearInterval(refreshId);
    };
  }, [startedAtIso, router]);

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        Active game
      </p>
      <p className="mt-1 text-lg font-semibold text-emerald-950 dark:text-emerald-50">
        {playerOneName} <span className="text-emerald-700 dark:text-emerald-300">vs</span>{" "}
        {playerTwoName}
      </p>
      <p className="mt-2 font-mono text-2xl tabular-nums text-emerald-900 dark:text-emerald-100">
        {formatElapsed(elapsedSeconds)}
      </p>
      <Link
        href={`/games/session/${encodeURIComponent(sessionId)}`}
        className="mt-3 inline-flex text-sm font-medium text-emerald-900 underline decoration-emerald-600 underline-offset-2 hover:text-emerald-950 dark:text-emerald-100 dark:hover:text-white"
      >
        Open session
      </Link>
    </div>
  );
}
