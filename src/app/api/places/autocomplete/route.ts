import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { clientIpFromRequest } from "@/lib/client-ip";
import { rateLimitPlacesAutocompleteAllow } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-origin";
import { searchLocalVenueSuggestions } from "@/lib/venues";

const bodySchema = z.object({
  input: z.string().max(200),
  sessionToken: z.string().min(8).max(200),
});

/** Autocomplete rows returned (database venues only). */
const MAX_SUGGESTIONS = 8;

export async function POST(req: Request) {
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
  if (!rateLimitPlacesAutocompleteAllow(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const suggestions = await searchLocalVenueSuggestions(parsed.data.input, MAX_SUGGESTIONS);
    return NextResponse.json({ suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Places error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
