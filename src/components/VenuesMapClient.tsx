"use client";

import { useEffect, useRef } from "react";
import { NYC_MAP_BOUNDS, NYC_MAP_CENTER } from "@/lib/nyc-map-scope";
import type { VenueMapRow } from "@/lib/venue-leaderboard";

type Props = {
  venues: VenueMapRow[];
  apiKey: string;
  focusedVenue?: VenueMapRow | null;
  selectedVenue?: VenueMapRow | null;
  selectedVenueClickSeq?: number;
};

type MarkerOverlayInstance = google.maps.OverlayView & {
  setHighlighted: (highlighted: boolean) => void;
  bounceBriefly: () => void;
  getVenue: () => VenueMapRow;
};

type PopupOverlayInstance = google.maps.OverlayView & {
  show: (venue: VenueMapRow) => void;
  hide: () => void;
};

function createEmojiVenueMarkerOverlay(args: {
  map: google.maps.Map;
  venue: VenueMapRow;
  onClick: (venue: VenueMapRow) => void;
}): MarkerOverlayInstance {
  class EmojiVenueMarkerOverlay extends google.maps.OverlayView {
    private mapRef: google.maps.Map;
    private venue: VenueMapRow;
    private onClick: (venue: VenueMapRow) => void;
    private container: HTMLButtonElement | null = null;

    constructor() {
      super();
      this.mapRef = args.map;
      this.venue = args.venue;
      this.onClick = args.onClick;
    }

    override onAdd() {
      const panes = this.getPanes();
      if (!panes) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tables-map-emoji-marker";
      button.setAttribute("aria-label", this.venue.label);
      button.textContent = "🎱";
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onClick(this.venue);
      });
      this.container = button;
      panes.overlayMouseTarget.appendChild(button);
    }

    override draw() {
      if (!this.container) return;
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

    setHighlighted(highlighted: boolean) {
      if (!this.container) return;
      this.container.classList.toggle("is-highlighted", highlighted);
    }

    bounceBriefly() {
      if (!this.container) return;
      this.container.classList.add("is-bouncing");
      setTimeout(() => {
        this.container?.classList.remove("is-bouncing");
      }, 700);
    }

    getVenue() {
      return this.venue;
    }
  }

  return new EmojiVenueMarkerOverlay() as MarkerOverlayInstance;
}

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

    show(venue: VenueMapRow) {
      this.venue = venue;
      this.visible = true;
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="tables-map-venue-popup-card">
          <div class="tables-map-venue-popup-body">
            <div class="tables-map-venue-popup-title">${venue.label}</div>
            <div class="tables-map-venue-popup-meta">${venue.gamesPlayed} games · ${venue.uniquePlayers} players</div>
          </div>
        </div>
      `;
      this.container.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => {
        this.container?.classList.add("is-visible");
      });
      this.draw();
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
  const markerByPlaceIdRef = useRef<Map<string, MarkerOverlayInstance>>(new Map());
  const popupOverlayRef = useRef<PopupOverlayInstance | null>(null);

  function resetView() {
    const map = mapRef.current;
    if (!map || venues.length === 0) return;
    popupOverlayRef.current?.hide();
    const bounds = new google.maps.LatLngBounds();
    for (const v of venues) {
      bounds.extend({ lat: v.latitude, lng: v.longitude });
    }
    map.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
  }

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

      const bounds = new google.maps.LatLngBounds();
      markerByPlaceIdRef.current.forEach((marker) => marker.setMap(null));
      markerByPlaceIdRef.current.clear();
      for (const v of venues) {
        bounds.extend({ lat: v.latitude, lng: v.longitude });
        const marker = createEmojiVenueMarkerOverlay({
          map,
          venue: v,
          onClick: (venue) => {
            const target = { lat: venue.latitude, lng: venue.longitude };
            map.panTo(target);
            map.setZoom(17);
            markerByPlaceIdRef.current.forEach((m) =>
              m.setHighlighted(m.getVenue().placeId === venue.placeId),
            );
            const selectedMarker = markerByPlaceIdRef.current.get(venue.placeId);
            selectedMarker?.bounceBriefly();
            openVenuePopup(venue);
          },
        });
        marker.setMap(map);
        markerByPlaceIdRef.current.set(v.placeId, marker);
      }
      map.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    })().catch(() => {
      /* Map failed — list below still works */
    });

    return () => {
      cancelled = true;
      popupOverlayRef.current?.setMap(null);
      popupOverlayRef.current = null;
    };
  }, [venues, apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const activeVenue = selectedVenue ?? focusedVenue;

    if (!activeVenue) {
      if (venues.length === 0) return;
      popupOverlayRef.current?.hide();
      markerByPlaceIdRef.current.forEach((marker) => marker.setHighlighted(false));
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
    markerByPlaceIdRef.current.forEach((m) =>
      m.setHighlighted(m.getVenue().placeId === activeVenue.placeId),
    );
    if (marker) {
      marker.bounceBriefly();
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
