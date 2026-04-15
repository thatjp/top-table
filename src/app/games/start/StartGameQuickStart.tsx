"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartGameQuickStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onStart() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/game-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        sessionId?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create game session.");
        setPending(false);
        return;
      }
      if (!data.sessionId) {
        setError("Unexpected response.");
        setPending(false);
        return;
      }
      router.push(`/games/session/${data.sessionId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        You are already signed in, so you can jump straight to the join QR code.
      </p>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="rounded-lg bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Starting…" : "Start game & show join code"}
      </button>
    </div>
  );
}
