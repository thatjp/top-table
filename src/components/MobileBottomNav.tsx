"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function itemClass(active: boolean, variant: "default" | "accent" = "default"): string {
  const base =
    "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-[0.6875rem] font-semibold leading-tight transition-colors";
  if (variant === "accent" && active) {
    return `${base} text-green-700 dark:text-green-400`;
  }
  return `${base} ${
    active
      ? "text-zinc-900 dark:text-zinc-50"
      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
  }`;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const leaderboardActive = pathname === "/";
  const newGameActive = pathname === "/games/start";
  const mapActive = pathname === "/tables" || pathname.startsWith("/tables/");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden"
      aria-label="Main"
    >
      <div className="flex h-14 w-full">
        <Link
          href="/tables"
          className={itemClass(mapActive)}
          aria-current={mapActive ? "page" : undefined}
        >
          <span className="max-w-22">Map</span>
        </Link>
        <Link
          href="/games/start"
          className={itemClass(newGameActive, "accent")}
          aria-current={newGameActive ? "page" : undefined}
        >
          <span className="max-w-22">New game</span>
        </Link>
        <Link
          href="/"
          className={itemClass(leaderboardActive)}
          aria-current={leaderboardActive ? "page" : undefined}
        >
          <span className="max-w-22">Leaderboard</span>
        </Link>
      </div>
    </nav>
  );
}
