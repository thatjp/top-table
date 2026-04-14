"use client";

import { useState } from "react";

type Props = {
  initialDisplayName: string;
  initialEmail: string;
};

export function AccountForm({ initialDisplayName, initialEmail }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const err = data.error;
        let msg = "Could not update account.";
        if (typeof err === "string") msg = err;
        else if (err && typeof err === "object") {
          const parts = Object.values(err as Record<string, unknown>)
            .flat()
            .filter((x): x is string => typeof x === "string");
          if (parts.length) msg = parts.join(" ");
        }
        setError(msg);
        setPending(false);
        return;
      }
      setSaved(true);
      window.location.reload();
    } catch {
      setError("Something went wrong.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Account updated.
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          required
          maxLength={120}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save account"}
      </button>
    </form>
  );
}
