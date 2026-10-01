import { getDb } from "../lib/mongodb";
import { ensureIndexes } from "../lib/indexes";
import {
  OWNER,
  profile,
  extensionSessions,
  extensionStrengthSessions,
  EXTENSION_START,
} from "../lib/plan-seed";

async function main() {
  const db = await getDb();

  await db.collection("profile").updateOne(
    { ownerEmail: OWNER },
    { $set: profile },
    { upsert: true }
  );

  // The extension is additive and only clears unlogged future prescriptions on
  // its window. Historical sessions, including logged sessions from October,
  // are never deleted or rewritten when the plan is re-seeded.
  await db.collection("sessions").deleteMany({
    ownerEmail: OWNER,
    date: { $gte: EXTENSION_START },
    status: { $ne: "done" },
  });

  const extension = [...extensionSessions, ...extensionStrengthSessions];
  let inserted = 0;
  for (const s of extension) {
    const result = await db.collection("sessions").updateOne(
      { ownerEmail: OWNER, date: s.date },
      { $setOnInsert: { ...s, ownerEmail: OWNER, status: "planned" as const } },
      { upsert: true }
    );
    inserted += result.upsertedCount;
  }
  await ensureIndexes(db);

  console.log(
    `Preserved the existing plan; ${inserted} extension sessions inserted from ${EXTENSION_START} and 1 profile for ${OWNER}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
