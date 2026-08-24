import type { Db } from "mongodb";

// Every index the app relies on, declared in one place. `createIndex` is
// idempotent, so this is safe to re-run. Run it from `npm run ensure-indexes`
// after a deploy or when adding a collection — never from a request path, where
// it would cost a round trip on every write.
const INDEXES: ReadonlyArray<{
  collection: string;
  keys: Record<string, 1>;
  unique: boolean;
}> = [
  { collection: "sessions", keys: { ownerEmail: 1, date: 1 }, unique: true },
  { collection: "profile", keys: { ownerEmail: 1 }, unique: true },
  { collection: "pushSubscriptions", keys: { endpoint: 1 }, unique: true },
  { collection: "dailySummaries", keys: { ownerEmail: 1, date: 1 }, unique: true },
  { collection: "sessionExplanations", keys: { ownerEmail: 1, key: 1 }, unique: true },
];

export interface IndexResult {
  collection: string;
  keys: string;
  ok: boolean;
  error?: string;
}

// Creates each index independently and reports per-index outcomes rather than
// aborting on the first failure: a unique index over data that already contains
// duplicates fails, and that must not stop the remaining indexes from landing.
export async function ensureIndexes(db: Db): Promise<IndexResult[]> {
  const results: IndexResult[] = [];
  for (const spec of INDEXES) {
    const keys = Object.keys(spec.keys).join(" + ");
    try {
      await db.collection(spec.collection).createIndex(spec.keys, { unique: spec.unique });
      results.push({ collection: spec.collection, keys, ok: true });
    } catch (err) {
      results.push({
        collection: spec.collection,
        keys,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
