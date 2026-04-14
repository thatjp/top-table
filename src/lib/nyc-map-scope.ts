/**
 * Rectangle from Google Places Autocomplete (New) docs — fully encloses New York City.
 * @see https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 */
export const NYC_PLACES_RECTANGLE = {
  low: { latitude: 40.477398, longitude: -74.259087 },
  high: { latitude: 40.91618, longitude: -73.70018 },
} as const;

/** Map / fitBounds helpers (Google Maps uses lat/lng). */
export const NYC_MAP_BOUNDS = {
  south: NYC_PLACES_RECTANGLE.low.latitude,
  west: NYC_PLACES_RECTANGLE.low.longitude,
  north: NYC_PLACES_RECTANGLE.high.latitude,
  east: NYC_PLACES_RECTANGLE.high.longitude,
} as const;

export const NYC_MAP_CENTER = {
  lat: (NYC_MAP_BOUNDS.south + NYC_MAP_BOUNDS.north) / 2,
  lng: (NYC_MAP_BOUNDS.west + NYC_MAP_BOUNDS.east) / 2,
} as const;
