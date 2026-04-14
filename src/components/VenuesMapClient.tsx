"use client";

import { useEffect, useRef } from "react";
import { NYC_MAP_BOUNDS, NYC_MAP_CENTER } from "@/lib/nyc-map-scope";
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

      const nycBounds = new google.maps.LatLngBounds(
        { lat: NYC_MAP_BOUNDS.south, lng: NYC_MAP_BOUNDS.west },
        { lat: NYC_MAP_BOUNDS.north, lng: NYC_MAP_BOUNDS.east },
      );

      const map = new google.maps.Map(el, {
        center: NYC_MAP_CENTER,
        zoom: 11,
        maxZoom: 14,
        minZoom: 10,
        restriction: {
          latLngBounds: nycBounds,
          strictBounds: false,
        },
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
          window.location.href = `/tables/${encodeURIComponent(v.placeId)}`;
        });
      }
      map.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
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
      aria-label="Tables map"
    />
  );
}
