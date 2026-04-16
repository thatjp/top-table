"use client";

import { useEffect, useRef } from "react";
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Cluster,
  type Renderer,
  type ClusterStats,
} from "@googlemaps/markerclusterer";
import { NYC_MAP_BOUNDS, NYC_MAP_CENTER } from "@/lib/nyc-map-scope";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

type Props = {
  venues: VenueMapRow[];
  apiKey: string;
  focusedVenue?: VenueMapRow | null;
  selectedVenue?: VenueMapRow | null;
  selectedVenueClickSeq?: number;
};

/** Supercluster: clusters exist for map zoom levels ≤ this; above, points render individually. */
const VENUE_CLUSTER_MAX_ZOOM = 14;
/** Cluster radius in px (supercluster). */
const VENUE_CLUSTER_RADIUS = 52;

function getVenueHitIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillOpacity: 0,
    strokeOpacity: 0,
    scale: 1,
  };
}

function venueMarkerLabel(highlighted: boolean): google.maps.MarkerLabel {
  return {
    text: "🎱",
    fontSize: highlighted ? "24px" : "22px",
    className: highlighted
      ? "tables-map-venue-marker-label is-highlighted"
      : "tables-map-venue-marker-label",
  };
}

function bounceMarkerBriefly(marker: google.maps.Marker) {
  marker.setAnimation(google.maps.Animation.BOUNCE);
  window.setTimeout(() => {
    marker.setAnimation(null);
  }, 650);
}

/**
 * Default cluster renderer uses multi-layer SVG + optional AdvancedMarker path.
 * We only render multi-point clusters; single-point clusters use the real venue marker.
 */
class LightTablesClusterRenderer implements Renderer {
  render(
    { count, position }: Cluster,
    _stats: ClusterStats,
    _map: google.maps.Map,
  ): google.maps.Marker {
    return new google.maps.Marker({
      position,
      optimized: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#52525b",
        fillOpacity: 0.95,
        strokeColor: "#fafafa",
        strokeWeight: 1,
        scale: 15,
      },
      label: {
        text: String(count),
        color: "#fafafa",
        fontSize: "11px",
        fontWeight: "600",
      },
      zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
      title: `${count} venues`,
    });
  }
}

type PopupOverlayInstance = google.maps.OverlayView & {
  show: (venue: VenueMapRow) => void;
  hide: () => void;
};

function createVenuePopupOverlay(): PopupOverlayInstance {
  class VenuePopupOverlay extends google.maps.OverlayView {
    private venue: VenueMapRow | null = null;
    private container: HTMLDivElement | null = null;
    private visible = false;

    override onAdd() {
      const panes = this.getPanes();
      if (!panes) return;
      const node = document.createElement("div");
      node.className = "tables-map-venue-popup";
      node.style.position = "absolute";
      node.setAttribute("aria-hidden", "true");
      this.container = node;
      panes.floatPane.appendChild(node);
    }

    override draw() {
      if (!this.container || !this.venue || !this.visible) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.venue.latitude, this.venue.longitude),
      );
      if (!point) return;
      this.container.style.left = `${point.x}px`;
      this.container.style.top = `${point.y}px`;
    }

    override onRemove() {
      if (this.container?.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
    }

    private async loadTopPlayers(placeId: string) {
      if (!this.container) return;
      const body = this.container.querySelector<HTMLTableSectionElement>(
        ".tables-map-venue-top3-body",
      );
      if (!body) return;
      try {
        const res = await fetch(
          `/api/venues/${encodeURIComponent(placeId)}/mini-leaderboard`,
        );
        if (!res.ok) {
          body.innerHTML =
            '<tr><td colspan="2" class="tables-map-venue-top3-name">Top players unavailable.</td></tr>';
          return;
        }
        const data = (await res.json()) as {
          players?: { rank: number; displayName: string; wins: number; losses: number }[];
          totalGames?: number;
        };
        const players = Array.isArray(data.players) ? data.players.slice(0, 3) : [];
        // If this venue has fewer than 2 recorded games overall, show a friendly message.
        const totalGames =
          typeof data.totalGames === "number"
            ? data.totalGames
            : this.venue?.gamesPlayed ?? 0;
        if (players.length === 0 || totalGames < 2) {
          body.innerHTML =
            '<tr><td colspan="2" class="tables-map-venue-top3-name">No top players... yet</td></tr>';
          return;
        }
        body.innerHTML = players
          .map(
            (p) => `
            <tr>
              <td class="tables-map-venue-top3-name">${p.displayName}</td>
              <td class="tables-map-venue-top3-record">${p.wins}-${p.losses}</td>
            </tr>
          `,
          )
          .join("");
      } catch {
        body.innerHTML =
          '<tr><td colspan="3" class="tables-map-venue-top3-name">Top players unavailable.</td></tr>';
      }
    }

    show(venue: VenueMapRow) {
      this.venue = venue;
      this.visible = true;
      if (!this.container) return;
      const busyFromGames = Math.max(0, Math.min(100, venue.gamesPlayed * 4));
      const mapsUrl = venue.placeId
        ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
            venue.placeId,
          )}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${venue.latitude},${venue.longitude}`,
          )}`;

      this.container.innerHTML = `
        <div class="tables-map-venue-popup-card">
          <div class="tables-map-venue-popup-body">
            <div class="tables-map-venue-popup-header">
              <div class="tables-map-venue-popup-title">${venue.label}</div>
              <a
                class="tables-map-venue-popup-link"
                href="${mapsUrl}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Google Maps"
              >
                ↗
              </a>
            </div>
            <div class="tables-map-venue-popup-meta">${venue.gamesPlayed} games · ${venue.uniquePlayers} players</div>
            <div class="tables-map-venue-busy">
              <div class="tables-map-venue-busy-header">
                <span>Busy</span>
                <span>${busyFromGames}%</span>
              </div>
              <div class="tables-map-venue-busy-scale" style="--busy-pct:${busyFromGames};">
                <div class="tables-map-venue-busy-thumb"></div>
              </div>
            </div>
            <div class="tables-map-venue-top3">
              <div class="tables-map-venue-top3-title">Top players</div>
              <table class="tables-map-venue-top3-table">
                <tbody class="tables-map-venue-top3-body">
                  <tr>
                    <td colspan="2" class="tables-map-venue-top3-name">Loading…</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              type="button"
              class="tables-map-venue-more"
              data-place-id="${venue.placeId}"
            >
              more
            </button>
          </div>
        </div>
      `;
      this.container.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => {
        this.container?.classList.add("is-visible");
      });
      this.draw();
      const moreBtn = this.container.querySelector<HTMLButtonElement>(
        ".tables-map-venue-more",
      );
      if (moreBtn && venue.placeId) {
        moreBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = `/tables/${encodeURIComponent(venue.placeId)}`;
        });
      }
      void this.loadTopPlayers(venue.placeId);
    }

    hide() {
      this.visible = false;
      if (!this.container) return;
      this.container.classList.remove("is-visible");
      this.container.setAttribute("aria-hidden", "true");
    }
  }

  return new VenuePopupOverlay() as PopupOverlayInstance;
}

export function VenuesMapClient({
  venues,
  apiKey,
  focusedVenue = null,
  selectedVenue = null,
  selectedVenueClickSeq = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerByPlaceIdRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const popupOverlayRef = useRef<PopupOverlayInstance | null>(null);

  function openVenuePopup(venue: VenueMapRow) {
    popupOverlayRef.current?.show(venue);
  }

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
        maxZoom: 18,
        minZoom: 10,
        clickableIcons: false,
        restriction: {
          latLngBounds: nycBounds,
          strictBounds: false,
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapRef.current = map;
      popupOverlayRef.current?.setMap(null);
      const popupOverlay = createVenuePopupOverlay();
      popupOverlay.setMap(map);
      popupOverlayRef.current = popupOverlay;

      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      markerByPlaceIdRef.current.clear();

      const bounds = new google.maps.LatLngBounds();
      const venueMarkers: google.maps.Marker[] = [];

      for (const v of venues) {
        bounds.extend({ lat: v.latitude, lng: v.longitude });
        const marker = new google.maps.Marker({
          position: { lat: v.latitude, lng: v.longitude },
          icon: getVenueHitIcon(),
          label: venueMarkerLabel(false),
          optimized: true,
          title: v.label,
        });
        marker.addListener("click", () => {
          const target = { lat: v.latitude, lng: v.longitude };
          map.panTo(target);
          map.setZoom(17);
          markerByPlaceIdRef.current.forEach((m, placeId) => {
            m.setLabel(venueMarkerLabel(placeId === v.placeId));
            m.setZIndex(
              placeId === v.placeId ? Number(google.maps.Marker.MAX_ZINDEX) + 50 : undefined,
            );
          });
          bounceMarkerBriefly(marker);
          openVenuePopup(v);
        });
        markerByPlaceIdRef.current.set(v.placeId, marker);
        venueMarkers.push(marker);
      }

      const clusterer = new MarkerClusterer({
        map,
        markers: venueMarkers,
        algorithm: new SuperClusterAlgorithm({
          maxZoom: VENUE_CLUSTER_MAX_ZOOM,
          radius: VENUE_CLUSTER_RADIUS,
          minPoints: 2,
        }),
        renderer: new LightTablesClusterRenderer(),
      });
      clustererRef.current = clusterer;

      map.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    })().catch(() => {
      /* Map failed — list below still works */
    });

    return () => {
      cancelled = true;
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      markerByPlaceIdRef.current.clear();
      popupOverlayRef.current?.setMap(null);
      popupOverlayRef.current = null;
      mapRef.current = null;
    };
  }, [venues, apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const activeVenue = selectedVenue ?? focusedVenue;

    if (!activeVenue) {
      if (venues.length === 0) return;
      popupOverlayRef.current?.hide();
      markerByPlaceIdRef.current.forEach((m) => {
        m.setLabel(venueMarkerLabel(false));
        m.setZIndex(undefined);
      });
      const bounds = new google.maps.LatLngBounds();
      for (const v of venues) {
        bounds.extend({ lat: v.latitude, lng: v.longitude });
      }
      map.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
      return;
    }

    const target = { lat: activeVenue.latitude, lng: activeVenue.longitude };
    map.panTo(target);
    map.setZoom(17);

    const marker = markerByPlaceIdRef.current.get(activeVenue.placeId);
    markerByPlaceIdRef.current.forEach((m, placeId) => {
      const highlighted = placeId === activeVenue.placeId;
      m.setLabel(venueMarkerLabel(highlighted));
      m.setZIndex(highlighted ? Number(google.maps.Marker.MAX_ZINDEX) + 50 : undefined);
    });
    if (marker) {
      bounceMarkerBriefly(marker);
    }
    if (selectedVenue) {
      openVenuePopup(selectedVenue);
    } else {
      popupOverlayRef.current?.hide();
    }
  }, [selectedVenue, focusedVenue, selectedVenueClickSeq, venues]);

  if (venues.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="h-full w-full overflow-hidden"
      role="region"
      aria-label="Tables map"
    />
  );
}
