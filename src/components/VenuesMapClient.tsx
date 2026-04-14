"use client";

import { useEffect, useRef } from "react";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

type Props = {
  venues: VenueMapRow[];
  apiKey: string;
};

export function VenuesMapClient({ venues, apiKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || venues.length === 0) return;

    let cancelled = false;

    (async () => {
      const { Loader } = await import("@googlemaps/js-api-loader");
      const loader = new Loader({ apiKey, version: "weekly" });
      await loader.load();
      if (cancelled || !ref.current) return;

      const first = venues[0]!;
      const map = new google.maps.Map(el, {
        center: { lat: first.latitude, lng: first.longitude },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      const bounds = new google.maps.LatLngBounds();
      for (const v of venues) {
        bounds.extend({ lat: v.latitude, lng: v.longitude });
        const marker = new google.maps.Marker({
          map,
          position: { lat: v.latitude, lng: v.longitude },
          title: v.label,
        });
        marker.addListener("click", () => {
          window.location.href = `/venues/${encodeURIComponent(v.placeId)}`;
        });
      }
      map.fitBounds(bounds, 48);
    })().catch(() => {
      /* Map failed — list below still works */
    });

    return () => {
      cancelled = true;
    };
  }, [venues, apiKey]);

  if (venues.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="mb-8 h-[min(420px,55vh)] w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
      role="region"
      aria-label="Venues map"
    />
  );
}
