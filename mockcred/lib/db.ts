import postgres from "postgres";
import { databaseUrl } from "@/lib/env";

/**
 * Shared Postgres client. postgres.js connects lazily on first query, so
 * importing this module never opens a connection at build time.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mockcredSql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__mockcredSql ??
  postgres(databaseUrl(), {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  global.__mockcredSql = sql;
}

/**
 * Run a callback on behalf of a specific user. Opens a transaction, sets the
 * `app.current_user_id` GUC that the RLS policies key on, then runs the
 * callback with the transaction handle. All user-scoped reads/writes must go
 * through here so row-level security is in force.
 */
export async function asUser<T>(
  userId: string,
  fn: (tx: typeof sql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx as unknown as typeof sql);
  }) as Promise<T>;
}

export type Sql = typeof sql;
