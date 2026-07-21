import postgres from "postgres";
import { databaseUrl } from "@/lib/env";

/**
 * Shared Postgres client, created LAZILY on first use. Importing this module
 * never opens a connection or reads DATABASE_URL, so `next build` (which imports
 * route modules but does not query) works without a database configured.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mockcredSql: ReturnType<typeof postgres> | undefined;
}

function instance(): ReturnType<typeof postgres> {
  if (!global.__mockcredSql) {
    global.__mockcredSql = postgres(databaseUrl(), {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idle_timeout: 20,
    });
  }
  return global.__mockcredSql;
}

// A callable proxy that forwards tagged-template calls and property access to
// the lazily-created postgres client.
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply(_target, _thisArg, args: unknown[]) {
    // @ts-expect-error postgres() is variadic (template tag or helper call)
    return instance()(...args);
  },
  get(_target, prop: string | symbol) {
    const client = instance() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

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
