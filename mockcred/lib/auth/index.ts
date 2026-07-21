import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { AUTH_PROVIDER, APP_URL } from "@/lib/env";
import { SESSION_COOKIE, decodeSession, encodeSession } from "@/lib/auth/session";

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Provider interface (divergence D6). The default `dev` provider is a
 * self-contained signed-cookie session so the app is fully testable offline.
 * `clerk` is the documented production swap; wiring it means reading the Clerk
 * session here and upserting the app_users row, then returning it.
 */

/** Find or create the app_users row for an auth identity. */
export async function upsertUser(
  authId: string,
  email: string | null,
  displayName: string | null = null,
): Promise<SessionUser> {
  const [row] = await sql`
    insert into app_users (auth_id, email, display_name)
    values (${authId}, ${email}, ${displayName})
    on conflict (auth_id) do update set email = excluded.email
    returning id, email, display_name`;
  return { id: row.id, email: row.email, displayName: row.display_name };
}

/** The current user, or null. Safe to call from server components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (AUTH_PROVIDER === "clerk") {
    // Production path: read Clerk's session and map to app_users. Requires
    // @clerk/nextjs and keys — intentionally not wired in the offline MVP.
    throw new Error("AUTH_PROVIDER=clerk is not configured in this build");
  }

  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const [row] = await sql`
    select id, email, display_name from app_users where id = ${session.userId}`;
  if (!row) return null;
  return { id: row.id, email: row.email, displayName: row.display_name };
}

/** Require a user or redirect to sign-in. */
export async function requireUser(returnTo = "/dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Dev-provider login: upsert by email and set the session cookie. */
export async function loginDev(email: string): Promise<SessionUser> {
  const normalized = email.trim().toLowerCase();
  const user = await upsertUser(`dev:${normalized}`, normalized);
  cookies().set(SESSION_COOKIE, encodeSession({ userId: user.id, email: user.email }), {
    httpOnly: true,
    sameSite: "lax",
    // Secure only when actually served over HTTPS, so http://localhost (dev/e2e)
    // still stores the cookie while production stays Secure.
    secure: APP_URL.startsWith("https"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return user;
}

export function logout(): void {
  cookies().delete(SESSION_COOKIE);
}
