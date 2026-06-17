import { getDb } from "./mongodb";
import type { Profile, Session, Status, Actual } from "./types";

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
