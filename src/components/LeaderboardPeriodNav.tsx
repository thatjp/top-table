import Link from "next/link";
import type { LeaderboardPeriod } from "@/lib/leaderboard";

const LINKS: { period: LeaderboardPeriod; label: string; href: string }[] = [
  { period: "all", label: "All time", href: "/" },
  { period: "year", label: "Year", href: "/?period=year" },
  { period: "month", label: "Month", href: "/?period=month" },
  { period: "week", label: "Week", href: "/?period=week" },
];

type Props = {
  current: LeaderboardPeriod;
};

export function LeaderboardPeriodNav({ current }: Props) {

  return (
    <div className="mb-6">
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Leaderboard time range"
      >
        {LINKS.map(({ period, label, href }) => {
          const active = period === current;
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
