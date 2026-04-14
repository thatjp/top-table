import { createHmac, timingSafeEqual } from "crypto";

const HMAC_ALGO = "sha256";

function signingSecret(): string {
  return (
    process.env.QR_TOKEN_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "development-only-qr-secret"
  );
}

/** Token lifetime in seconds (default 7 days). */
function ttlSeconds(): number {
  const n = Number(process.env.QR_TOKEN_TTL_SECONDS ?? 604800);
  return Number.isFinite(n) && n > 60 ? n : 604800;
}

export function createHostToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds();
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac(HMAC_ALGO, signingSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyHostToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = createHmac(HMAC_ALGO, signingSecret())
    .update(payloadB64)
    .digest("base64url");

  try {
    const a = Buffer.from(expectedSig, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let data: { sub?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return { userId: data.sub };
}

export function appOrigin(): string {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function buildQrVerifyUrl(token: string): string {
  return `${appOrigin()}/games/verify?token=${encodeURIComponent(token)}`;
}

/** Join link for a pending session (invite token is stored on `GameSession`). */
export function buildJoinInviteUrl(inviteToken: string): string {
  return `${appOrigin()}/games/join?t=${encodeURIComponent(inviteToken)}`;
}
