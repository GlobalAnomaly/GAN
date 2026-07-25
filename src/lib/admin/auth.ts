/**
 * Admin access gate.
 *
 * A single shared password from ADMIN_PASSWORD, exchanged for a cookie holding
 * a hash of it. Deliberately modest: the admin panel runs on your own machine
 * next to the model, so this is a lock on the door rather than a full identity
 * system. Real per-user roles arrive with Supabase Auth when the panel is
 * deployed and moderators exist.
 *
 * Uses Web Crypto rather than node:crypto so the same code works in middleware,
 * which does not run on the Node runtime.
 */

export const ADMIN_COOKIE = "gan_admin";

/** Bound to this app so the token cannot be reused from another site's cookie. */
const SALT = "global-anomaly-network/admin/v1";

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The value stored in the cookie once a correct password is supplied. */
export async function sessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256(`${SALT}:${password}`);
}

/** Constant-time compare, so a wrong guess reveals nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  // Hashed on both sides so the comparison is over equal-length strings.
  return safeEqual(await sha256(candidate), await sha256(password));
}

export async function isValidSession(
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await sessionToken();
  if (!expected) return false;
  return safeEqual(cookieValue, expected);
}
