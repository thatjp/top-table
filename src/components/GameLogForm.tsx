"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Player = { id: string; displayName: string };

type Props = {
  currentUserId: string;
  currentUserName: string;
  opponent: Player;
};

export function GameLogForm({ currentUserId, currentUserName, opponent }: Props) {
  const router = useRouter();
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [rules, setRules] = useState<"APA" | "BCA" | "Bar">("Bar");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loserId =
    winnerId === currentUserId ? opponent.id : winnerId === opponent.id ? currentUserId : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!winnerId) {
      setError("Tap a name to choose who won.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponentId: opponent.id,
          winnerId,
          loserId,
          location,
          rules,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Could not save the game.";
        setError(msg);
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setPending(false);
    }
  }

  const ruleOptions = ["APA", "BCA", "Bar"] as const;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Winner</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setWinnerId(currentUserId)}
            className={`w-full rounded-xl border-2 px-4 py-4 text-left text-lg font-semibold transition-colors sm:py-5 sm:text-xl ${
              winnerId === currentUserId
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500"
            }`}
          >
            {currentUserName}
          </button>
          <button
            type="button"
            onClick={() => setWinnerId(opponent.id)}
            className={`w-full rounded-xl border-2 px-4 py-4 text-left text-lg font-semibold transition-colors sm:py-5 sm:text-xl ${
              winnerId === opponent.id
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500"
            }`}
          >
            {opponent.displayName}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Where you played
        </label>
        <input
          id="location"
          type="text"
          required
          maxLength={500}
          placeholder="Bar name, city, table room…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rules</p>
        <div className="grid grid-cols-3 gap-2">
          {ruleOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRules(r)}
              className={`rounded-lg border-2 px-2 py-3 text-center text-sm font-semibold sm:text-base ${
                rules === r
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 py-3 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save game"}
      </button>
    </form>
  );
}
