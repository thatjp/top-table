import Link from "next/link";
import { auth } from "@/auth";
import { AdminApprovedUsersDemo } from "@/components/AdminApprovedUsersDemo";
import { LogoutButton } from "@/components/LogoutButton";

export async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Top Table
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Leaderboard
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/games/new"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Log game
              </Link>
              <Link
                href="/me/qr"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                My QR
              </Link>
              <Link
                href="/settings/pin"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Game PIN
              </Link>
              {session.user.isAdmin ? (
                <>
                  <Link
                    href="/admin"
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Admin
                  </Link>
                  <AdminApprovedUsersDemo />
                </>
              ) : null}
              <span className="text-zinc-500 dark:text-zinc-500">
                {session.user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
