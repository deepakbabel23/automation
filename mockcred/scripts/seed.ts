import "./_env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";

/**
 * Seed a fresh database with the sample CCAO-F mock and the (currently
 * disabled) commerce products. Idempotent — safe to re-run.
 *
 * Pricing is "free-only for now": products exist so the paywall/entitlement
 * code has something to reference, but they are inactive and $0 so nothing
 * can be charged until real prices are set.
 */
const SAMPLE = "content/samples/CCAOF_Impossible_Mock_01.html";
// A 10-question free sample spread is exposed for the freemium quiz.
const FREE_EXTERNAL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

async function main() {
  const source = readFileSync(resolve(process.cwd(), SAMPLE), "utf8");
  const exam = parseExamSource(source, "html", { slug: "ccao-f-impossible-mock-01" });

  const summary = await importExam(exam, {
    freeExternalIds: FREE_EXTERNAL_IDS,
    publish: true,
  });
  console.log("seeded exam:");
  console.table(summary);

  // Commerce products (disabled / $0 until launch pricing is set).
  await sql`
    insert into products (sku, kind, exam_id, name, currency, price_cents, interval, is_active)
    values (
      ${"ccao-f-pack"}, ${"pack"}, ${summary.examId},
      ${"CCAO-F Practice Pack"}, ${"USD"}, ${0}, ${null}, ${false}
    )
    on conflict (sku) do update set exam_id = excluded.exam_id, name = excluded.name`;

  await sql`
    insert into products (sku, kind, exam_id, name, currency, price_cents, interval, is_active)
    values (
      ${"all-access"}, ${"subscription"}, ${null},
      ${"All-Access Monthly"}, ${"USD"}, ${0}, ${"month"}, ${false}
    )
    on conflict (sku) do update set name = excluded.name`;

  const products = await sql`select sku, kind, is_active, price_cents from products order by sku`;
  console.log("products:");
  console.table(products);

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
