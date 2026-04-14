import Link from "next/link";
import { auth } from "@/auth";
import { AdminApprovedUsersDemo } from "@/components/AdminApprovedUsersDemo";
import { LogoutButton } from "@/components/LogoutButton";
import { countAdminActionableRequests } from "@/lib/admin-pending-queue";

export async function Nav() {
  const session = await auth();
  const adminPendingCount =
    session?.user?.isAdmin ? await countAdminActionableRequests() : 0;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Top Table
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm font-medium">
          <Link
            href="/games/start"
            className="new-game-nav-btn rounded-full bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
          >
            New game
          </Link>
          <Link
            href="/venues"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Venues
          </Link>
          {session?.user ? (
            <>
              {session.user.isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  <span>Admin</span>
                  {adminPendingCount > 0 ? (
                    <span
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1 text-[0.6875rem] font-semibold leading-none text-white tabular-nums dark:bg-rose-500"
                      aria-label={`${adminPendingCount} pending account${adminPendingCount === 1 ? "" : "s"} to review`}
                    >
                      {adminPendingCount > 99 ? "99+" : adminPendingCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/profile"
                  className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {session.user.name}
                </Link>
                <LogoutButton />
                {session.user.isAdmin ? <AdminApprovedUsersDemo /> : null}
              </div>
            </>
          ) : (
            <>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
