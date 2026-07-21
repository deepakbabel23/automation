import "./_env";
import { readFileSync } from "node:fs";
import { extname, basename } from "node:path";
import { sql } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";

/**
 * Import an exam file into the database.
 *
 *   npm run import -- <file.html|file.json> [--publish] [--free 1,2,3] [--slug my-slug]
 */
function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const file = positional[0];
  if (!file) {
    console.error("usage: npm run import -- <file.html|file.json> [--publish] [--free 1,2,3] [--slug s]");
    process.exit(1);
  }

  const format = extname(file).toLowerCase() === ".json" ? "json" : "html";
  const source = readFileSync(file, "utf8");
  const exam = parseExamSource(source, format, {
    slug: typeof flags.slug === "string" ? flags.slug : undefined,
  });

  const freeExternalIds =
    typeof flags.free === "string"
      ? flags.free.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n))
      : [];

  const summary = await importExam(exam, {
    freeExternalIds,
    publish: Boolean(flags.publish),
  });

  console.log(`imported ${basename(file)} -> exam "${exam.title}"`);
  console.table(summary);
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
