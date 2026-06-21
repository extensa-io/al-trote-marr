import { getDb } from "../lib/mongodb";
import {
  LILO_OWNER,
  liloProfile,
  liloSessions,
  liloStrengthSessions,
} from "../lib/plan-seed-lilo";
import { todayStr } from "../lib/date";

// Loads Lilo's plan. Additive and idempotent: upserts her profile and inserts
// runs + strength only on dates from today onward that she has no session for
// ($setOnInsert on the unique { ownerEmail, date } index). Owner-scoped, so it
// never touches Néstor's data, and safe to re-run.
async function main() {
  const db = await getDb();
  const today = todayStr();

  await db
    .collection("profile")
    .updateOne({ ownerEmail: LILO_OWNER }, { $set: liloProfile }, { upsert: true });

  await db
    .collection("sessions")
    .createIndex({ ownerEmail: 1, date: 1 }, { unique: true });

  const upcoming = [...liloSessions, ...liloStrengthSessions].filter((s) => s.date >= today);

  let inserted = 0;
  for (const s of upcoming) {
    const res = await db.collection("sessions").updateOne(
      { ownerEmail: LILO_OWNER, date: s.date },
      { $setOnInsert: { ...s, ownerEmail: LILO_OWNER, status: "planned" as const } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) inserted++;
  }

  console.log(
    `Lilo: profile upserted; ${inserted} sessions inserted, ${upcoming.length - inserted} skipped (already present), from ${today}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
