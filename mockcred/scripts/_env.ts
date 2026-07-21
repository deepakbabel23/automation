/**
 * Minimal .env loader for standalone scripts (tsx). The Next.js runtime loads
 * .env files itself; CLI scripts do not, so we load them here. Real env vars
 * already set take precedence. No external dependency.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function load(file: string): void {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Later files do not override earlier ones (local wins).
load(".env.local");
load(".env");
