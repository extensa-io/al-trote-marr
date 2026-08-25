# Al Trote Marr! — Claude Code working notes

Personal multi-tenant running training tracker.

**Read `CONTEXT.md` at the project root before writing any code.** It is the single authoritative reference for this app: goals and non-goals, architecture, data model, business rules, workflows, conventions, the full API and action inventory, the design system, an operational runbook, the rules every change must follow, and the known drift. Unbuilt scope lives in `BACKLOG.md`.

Code that contradicts `CONTEXT.md` is drift: flag it, don't copy it.

## Where to look

| Need                                                                | `CONTEXT.md` section |
|---------------------------------------------------------------------|----------------------|
| What this app is and deliberately isn't                             | 1                    |
| Module map, entry points, why things are built this way             | 2                    |
| Collections, fields, embedding choices, validation                  | 3                    |
| How a workflow actually runs, end to end                            | 4                    |
| Stack versions, naming, error handling, what's inconsistent         | 5                    |
| Every endpoint and server action                                    | 6                    |
| Tenancy, cron, integrations, session states, design system, runbook | 7                    |
| **The rules any change must satisfy**                               | **8**                |
| Known drift and open questions                                      | 9                    |

## Maintaining these files

Rules belong in `CONTEXT.md`, not here. This file is deliberately thin: it used to restate the stack, the hard rules, the design rules, the commands, and a file map, all of which `CONTEXT.md` now covers in more detail. That duplication drifted immediately: within a day of `CONTEXT.md` being written, this file was still telling agents to gate handlers with `await auth()` while the codebase had moved to `currentOwner()` in `lib/owner.ts`. Two copies of a rule means one of them is eventually wrong, so keep one.

Add a rule to `CONTEXT.md` section 8. Update `CONTEXT.md` in the same change as the code, per its own Process rules.
