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
  isHost: boolean;
  playerOneName: string;
  guestName: string | null;
  startedAtIso: string | null;
  waitingForGuest: boolean;
  joinQrSvg: string | null;
  joinUrl: string | null;
  incompleteAtIso: string | null;
};

export function GameSessionContent({
  sessionId,
  isHost,
  playerOneName,
  guestName,
  startedAtIso,
  waitingForGuest,
  joinQrSvg,
  joinUrl,
  incompleteAtIso,
}: Props) {
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [startPending, setStartPending] = useState(false);

  const inLobby = startedAtIso === null;

  useEffect(() => {
    if (!startedAtIso) return;
    const startMs = new Date(startedAtIso).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtIso]);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [router]);

  async function onCancel() {
    setCancelPending(true);
    try {
      const res = await fetch(`/api/game-sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStartError(typeof data.error === "string" ? data.error : "Could not cancel.");
        setCancelPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setStartError("Could not cancel.");
      setCancelPending(false);
    }
  }

  async function onStartGame() {
    setStartError(null);
    setStartPending(true);
    try {
      const res = await fetch(`/api/game-sessions/${encodeURIComponent(sessionId)}/begin`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStartError(typeof data.error === "string" ? data.error : "Could not start the game.");
        setStartPending(false);
        return;
      }
      router.refresh();
    } catch {
      setStartError("Something went wrong.");
    }
    setStartPending(false);
  }

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
          {inLobby ? "Game lobby" : "Game started"}
        </h1>

        {incompleteAtIso && !inLobby ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            This match was marked <strong>incomplete</strong> after one hour without a logged
            result. Only the host can save the score —{" "}
            {isHost ? (
              <Link
                href={`/games/new?session=${encodeURIComponent(sessionId)}`}
                className="font-medium underline underline-offset-2"
              >
                Log the result
              </Link>
            ) : (
              "Wait for the host to log the result."
            )}
          </p>
        ) : null}

        {inLobby ? (
          <p className="mt-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {waitingForGuest && isHost
              ? "Share the code so your opponent can join. The match clock starts after you tap Start game."
              : isHost
                ? "Everyone is here. Start the match when you are ready."
                : "Waiting for the host to start the match."}
          </p>
        ) : (
          <p
            className="mt-3 text-center font-mono text-3xl font-medium tabular-nums tracking-tight text-zinc-800 dark:text-zinc-100"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatElapsed(elapsedSeconds)}
          </p>
        )}

        <div className="mt-8 w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex min-w-min flex-row items-center justify-center gap-3 px-1 text-xl font-semibold text-zinc-900 sm:gap-5 sm:text-2xl md:text-3xl dark:text-zinc-50">
            <span className="whitespace-nowrap">{playerOneName}</span>
            <span className="shrink-0 text-base font-medium tracking-widest text-zinc-400 sm:text-lg md:text-xl dark:text-zinc-500">
              vs
            </span>
            <span className="whitespace-nowrap text-zinc-500 italic dark:text-zinc-400">
              {guestName ?? "Waiting for opponent…"}
            </span>
          </div>
        </div>

        {inLobby && waitingForGuest && isHost && joinQrSvg && joinUrl ? (
          <div className="mt-8 flex flex-col items-center gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-700">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Have your opponent scan this code. They will sign in with their email and game PIN.
            </p>
            <div
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950"
              dangerouslySetInnerHTML={{ __html: joinQrSvg }}
            />
            <p className="break-all text-center font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {joinUrl}
            </p>
          </div>
        ) : null}

        {startError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {startError}
          </p>
        ) : null}

        {inLobby && isHost && !waitingForGuest ? (
          <button
            type="button"
            disabled={startPending}
            onClick={() => void onStartGame()}
            className="mt-8 flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {startPending ? "Starting…" : "Start game"}
          </button>
        ) : null}

        {inLobby && isHost ? (
          <button
            type="button"
            disabled={cancelPending}
            onClick={() => void onCancel()}
            className="mt-3 flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-sm font-medium text-zinc-800 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
          >
            {cancelPending ? "Cancelling…" : "Cancel"}
          </button>
        ) : null}

        {!inLobby && isHost ? (
          <Link
            href={`/games/new?session=${encodeURIComponent(sessionId)}`}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white sm:w-auto dark:bg-zinc-100 dark:text-zinc-900"
          >
            Log completed game
          </Link>
        ) : null}
      </div>
    </div>
  );
}
