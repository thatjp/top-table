"use client";

import { Fragment, useId, useState } from "react";
import type { LeaderboardRow } from "@/lib/leaderboard";

type Props = {
  rows: LeaderboardRow[];
};

export function LeaderboardTable({ rows }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleRow(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-0 text-left text-sm md:min-w-[36rem]">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <tr>
            <th className="px-3 py-3 font-medium text-zinc-700 md:px-4 dark:text-zinc-300">Rank</th>
            <th className="px-3 py-3 font-medium text-zinc-700 md:px-4 dark:text-zinc-300">Player</th>
            <th className="hidden px-4 py-3 font-medium text-zinc-700 md:table-cell dark:text-zinc-300">
              Wins
            </th>
            <th className="hidden px-4 py-3 font-medium text-zinc-700 md:table-cell dark:text-zinc-300">
              Losses
            </th>
            <th className="hidden px-4 py-3 font-medium text-zinc-700 md:table-cell dark:text-zinc-300">
              Games
            </th>
            <th className="hidden px-4 py-3 font-medium text-zinc-700 md:table-cell dark:text-zinc-300">
              Win %
            </th>
          </tr>
        </thead>
        <tbody className="md:divide-y md:divide-zinc-200 dark:md:divide-zinc-800">
          {rows.map((r) => {
            const expanded = openId === r.id;
            const statsPanelId = `${baseId}-stats-${r.id}`;
            return (
              <Fragment key={r.id}>
                <tr className="bg-white max-md:border-b max-md:border-zinc-200 dark:bg-zinc-950 dark:max-md:border-zinc-800">
                  <td className="px-3 py-3 font-medium text-zinc-900 md:px-4 dark:text-zinc-50">
                    {r.rank}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <button
                      type="button"
                      id={`${baseId}-name-${r.id}`}
                      className="inline-flex max-w-full items-center gap-1.5 text-left font-medium text-zinc-900 hover:underline md:pointer-events-none md:cursor-default md:font-normal md:hover:no-underline dark:text-zinc-50"
                      onClick={() => toggleRow(r.id)}
                      aria-expanded={expanded}
                      aria-controls={statsPanelId}
                    >
                      <span className="min-w-0 break-words">{r.displayName}</span>
                      <span
                        className={`inline-block shrink-0 text-zinc-400 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 md:hidden ${expanded ? "rotate-90" : "rotate-0"}`}
                        aria-hidden
                      >
                        ›
                      </span>
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                    {r.wins}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                    {r.losses}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                    {r.gamesPlayed}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-zinc-900 md:table-cell dark:text-zinc-50">
                    {(r.winPct * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr className="md:hidden">
                  <td colSpan={2} className="p-0">
                    <div
                      data-expanded={expanded ? "true" : "false"}
                      className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 data-[expanded=false]:grid-rows-[0fr] data-[expanded=true]:grid-rows-[1fr]"
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          id={statsPanelId}
                          role="region"
                          aria-labelledby={`${baseId}-name-${r.id}`}
                          aria-hidden={!expanded}
                          inert={!expanded ? true : undefined}
                          className={
                            expanded
                              ? "border-t border-zinc-200 bg-zinc-50 px-3 py-3 opacity-100 transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 dark:border-zinc-800 dark:bg-zinc-900/40"
                              : "border-t border-transparent bg-zinc-50 px-3 py-3 opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none motion-reduce:duration-0 dark:bg-zinc-900/40"
                          }
                        >
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                              <tr>
                                <th
                                  scope="row"
                                  className="py-2 pr-4 text-left font-medium text-zinc-600 dark:text-zinc-400"
                                >
                                  Wins
                                </th>
                                <td className="py-2 tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {r.wins}
                                </td>
                              </tr>
                              <tr>
                                <th
                                  scope="row"
                                  className="py-2 pr-4 text-left font-medium text-zinc-600 dark:text-zinc-400"
                                >
                                  Losses
                                </th>
                                <td className="py-2 tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {r.losses}
                                </td>
                              </tr>
                              <tr>
                                <th
                                  scope="row"
                                  className="py-2 pr-4 text-left font-medium text-zinc-600 dark:text-zinc-400"
                                >
                                  Games
                                </th>
                                <td className="py-2 tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {r.gamesPlayed}
                                </td>
                              </tr>
                              <tr>
                                <th
                                  scope="row"
                                  className="py-2 pr-4 text-left font-medium text-zinc-600 dark:text-zinc-400"
                                >
                                  Win %
                                </th>
                                <td className="py-2 tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {(r.winPct * 100).toFixed(1)}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
