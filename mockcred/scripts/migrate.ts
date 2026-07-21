import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { databaseUrl } from "@/lib/env";

/**
 * Apply pending SQL migrations from db/migrations in filename order.
 * Idempotent: each file is recorded in schema_migrations and skipped if applied.
 */
async function main() {
  const sql = postgres(databaseUrl(), { max: 1 });
  const dir = resolve(process.cwd(), "db/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  try {
    await sql`create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )`;

    for (const file of files) {
      const done = await sql`select 1 from schema_migrations where filename = ${file}`;
      if (done.length > 0) {
        console.log(`= skip ${file}`);
        continue;
      }
      const contents = readFileSync(resolve(dir, file), "utf8");
      await sql.unsafe(contents);
      await sql`insert into schema_migrations (filename) values (${file})`;
      console.log(`+ applied ${file}`);
    }
    console.log("migrations up to date");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
