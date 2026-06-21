import { getDb } from "../lib/mongodb";
import { OWNER, profile, sessions, strengthSessions } from "../lib/plan-seed";

async function main() {
  const db = await getDb();

  await db.collection("profile").updateOne(
    { ownerEmail: OWNER },
    { $set: profile },
    { upsert: true }
  );

  const all = [...sessions, ...strengthSessions];
  await db.collection("sessions").deleteMany({ ownerEmail: OWNER });
  await db.collection("sessions").insertMany(
    all.map((s) => ({ ...s, ownerEmail: OWNER, status: "planned" as const }))
  );
  await db
    .collection("sessions")
    .createIndex({ ownerEmail: 1, date: 1 }, { unique: true });

  console.log(
    `Seeded ${sessions.length} runs + ${strengthSessions.length} strength sessions and 1 profile for ${OWNER}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
