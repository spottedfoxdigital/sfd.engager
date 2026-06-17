// Lightweight shared-password auth for the small team (everyone gets the same
// access, per the agreed plan). A signed, expiring cookie — no external auth
// dependency. This is intentionally simple for the slice; a later phase can
// swap in Auth.js with per-user accounts without touching the UI.

const COOKIE_NAME = "sfd_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
}

const encoder = new TextEncoder();

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("hex");
}

/** Create a signed `exp.signature` token. */
export async function createToken(): Promise<string> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const sig = await hmac(String(exp));
  return `${exp}.${sig}`;
}

/** Verify a token's signature and expiry. */
export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(expStr);
  // constant-time-ish compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export const AUTH_COOKIE = COOKIE_NAME;
export const AUTH_MAX_AGE = MAX_AGE_SECONDS;

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "change-me";
  return input === expected;
}
