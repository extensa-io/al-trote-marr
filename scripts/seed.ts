import { getDb } from "../lib/mongodb";
import { OWNER, profile, sessions } from "../lib/plan-seed";

async function main() {
  const db = await getDb();

  await db.collection("profile").updateOne(
    { ownerEmail: OWNER },
    { $set: profile },
    { upsert: true }
  );

  await db.collection("sessions").deleteMany({ ownerEmail: OWNER });
  await db.collection("sessions").insertMany(
    sessions.map((s) => ({ ...s, ownerEmail: OWNER, status: "planned" as const }))
  );
  await db
    .collection("sessions")
    .createIndex({ ownerEmail: 1, date: 1 }, { unique: true });

  console.log(`Seeded ${sessions.length} sessions and 1 profile for ${OWNER}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
