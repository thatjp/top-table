/**
 * If the browser sent an Origin header, it must match Host (CSRF mitigation for cookie-authenticated mutating requests).
 * Missing Origin (e.g. some scripts, curl) is allowed.
 */
export function originMatchesHost(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
