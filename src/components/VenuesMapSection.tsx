"use client";

import dynamic from "next/dynamic";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

const VenuesMapClient = dynamic(
  () => import("@/components/VenuesMapClient").then((m) => m.VenuesMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full animate-pulse bg-zinc-100 dark:bg-zinc-900"
        aria-hidden
      />
    ),
  },
);

type Props = {
  venues: VenueMapRow[];
  apiKey: string;
  focusedVenue?: VenueMapRow | null;
  selectedVenue?: VenueMapRow | null;
  selectedVenueClickSeq?: number;
};

export function VenuesMapSection({
  venues,
  apiKey,
  focusedVenue = null,
  selectedVenue = null,
  selectedVenueClickSeq = 0,
}: Props) {
  return (
    <VenuesMapClient
      venues={venues}
      apiKey={apiKey}
      focusedVenue={focusedVenue}
      selectedVenue={selectedVenue}
      selectedVenueClickSeq={selectedVenueClickSeq}
    />
  );
}
