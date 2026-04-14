"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  token: string;
  hostDisplayName: string | null;
  invalid: boolean;
};

export function VerifyGameForm({ token, hostDisplayName, invalid }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter your 4-digit game PIN.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/game-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        id?: string;
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Could not start the game. Check your PIN.";
        setError(msg);
        setPending(false);
        return;
      }
      if (data.id) {
        router.push(`/games/session/${data.id}`);
        router.refresh();
        return;
      }
      setError("Unexpected response.");
    } catch {
      setError("Something went wrong.");
    }
    setPending(false);
  }

  if (invalid || !hostDisplayName) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        This link is invalid or expired. Ask your opponent to open{" "}
        <strong>My QR</strong> and share a fresh code.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        You are about to start a match with <strong>{hostDisplayName}</strong>. Enter{" "}
        <strong>your</strong> 4-digit game PIN (the one you set at registration or in Settings).
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Your opponent does not see this PIN. By continuing, you confirm you are at the table
        together.
      </p>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your game PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          pattern="\d{4}"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending || pin.length !== 4}
        className="rounded-lg bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Starting…" : "Begin game"}
      </button>
    </form>
  );
}
