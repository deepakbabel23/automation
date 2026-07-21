/**
 * Centralized environment access. Import from here instead of reading
 * process.env directly so required-vs-optional is explicit and typo-safe.
 */

export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Postgres connection string (Supabase in prod, local/CI Postgres otherwise). */
export function databaseUrl(): string {
  return required("DATABASE_URL");
}

export const AUTH_PROVIDER = optional("AUTH_PROVIDER", "dev"); // "dev" | "clerk"
export const APP_URL = optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
