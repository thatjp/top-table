"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";

type DemoUser = {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

export function AdminApprovedUsersDemo() {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [demoLeaderboard, setDemoLeaderboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, modeRes] = await Promise.all([
        fetch("/api/demo/approved-users"),
        fetch("/api/demo/leaderboard-mode"),
      ]);
      if (!usersRes.ok) {
        setError(usersRes.status === 403 ? "Not allowed." : "Could not load demo users.");
        setUsers([]);
        setLoading(false);
        return;
      }
      if (modeRes.ok) {
        const mode = (await modeRes.json()) as { enabled?: boolean };
        setDemoLeaderboard(mode.enabled === true);
      }
      const data = (await usersRes.json()) as DemoUser[];
      setUsers(data);
    } catch {
      setError("Could not load demo data.");
      setUsers([]);
    }
    setLoading(false);
  }, []);

  function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next && users === null) void load();
  }

  async function setDemoLeaderboardEnabled(enabled: boolean) {
    setToggleBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/leaderboard-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        setError("Could not update demo mode.");
        setToggleBusy(false);
        return;
      }
      const data = (await res.json()) as { enabled?: boolean };
      setDemoLeaderboard(data.enabled === true);
      router.refresh();
      if (enabled) {
        router.push("/");
      }
    } catch {
      setError("Could not update demo mode.");
    }
    setToggleBusy(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        aria-controls={panelId}
        className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/60"
      >
        Demo
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/20 dark:bg-black/40"
            aria-label="Close panel"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-label="Demo tools"
            className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,24rem)] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Demo</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Seeded players (<code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">isDemo</code>
                  ). Toggle replaces the public leaderboard for <strong>this browser</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={demoLeaderboard}
                  disabled={toggleBusy}
                  onChange={(e) => void setDemoLeaderboardEnabled(e.target.checked)}
                />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  Show demo leaderboard on home
                  <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    Uses only demo users and their games. Uncheck to show real players again.
                  </span>
                </span>
              </label>
            </div>

            {demoLeaderboard ? (
              <p className="mb-3 text-xs">
                <Link
                  href="/"
                  className="font-medium text-violet-700 underline dark:text-violet-400"
                >
                  Open leaderboard →
                </Link>
              </p>
            ) : null}

            {error ? (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Demo players ({users?.length ?? "…"})
            </h3>

            {loading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : users?.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No demo users in the database. Run{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">npm run db:seed-demo</code>
              </p>
            ) : (
              <ul className="max-h-52 space-y-2 overflow-y-auto text-sm">
                {users?.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{u.displayName}</div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</div>
                    <div className="text-[10px] text-zinc-400">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="mt-3 w-full rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Refresh
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
