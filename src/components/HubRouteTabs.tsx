"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function tabClass(active: boolean): string {
  return `flex-1 border-b-2 py-2.5 text-center text-sm font-semibold transition-colors ${
    active
      ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
      : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
  }`;
}

export function HubRouteTabs() {
  const pathname = usePathname();
  const leaderboardActive = pathname === "/";
  const tablesActive = pathname === "/tables" || pathname.startsWith("/tables/");

  return (
    <nav
      className="-mx-4 mt-3 flex border-b border-zinc-200 px-4 md:hidden dark:border-zinc-800"
      aria-label="Leaderboard and tables"
    >
      <Link
        href="/"
        className={tabClass(leaderboardActive)}
        aria-current={leaderboardActive ? "page" : undefined}
      >
        Leaderboard
      </Link>
      <Link
        href="/tables"
        className={tabClass(tablesActive)}
        aria-current={tablesActive ? "page" : undefined}
      >
        Tables
      </Link>
    </nav>
  );
}
