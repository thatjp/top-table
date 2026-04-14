"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function SettingsPinForm({ hasExistingPin }: { hasExistingPin: boolean }) {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("callbackUrl") ?? searchParams.get("next") ?? "";

  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin) || pin !== pinConfirm) {
      setError("PIN must be 4 digits and match confirmation.");
      return;
    }
    if (hasExistingPin && !/^\d{4}$/.test(currentPin)) {
      setError("Enter your current PIN.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/settings/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          pinConfirm,
          ...(hasExistingPin ? { currentPin } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const err = data.error;
        let msg = "Could not update PIN.";
        if (typeof err === "string") msg = err;
        else if (err && typeof err === "object") {
          const flat = err as Record<string, unknown>;
          const parts = Object.values(flat)
            .flat()
            .filter((x): x is string => typeof x === "string");
          if (parts.length) msg = parts.join(" ");
        }
        setError(msg);
        setPending(false);
        return;
      }
      setDone(true);
      if (nextUrl && nextUrl.startsWith("/")) {
        window.location.href = nextUrl;
        return;
      }
    } catch {
      setError("Something went wrong.");
    }
    setPending(false);
  }

  if (done && !nextUrl) {
    return (
      <p className="text-emerald-700 dark:text-emerald-300">
        PIN saved.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {hasExistingPin ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="currentPin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Current PIN
          </label>
          <input
            id="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          New 4-digit PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pinConfirm" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Confirm PIN
        </label>
        <input
          id="pinConfirm"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save PIN"}
      </button>
    </form>
  );
}
