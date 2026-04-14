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
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
    },
    body: JSON.stringify({
      input: trimmed,
      sessionToken,
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
      };
    }>;
  };

  const out: AutocompleteSuggestion[] = [];
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId || !p.text?.text) continue;
    out.push({ placeId: p.placeId, description: p.text.text });
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
