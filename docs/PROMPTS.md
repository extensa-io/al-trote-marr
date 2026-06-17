# Prompts for Claude Code

Paste these into Claude Code in order, one phase at a time. The kickoff prompt sets context; run it first, then the phase prompts as you go. After each phase, review before moving on.

---

## Kickoff (run once, first)

```
Read CLAUDE.md, docs/ARCHITECTURE.md, docs/DESIGN.md, and docs/ROADMAP.md fully before doing anything. Then summarize back to me: the stack, the hard rules, the data model, and where we are on the roadmap. Do not write any code yet. Confirm you understand that MongoDB uses the native driver only and never Mongoose, that every query is scoped by ownerEmail from the session, and that the UI uses the palette tokens with plain copy and no themed vocabulary.
```

---

## Phase 1 — Logging loop

```
Implement Phase 1 from docs/ROADMAP.md, the logging loop. On the Today screen, add Done and Skipped actions and a quick log form for km, average HR, duration, and notes, wired to PATCH /api/sessions/[date] with optimistic updates. Derive and show pace as m:ss from the logged values. Use the confirmed and signal colors for status. Follow every hard rule in CLAUDE.md and the patterns in docs/DESIGN.md. New data access goes through lib/db.ts. When done, list what you changed and tick the Phase 1 acceptance boxes in docs/ROADMAP.md. Stop for review.
```

---

## Phase 2 — Plan / calendar

```
Implement Phase 2 from docs/ROADMAP.md, the plan and calendar. Add a /plan route listing all sessions grouped by week and phase, each row showing status color and planned km, tappable to open the same log used on Today. Add a jump-to-current-week control and a phase filter, and a bottom tab bar for Today, Plan, and Dashboard. Keep to the data model and design tokens. Reuse the log component from Phase 1, do not duplicate it. When done, summarize changes and tick the Phase 2 acceptance boxes. Stop for review.
```

---

## Phase 3 — Dashboard

```
Implement Phase 3 from docs/ROADMAP.md, the dashboard at /dashboard. Implement every stat exactly as defined in docs/ARCHITECTURE.md, including the guards for the no-data case. Use Recharts for weekly planned-versus-actual volume, cumulative km versus plan, and long-run progression, all readable at 360px. Surface countdown, current phase with progress, overall and 4-week adherence, streak, zone-adherence, and the aerobic-efficiency trend. Add the optional estimated finish last and label it an estimate. Compute stats in a typed module under lib/ with small unit-testable functions; do not bury formulas in components. Summarize changes and tick the Phase 3 boxes. Stop for review.
```

---

## Phase 4 — Polish

```
Implement Phase 4 from docs/ROADMAP.md, polish. Add loading and error states to every data fetch, a /settings page with profile and sign out, and an install hint. Do an accessibility and responsive pass against the quality floor in docs/DESIGN.md: visible keyboard focus, prefers-reduced-motion respected, no breaks from 360px up. Confirm Lighthouse PWA installability passes. Summarize changes and tick the Phase 4 boxes.
```

---

## Handy one-offs

```
Add a second runner: seed a marathon plan. I will give you the runner's email, race date, current fitness, goal, days per week, max HR, and constraints. Build the plan as a new seed in lib/plan-seed (or a sibling module), tagged with their ownerEmail, following the same session shape. Add their email to ALLOWED_EMAILS. Do not touch my plan.
```

```
Review the whole repo against CLAUDE.md and docs/ARCHITECTURE.md and flag any violation: Mongoose or inline Mongo queries, owner values from the client, missing auth checks, themed copy, or formulas that do not match the spec. List findings, fix nothing yet.
```
