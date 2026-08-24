import { getDb } from "../lib/mongodb";
import { ensureIndexes } from "../lib/indexes";

// Creates every index the app relies on. Idempotent and safe to re-run. A
// unique index over a collection that already holds duplicates will fail; that
// is reported per index and exits non-zero, so the duplicates get cleaned up
// rather than the failure passing unnoticed.
async function main() {
  const db = await getDb();
  const results = await ensureIndexes(db);

  for (const r of results) {
    if (r.ok) console.log(`ok    ${r.collection} (${r.keys})`);
    else console.error(`FAIL  ${r.collection} (${r.keys}): ${r.error}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} indexes in place`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
