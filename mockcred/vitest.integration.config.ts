import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests hit a real Postgres. Run with DATABASE_URL set and the
// schema migrated (CI runs `npm run db:migrate` first). Serialized to avoid
// cross-test interference on shared tables.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
