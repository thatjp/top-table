import { NYC_PLACES_RECTANGLE } from "@/lib/nyc-map-scope";

const PLACES_BASE = "https://places.googleapis.com/v1";

export function getGoogleMapsServerApiKey(): string | null {
  const k = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return k || null;
}

export type AutocompleteSuggestion = {
  placeId: string;
  description: string;
};

export async function fetchPlacesAutocomplete(
  input: string,
  sessionToken: string,
): Promise<AutocompleteSuggestion[]> {
  const key = getGoogleMapsServerApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat.mainText",
    },
    body: JSON.stringify({
      input: trimmed,
      sessionToken,
      includedRegionCodes: ["us"],
      regionCode: "us",
      locationRestriction: {
        rectangle: NYC_PLACES_RECTANGLE,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places autocomplete failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
        };
      };
    }>;
  };

  const out: AutocompleteSuggestion[] = [];
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId || !p.text?.text) continue;
    const main =
      p.structuredFormat?.mainText?.text?.trim() ||
      p.text.text.split(",")[0]?.trim() ||
      p.text.text;
    out.push({ placeId: p.placeId, description: main });
  }
  return out;
}

export type PlaceDetailsResult = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type SearchTextCandidate = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const key = getGoogleMapsServerApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const id = encodeURIComponent(placeId);
  const res = await fetch(`${PLACES_BASE}/places/${id}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Place details failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Place has no coordinates");
  }

  const displayName = data.displayName?.text?.trim() || data.formattedAddress || "Unknown place";
  const formattedAddress = (data.formattedAddress ?? displayName).trim();

  return {
    placeId: data.id ?? placeId,
    displayName,
    formattedAddress,
    latitude: lat,
    longitude: lng,
  };
}

/** Text search restricted to a geographic rectangle (e.g. NYC), no coordinate seed required. */
export async function searchPlacesByTextInRectangle(args: {
  textQuery: string;
  rectangle: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };
  maxResultCount?: number;
}): Promise<SearchTextCandidate[]> {
  const key = getGoogleMapsServerApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const { textQuery, rectangle, maxResultCount = 5 } = args;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: textQuery.trim(),
      maxResultCount,
      locationRestriction: {
        rectangle: {
          low: rectangle.low,
          high: rectangle.high,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places text search failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const out: SearchTextCandidate[] = [];
  for (const place of data.places ?? []) {
    const plat = place.location?.latitude;
    const plng = place.location?.longitude;
    if (!place.id || typeof plat !== "number" || typeof plng !== "number") continue;
    out.push({
      placeId: place.id,
      displayName: place.displayName?.text?.trim() || "Unknown place",
      formattedAddress: place.formattedAddress?.trim() || "",
      latitude: plat,
      longitude: plng,
    });
  }
  return out;
}

export async function searchPlacesByTextNearCoordinate(args: {
  textQuery: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  maxResultCount?: number;
}): Promise<SearchTextCandidate[]> {
  const key = getGoogleMapsServerApiKey();
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const {
    textQuery,
    latitude,
    longitude,
    radiusMeters = 600,
    maxResultCount = 5,
  } = args;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount,
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places text search failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const out: SearchTextCandidate[] = [];
  for (const place of data.places ?? []) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (!place.id || typeof lat !== "number" || typeof lng !== "number") continue;
    out.push({
      placeId: place.id,
      displayName: place.displayName?.text?.trim() || "Unknown place",
      formattedAddress: place.formattedAddress?.trim() || "",
      latitude: lat,
      longitude: lng,
    });
  }
  return out;
}
