import Link from "next/link";

export type IncompleteSessionItem = {
  id: string;
  incompleteAt: Date | null;
  playerTwo: { displayName: string } | null;
};

type Props = {
  sessions: IncompleteSessionItem[];
};

export function IncompleteSessionsWarning({ sessions }: Props) {
  const list = sessions.filter((s): s is IncompleteSessionItem & { incompleteAt: Date } =>
    Boolean(s.incompleteAt),
  );
  if (list.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50">
      <p className="font-semibold">Incomplete games</p>
      <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
        These matches went over an hour without a result. Log them when you can (only you, as
        host, can save the score).
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
        {list.map((s) => (
          <li key={s.id}>
            <span className="font-medium">
              vs {s.playerTwo?.displayName ?? "Opponent"}
            </span>{" "}
            —{" "}
            <Link
              href={`/games/new?session=${encodeURIComponent(s.id)}`}
              className="font-medium underline decoration-amber-700 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Log result
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
