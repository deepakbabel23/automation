import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed-cookie sessions. The cookie value is
 *   base64url(payloadJSON) + "." + base64url(hmacSHA256(payload))
 * so it cannot be forged without AUTH_SESSION_SECRET.
 */
export interface SessionPayload {
  userId: string;
  email: string | null;
}

function secret(): string {
  return process.env.AUTH_SESSION_SECRET || "dev-secret-change-me";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);
  const expectedSig = sign(payloadB64);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (typeof parsed?.userId !== "string") return null;
    return { userId: parsed.userId, email: parsed.email ?? null };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "mc_session";
