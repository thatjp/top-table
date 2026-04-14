"use client";

import dynamic from "next/dynamic";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

const VenuesMapClient = dynamic(
  () => import("@/components/VenuesMapClient").then((m) => m.VenuesMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="mb-8 h-[min(420px,55vh)] w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
        aria-hidden
      />
    ),
  },
);

type Props = {
  venues: VenueMapRow[];
  apiKey: string;
};

export function VenuesMapSection({ venues, apiKey }: Props) {
  return <VenuesMapClient venues={venues} apiKey={apiKey} />;
}
