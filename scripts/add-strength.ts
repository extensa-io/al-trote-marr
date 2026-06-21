import { getDb } from "../lib/mongodb";
import { OWNER, strengthSessions } from "../lib/plan-seed";
import { todayStr } from "../lib/date";

// Additive and idempotent: inserts a strength session only on dates from today
// onward that have no existing session for the owner. Uses $setOnInsert keyed on
// the unique { ownerEmail, date } index, so it never overwrites a run, a logged
// session, or a strength day that was already added. Safe to re-run.
async function main() {
  const db = await getDb();
  const today = todayStr();
  const upcoming = strengthSessions.filter((s) => s.date >= today);

  let inserted = 0;
  for (const s of upcoming) {
    const res = await db.collection("sessions").updateOne(
      { ownerEmail: OWNER, date: s.date },
      { $setOnInsert: { ...s, ownerEmail: OWNER, status: "planned" as const } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) inserted++;
  }

  console.log(
    `Strength: ${inserted} inserted, ${upcoming.length - inserted} skipped (already had a session) for ${OWNER}, from ${today}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
