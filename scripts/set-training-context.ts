import { setTrainingContext } from "../lib/db";

// Sets the runner's standing constraints, the free-text facts about how they
// train that change how their numbers should be read. Injected into every AI
// prompt, so it is the place to record something like run/walk easy sessions.
//
//   npm run set-training-context -- nestor@example.com "Easy Z2 runs are …"
//
// Pass an empty string to clear it.
async function main() {
  const [owner, ...rest] = process.argv.slice(2);
  const text = rest.join(" ");

  if (!owner) {
    console.error('usage: npm run set-training-context -- <owner-email> "<text>"');
    process.exit(1);
  }

  const matched = await setTrainingContext(owner.toLowerCase(), text);
  if (!matched) {
    console.error(`no profile found for ${owner}`);
    process.exit(1);
  }

  console.log(text ? `set for ${owner}:\n${text}` : `cleared for ${owner}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
