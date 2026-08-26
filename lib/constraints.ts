import type { Profile } from "./types";

// The runner's standing constraints as one prompt block.
//
// Two profile fields feed it: `trainingContext` (how they train) and
// `zonesSource` (where the zone table came from). They are separate fields
// because they describe different things and render in different places, but
// they reach the model as a single block so no prompt has to know about both,
// and so a future third fact has one obvious place to join.
//
// Returns null when the runner has declared nothing, so the caller can omit the
// section entirely rather than emit an empty heading.
export function describeConstraints(profile: Profile): string | null {
  const parts: string[] = [];
  if (profile.trainingContext?.trim()) parts.push(profile.trainingContext.trim());
  if (profile.zonesSource?.trim()) {
    // The field is a phrase or a sentence depending on who typed it, so only add
    // the full stop when the text doesn't already end in one.
    const source = profile.zonesSource.trim();
    const punctuated = /[.!?]$/.test(source) ? source : `${source}.`;
    parts.push(`Heart-rate zones: ${punctuated}`);
  }
  return parts.length ? parts.join(" ") : null;
}
