"use client";

import { useEffect, useMemo, useState } from "react";
import { VenuesMapSection } from "@/components/VenuesMapSection";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

type Props = {
  venues: VenueMapRow[];
  mapKey: string;
  initialSelectedPlaceId?: string | null;
};

function normalizeQuery(input: string): string {
  return input.trim().toLowerCase();
}

export function TablesDirectory({ venues, mapKey, initialSelectedPlaceId = null }: Props) {
  const [query, setQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    initialSelectedPlaceId,
  );
  const [selectedVenueClickSeq, setSelectedVenueClickSeq] = useState(
    initialSelectedPlaceId ? 1 : 0,
  );
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [lockToSelection, setLockToSelection] = useState(
    initialSelectedPlaceId ? true : false,
  );

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return venues;
    return venues.filter((venue) => venue.label.toLowerCase().includes(q));
  }, [venues, query]);

  const focusedVenue = filtered[0] ?? null;
  const selectedVenue = selectedPlaceId
    ? venues.find((venue) => venue.placeId === selectedPlaceId) ?? null
    : null;
  const hasDebouncedQuery = normalizeQuery(debouncedQuery).length >= 3;
  const hasQuery = normalizeQuery(query).length > 0;
  const listItems =
    lockToSelection && selectedVenue ? [selectedVenue] : filtered;
  const hasResults = hasQuery && listItems.length > 0;
  const visibleRows = Math.min(listItems.length, 2);
  const listMaxHeightRem = visibleRows * 4.25;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="relative h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom,0px))] w-full overflow-hidden md:h-[calc(100dvh-4rem)]">
      {mapKey ? (
        <VenuesMapSection
          venues={venues}
          apiKey={mapKey}
          focusedVenue={hasDebouncedQuery && focusedVenue ? focusedVenue : null}
          selectedVenue={selectedVenue}
          selectedVenueClickSeq={selectedVenueClickSeq}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Set{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
            </code>{" "}
            to show the map. The list below still works.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px))] z-30 p-3 md:bottom-0">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-950/90">
          <div className="mb-3">
            <label htmlFor="tables-search" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Search tables
            </label>
            <input
              id="tables-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLockToSelection(false);
              }}
              placeholder="Type a bar or venue name…"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {hasQuery && filtered.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              No venues match that search.
            </p>
          ) : null}

          <div
            className={`overflow-hidden transition-[max-height,opacity,margin-top] duration-200 ease-out ${
              hasResults ? "mt-2 max-h-36 opacity-100" : "mt-0 max-h-0 opacity-0"
            }`}
          >
            <ul
              className="divide-y divide-zinc-200 overflow-auto rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 transition-[max-height] duration-200 ease-out"
              style={{ maxHeight: hasResults ? `${listMaxHeightRem}rem` : "0rem" }}
            >
              {listItems.map((v) => (
                <li key={v.placeId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(v.placeId);
                      setSelectedVenueClickSeq((n) => n + 1);
                      setLockToSelection(true);
                    }}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-900/50"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{v.label}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {v.gamesPlayed} games · {v.uniquePlayers} players
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
