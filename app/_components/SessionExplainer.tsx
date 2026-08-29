import { getSessionExplanation } from "@/lib/db";
import { explanationKey } from "@/lib/explain";
import SessionExplanation from "./SessionExplanation";
import ExplanationGenerator from "./ExplanationGenerator";
import type { Profile, Session } from "@/lib/types";

interface Props {
  owner: string;
  session: Session;
  profile: Profile;
}

// Reads the cached explanation for a run and renders it, or the client generator
// that produces it on first view. Strength needs no prose, so renders nothing.
export default async function SessionExplainer({ owner, session, profile }: Props) {
  if (session.type === "Strength") return null;

  const cached = await getSessionExplanation(owner, explanationKey(session, profile));
  return cached ? (
    <SessionExplanation text={cached.text} />
  ) : (
    <ExplanationGenerator date={session.date} />
  );
}
