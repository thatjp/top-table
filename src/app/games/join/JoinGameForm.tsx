"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  inviteToken: string;
};

export function JoinGameForm({ inviteToken }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
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
      const res = await fetch("/api/game-sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, login, pin }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        sessionId?: string;
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Could not join. Check your name or email and PIN.";
        setError(msg);
        setPending(false);
        return;
      }
      if (!data.sessionId) {
        setError("Unexpected response.");
        setPending(false);
        return;
      }

      const sign = await signIn("credentials", {
        email: login,
        pin,
        password: "",
        redirect: false,
      });
      if (sign?.error) {
        setError("You joined the game but sign-in failed. Try logging in, then open this link again.");
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
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="login" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email or display name
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Game PIN
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
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Your PIN is not shown to the host. You will be signed in on this device.
      </p>
      <button
        type="submit"
        disabled={pending || pin.length !== 4}
        className="rounded-lg bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Joining…" : "Join game"}
      </button>
    </form>
  );
}
