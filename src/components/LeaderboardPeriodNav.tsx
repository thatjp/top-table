import Link from "next/link";
import type { LeaderboardPeriod } from "@/lib/leaderboard";

const LINKS: { period: LeaderboardPeriod; label: string }[] = [
  { period: "all", label: "All time" },
  { period: "year", label: "Year" },
  { period: "month", label: "Month" },
  { period: "week", label: "Week" },
];

function hrefForPeriod(venueBasePath: string | undefined, period: LeaderboardPeriod): string {
  const base = venueBasePath ?? "/";
  if (period === "all") {
    return base.includes("?") ? base.split("?")[0]! : base;
  }
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}period=${period}`;
}

type Props = {
  current: LeaderboardPeriod;
  /** When set, links target this path (e.g. `/tables/ChIJ…`) with `?period=` instead of home. */
  venueBasePath?: string;
};

export function LeaderboardPeriodNav({ current, venueBasePath }: Props) {
  return (
    <div className="mb-6">
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Leaderboard time range"
      >
        {LINKS.map(({ period, label }) => {
          const active = period === current;
          const href = hrefForPeriod(venueBasePath, period);
          return (
            <Link
              key={period}
              href={href}
              className={
                active
                  ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
