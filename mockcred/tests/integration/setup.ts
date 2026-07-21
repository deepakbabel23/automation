// Load .env.local/.env so DATABASE_URL is available before lib/db is imported.
import "../../scripts/_env";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Integration tests require DATABASE_URL (a Postgres connection). " +
      "Start Postgres and run `npm run db:migrate` first.",
  );
}
