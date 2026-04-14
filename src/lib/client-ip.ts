/**
 * Best-effort client IP for rate limiting behind reverse proxies (e.g. Heroku).
 * Prefer the last hop in X-Forwarded-For: clients can prepend spoofed values,
 * while Heroku appends the connecting client IP at the end of the chain.
 */
export function clientIpFromRequest(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
