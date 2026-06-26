import { randomUUID } from "crypto";
import { getClient, getDb } from "./mongodb";
import { weekdayShort } from "./date";
import type {
  Profile,
  Session,
  Status,
  Actual,
  PushSubscriptionDoc,
  DailySummary,
} from "./types";

const NO_ID = { projection: { _id: 0 } } as const;

export async function listSessions(owner: string): Promise<Session[]> {
  const db = await getDb();
  return db
    .collection<Session>("sessions")
    .find({ ownerEmail: owner }, NO_ID)
    .sort({ date: 1 })
    .toArray();
}

export async function getSession(owner: string, date: string): Promise<Session | null> {
  const db = await getDb();
  return db.collection<Session>("sessions").findOne({ ownerEmail: owner, date }, NO_ID);
}

export async function getNextSession(owner: string, afterDate: string): Promise<Session | null> {
  const db = await getDb();
  return db
    .collection<Session>("sessions")
    .find({ ownerEmail: owner, date: { $gt: afterDate } }, NO_ID)
    .sort({ date: 1 })
    .limit(1)
    .next();
}

export async function getProfile(owner: string): Promise<Profile | null> {
  const db = await getDb();
  return db.collection<Profile>("profile").findOne({ ownerEmail: owner }, NO_ID);
}

export async function updateSession(
  owner: string,
  date: string,
  patch: { status?: Status; actual?: Actual }
): Promise<Session | null> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.status) set.status = patch.status;
  if (patch.actual) set.actual = patch.actual;
  await db
    .collection<Session>("sessions")
    .updateOne({ ownerEmail: owner, date }, { $set: set });
  return getSession(owner, date);
}

export async function getSessionsInWeek(owner: string, week: number): Promise<Session[]> {
  const db = await getDb();
  return db
    .collection<Session>("sessions")
    .find({ ownerEmail: owner, week }, NO_ID)
    .sort({ date: 1 })
    .toArray();
}

// Move one or more sessions to new dates atomically. The { ownerEmail, date }
// unique index forbids two docs sharing a date mid-write, so each moving doc is
// first parked on a unique temp date, then written to its final date. Wrapped in
// a transaction so a partial failure rolls back. Recomputes `day`, keeps `week`.
export async function moveSessions(
  owner: string,
  moves: { from: string; to: string }[]
): Promise<void> {
  if (moves.length === 0) return;
  const db = await getDb();
  const client = await getClient();
  const coll = db.collection<Session>("sessions");
  const now = new Date().toISOString();
  const staged = moves.map((m) => ({ ...m, temp: `__tmp__${m.from}__${randomUUID()}` }));

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      for (const m of staged) {
        await coll.updateOne(
          { ownerEmail: owner, date: m.from },
          { $set: { date: m.temp } },
          { session }
        );
      }
      for (const m of staged) {
        await coll.updateOne(
          { ownerEmail: owner, date: m.temp },
          { $set: { date: m.to, day: weekdayShort(m.to), updatedAt: now } },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }
}

// --- Push subscriptions ---

export async function savePushSubscription(
  owner: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const db = await getDb();
  const coll = db.collection<PushSubscriptionDoc>("pushSubscriptions");
  await coll.createIndex({ endpoint: 1 }, { unique: true });
  await coll.updateOne(
    { endpoint: sub.endpoint },
    {
      $set: { ownerEmail: owner, keys: sub.keys },
      $setOnInsert: { endpoint: sub.endpoint, createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );
}

export async function deletePushSubscription(owner: string, endpoint: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<PushSubscriptionDoc>("pushSubscriptions")
    .deleteOne({ ownerEmail: owner, endpoint });
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const db = await getDb();
  await db.collection<PushSubscriptionDoc>("pushSubscriptions").deleteOne({ endpoint });
}

export async function listPushSubscriptions(owner: string): Promise<PushSubscriptionDoc[]> {
  const db = await getDb();
  return db
    .collection<PushSubscriptionDoc>("pushSubscriptions")
    .find({ ownerEmail: owner }, { projection: { _id: 0 } })
    .toArray();
}

export async function listAllPushSubscriptions(): Promise<PushSubscriptionDoc[]> {
  const db = await getDb();
  return db
    .collection<PushSubscriptionDoc>("pushSubscriptions")
    .find({}, { projection: { _id: 0 } })
    .toArray();
}

export async function getDailySummary(
  owner: string,
  date: string
): Promise<DailySummary | null> {
  const db = await getDb();
  return db
    .collection<DailySummary>("dailySummaries")
    .findOne({ ownerEmail: owner, date }, NO_ID);
}

export async function upsertDailySummary(summary: DailySummary): Promise<void> {
  const db = await getDb();
  await db
    .collection<DailySummary>("dailySummaries")
    .updateOne(
      { ownerEmail: summary.ownerEmail, date: summary.date },
      { $set: summary },
      { upsert: true }
    );
}
