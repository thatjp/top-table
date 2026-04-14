import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { fetchPlaceDetails, getGoogleMapsServerApiKey } from "@/lib/google-places-server";
import { rateLimitPlacesDetailsAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";

const querySchema = z.object({
  placeId: z.string().min(3).max(400),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.validated) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!originMatchesHost(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimitPlacesDetailsAllow(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!getGoogleMapsServerApiKey()) {
    return NextResponse.json({ error: "Places search is not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const placeIdRaw = url.searchParams.get("placeId") ?? "";
  const parsed = querySchema.safeParse({ placeId: placeIdRaw });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
  }

  try {
    const place = await fetchPlaceDetails(parsed.data.placeId);
    return NextResponse.json({
      placeId: place.placeId,
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Places error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
