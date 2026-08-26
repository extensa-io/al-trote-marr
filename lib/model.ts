import type Anthropic from "@anthropic-ai/sdk";

// Shared response handling for every Anthropic call in the app.
//
// Adaptive thinking spends the same `max_tokens` budget as the visible answer,
// so a response can stop mid-sentence — or mid-JSON-object — and still arrive
// looking like a normal completion. Treating that as an answer is how a raw,
// half-written JSON object ended up stored as a run recap and rendered on the
// home screen. A truncated response is a failed call: throw, let the caller's
// existing error path show a retry, and never persist the fragment.

export class TruncatedResponseError extends Error {
  constructor(feature: string) {
    super(`${feature}: model response hit max_tokens and was cut off`);
    this.name = "TruncatedResponseError";
  }
}

// Concatenate the text blocks of a completed response. `feature` only labels
// the error. Thinking blocks are dropped; only text is returned.
export function responseText(response: Anthropic.Message, feature: string): string {
  if (response.stop_reason === "max_tokens") {
    throw new TruncatedResponseError(feature);
  }

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
