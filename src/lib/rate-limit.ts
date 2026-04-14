/**
 * In-memory rate limits (per Node process). Multiple web dynos do not share state;
 * effective limits scale roughly with instance count. Use Redis etc. if you need a global cap.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

/**
 * Fixed-window limiter (per-process). Returns true if the request is allowed.
 * Each allowed call increments the counter until maxPerWindow is reached.
 */
export function rateLimitAllowInWindow(
  key: string,
  windowMs: number,
  maxPerWindow: number,
): boolean {
  prune();
  const now = Date.now();
  let b = store.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  if (b.count >= maxPerWindow) return false;
  b.count += 1;
  return true;
}

/** QR / PIN session start: per IP+scanner user, 1 min, 20 attempts. */
export function rateLimitGameSessionAllow(key: string): boolean {
  return rateLimitAllowInWindow(`game-session:${key}`, 60_000, 20);
}

/** Host starts a session with email + PIN (unauthenticated POST). */
export function rateLimitGameSessionStartAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`game-session-start:${ip}`, 60_000, 20);
}

/** Guest joins via invite token + email + PIN (unauthenticated POST). */
export function rateLimitGameSessionJoinAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`game-session-join:${ip}`, 60_000, 20);
}

/** Registration: per client IP, 15 min, 10 attempts (counts every POST). */
export function rateLimitRegisterAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`register:${ip}`, 900_000, 10);
}

/** Game PIN change POST: per client IP, 1 min, 15 attempts. */
export function rateLimitPinChangeAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`pin-change:${ip}`, 60_000, 15);
}

/** Places autocomplete proxy: per IP, 1 min, 40 requests. */
export function rateLimitPlacesAutocompleteAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`places-autocomplete:${ip}`, 60_000, 40);
}

/** Places details proxy: per IP, 1 min, 30 requests. */
export function rateLimitPlacesDetailsAllow(ip: string): boolean {
  return rateLimitAllowInWindow(`places-details:${ip}`, 60_000, 30);
}

/** True if this key is in lockout (failed credential attempts >= max). */
export function rateLimitFailuresBlocked(key: string, maxFailures: number): boolean {
  prune();
  const b = store.get(key);
  if (!b || b.resetAt < Date.now()) return false;
  return b.count >= maxFailures;
}

/** Record one failed credential attempt; opens a new window if expired. */
export function rateLimitFailuresRecord(key: string, windowMs: number): void {
  prune();
  const now = Date.now();
  let b = store.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  b.count += 1;
}
