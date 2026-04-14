import { startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** IANA timezone for calendar boundaries (week / month / year). Default UTC. */
export function leaderboardTimeZone(): string {
  const tz = process.env.LEADERBOARD_TIMEZONE?.trim();
  return tz && tz.length > 0 ? tz : "UTC";
}

export type BoundedLeaderboardPeriod = "week" | "month" | "year";

/**
 * Inclusive start (midnight on first day of period) and end (`now`) in UTC for DB queries.
 * - Week: Sunday 00:00 through now (in configured timezone).
 * - Month: 1st of current calendar month 00:00 through now.
 * - Year: Jan 1 of current calendar year 00:00 through now.
 */
export function periodBoundsUtc(period: BoundedLeaderboardPeriod, now: Date = new Date()): {
  gte: Date;
  lte: Date;
} {
  const tz = leaderboardTimeZone();
  const lte = now;

  if (tz === "UTC") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    if (period === "year") {
      return { gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)), lte };
    }
    if (period === "month") {
      return { gte: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)), lte };
    }
    const dow = now.getUTCDay();
    const gte = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    gte.setUTCDate(gte.getUTCDate() - dow);
    return { gte, lte };
  }

  const zonedNow = toZonedTime(now, tz);
  let startZoned: Date;
  if (period === "year") {
    startZoned = startOfYear(zonedNow);
  } else if (period === "month") {
    startZoned = startOfMonth(zonedNow);
  } else {
    startZoned = startOfWeek(zonedNow, { weekStartsOn: 0 });
  }
  const gte = fromZonedTime(startZoned, tz);
  return { gte, lte };
}
