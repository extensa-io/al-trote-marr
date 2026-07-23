# Architecture

## Overview

One Next.js app on Vercel. Server components and route handlers read and write MongoDB Atlas through the native driver. Auth.js handles Google sign-in and gates access to an allowlist. Every document is owned by a single user via `ownerEmail`, so the same deployment can hold multiple runners and multiple plans without them seeing each other.

## Data model

Two collections, both scoped by `ownerEmail`.

### sessions
One document per training session.

| field | type | notes |
|---|---|---|
| ownerEmail | string | lowercased email of the runner |
| week | number | 1..N |
| date | string | `YYYY-MM-DD`, unique per owner |
| day | string | Mon..Sun |
| phase | "Base" \| "Build" \| "Peak" \| "Taper" | |
| type | string | Easy, Quality, Long, Kickoff, Shakeout, Race |
| title | string | the prescription |
| zone | string | target HR zone label, e.g. "Z2", "Z3", "Z2-Z3" |
| plannedKm | number | estimate for time-based runs, exact for long runs |
| status | "planned" \| "done" \| "skipped" | |
| actual | object \| absent | `{ km, avgHr, durationMin, weightKg, notes }`; `weightKg` is optional body weight in kg, `durationMin` doubles as time spent on Strength |
| updatedAt | string | ISO timestamp |

Unique index: `{ ownerEmail: 1, date: 1 }`.

Rescheduling changes only a session's `date` and recomputed `day`; `week` is preserved so plan-week stats stay stable. A run is moved from its card. Moving onto an empty date is a plain update; onto any other `planned`/`skipped` session (run **or** strength) it offers a swap, the run taking the target day and the occupant taking the run's vacated date (runs have priority); only an already-`done` session can't be displaced. The week-shift control slides the whole week: every `planned`/`skipped` session that week, runs and strength, moves by the delta together, so a free day in the week absorbs the shift; it blocks only when a moving session would land on a stationary session outside the shift (a `done` day or one in an adjacent week). Multi-document moves go through a temp-date two-phase transaction in `lib/db.ts` (`moveSessions`) to respect the unique index atomically.

### profile
One document per runner.

`{ ownerEmail, raceName, raceDate, goal, baseline, maxHr, vo2, goalPaceSecPerKm, zones }`
where `zones` is an array of `{ z, name, min, max }` covering Z1..Z5.

## Auth and multi-tenancy

Auth.js v5 with the Google provider and JWT sessions. The `signIn` callback rejects any email not in `ALLOWED_EMAILS`. There is no auth database adapter; sessions are JWTs. The owner for every query is `session.user.email.toLowerCase()`, never a client-supplied value. An allowed user with no `profile` document is valid and should see an empty state.

## API surface

All handlers check `await auth()` and return 401 without a session email. Responses strip `_id`.

- `GET /api/sessions` — all sessions for the owner, sorted by date
- `GET /api/sessions/[date]` — one session
- `PATCH /api/sessions/[date]` — body `{ status?, actual? }`, validates status, returns the updated doc
- `GET /api/profile` — the owner's profile, 404 if none

Add new endpoints only when a screen needs server work that a server component cannot do directly. Prefer reading in server components via `lib/db.ts`.

## Screens

- **Today** (`/`): the day's session as the focus, with one-tap Done or Skipped and a quick log. Rest days and pre-start show the next session.
- **Plan** (`/plan`): every session grouped by week and phase, each tappable to view, log, or edit. Jump to the current week, filter by phase.
- **Dashboard** (`/dashboard`): the stats below, with charts.
- **Settings** (`/settings`): profile view and sign out.

## Pace and units

Everything is metric. Pace is derived, never stored: `paceSecPerKm = (actual.durationMin * 60) / actual.km`. Display as `m:ss`. Goal pace lives in `profile.goalPaceSecPerKm`.

## Stat definitions

Compute these from the owner's sessions and profile. "Due" means `date <= today` in `America/Toronto`. All guards return 0 or empty rather than dividing by zero.

- **daysToRace**: whole days from today to `raceDate`. **weeksToRace**: `ceil(daysToRace / 7)`.
- **currentPhase**: the `phase` of the most recent session with `date <= today`; before the plan starts, the first session's phase.
- **phaseProgress**: among sessions in `currentPhase`, the fraction with `date <= today`.
- **adherenceOverall**: `done / due`, where `due` counts sessions with `date <= today` and `done` counts those with `status === "done"`. Skipped counts against it.
- **adherence4wk**: the same ratio restricted to sessions dated within the last 28 days.
- **streak**: order due sessions by date descending, count consecutive leading `done`, stop at the first session that is not `done`. A past `planned` or `skipped` breaks it.
- **weeklyVolume**: per week, `planned = sum(plannedKm)` and `actual = sum(actual.km)` over logged sessions.
- **cumulativeKm**: running totals over date order, planned versus actual.
- **longRunProgression**: sessions where `type` is "Long" or "Race", planned versus actual km by week.
- **zoneAdherence** (aerobic discipline): among logged easy-type runs (type Easy, Long, Kickoff, or Shakeout) with `actual.avgHr` present, the share where `actual.avgHr <= zones.find(z => z.z === 2).max`. This measures staying aerobic on easy days.
- **aerobicEfficiency** (fitness trend): for each logged easy-type run with km, durationMin, and avgHr, `efficiency = (actual.km * 1000 / (actual.durationMin * 60)) / actual.avgHr` in metres per second per beat. Plot by date; a rising trend means the aerobic engine is improving. Needs several data points before it reads meaningfully.
- **weightTrend**: logged sessions (run or strength) with `actual.weightKg`, ordered by date, plotted as a line in kg. Needs at least two points to render a trend.
- **estimatedFinish** (optional, phase 3 stretch): a rough projection from the most recent logged Quality or goal-pace session pace, scaled to 21.1 km, shown only once at least one such run is logged and clearly labelled an estimate. Do not over-engineer; segment-level splits are out of scope.

## Daily reminder (web push)

An opt-in 7:00 AM `America/Toronto` notification with the day's session and a one-line journey summary. A push-only service worker (`public/sw.js`) receives the push; it never caches. Users opt in from `/settings`, which subscribes through `PushManager` and stores the subscription in a third owner-scoped collection, `pushSubscriptions` (`{ ownerEmail, endpoint, keys, createdAt }`, unique index on `endpoint`), via `lib/db.ts`. `POST /api/push/subscribe` and `/api/push/unsubscribe` are auth-checked like every other route.

Delivery is a Vercel Cron job (`vercel.json`) that hits `/api/cron/daily-notify` hourly. That route is the one machine-to-machine exception to the `auth()` rule: it has no session, so it is gated by a `CRON_SECRET` bearer token instead. It sends only on the run where the Toronto local hour equals `NOTIFY_HOUR` (default 7), which keeps delivery at 7 AM exactly across DST. For each owner with a subscription it builds the message from that owner's own sessions and profile (`lib/notify.ts`), sends with `web-push` (`lib/push.ts`), and prunes any endpoint returning 404/410. VAPID keys live in env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, plus `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the client).

## Home-screen note and recap (AI)

The slot below "Next Session" on the home page holds one AI-written card per day, stored in a fourth owner-scoped collection, `dailySummaries`, keyed by `{ ownerEmail, date }`. A doc carries a `kind`: a `daily` progress note or a run `recap`. Both are generated with the Anthropic SDK (`claude-opus-4-8`, adaptive thinking) and never accept a client-supplied owner.

The `daily` note is the morning retrospective written by the cron (`generateAndStoreSummary` in `lib/summary.ts`), idempotent per date. The `recap` replaces it the moment a run is logged: when the home page renders and today's run is `done` but no recap matches the run's `updatedAt`, it mounts a small client component (`RecapGenerator`) that calls the `generateRecap` server action (`app/actions/recap.ts` → `generateAndStoreRecap` in `lib/recap.ts`), shows a "Writing recap…" placeholder, and the action's `revalidatePath("/")` swaps in the finished card (`RunRecap`). The recap holds `text` plus `insights[]` and `suggestions[]`, returned by the model as strict JSON. Editing the run bumps `updatedAt`, which makes the stored recap stale and triggers a fresh one; the next morning's cron note overwrites the day's doc. Because both shapes share the `(ownerEmail, date)` key, `upsertDailySummary` uses `replaceOne` so each write fully clears the other shape's fields.

## Plan rebuild (AI)

Plans still arrive as authored seeds, but once running a plan can drift from the runner's real fitness. The **Rebuild plan** control on `/plan` re-scales the remainder of the plan to what the runner has actually been doing, without touching history or the race.

The engine lives in `lib/rebuild.ts` and follows the same shape as the recap and explanation code: assemble an owner-scoped data context, call Claude (`claude-opus-4-8`, adaptive thinking), then validate before use. The context grounds the model in the fixed race, the runner's real longest completed run, recent logged weekly volume, adherence, recent long runs, and the exact upcoming dates to rewrite. The model returns strict JSON, one workout per date.

Anchors that never move: the race date, the 21.1 km race distance, the goal, the run days themselves (only the prescription on each existing date changes), the `week` numbering, and every session that is past, done, Strength, or the Race. The rebuild only rewrites run sessions dated after today that are not yet done.

It is a two-step, preview-then-apply flow. `previewRebuild` generates a proposal and returns it without writing; the client shows the proposed long-run progression. `applyRebuild` re-derives the expected future dates server-side and validates the proposal against them (`coerceProposal`) before writing, so a stale or tampered proposal is rejected or reduced to the owner's own upcoming runs. AI owns the distances and prescriptions; the validator only enforces the envelope (valid JSON, full coverage of the expected dates, allowed types and phases, non-negative km). The write is a single owner-scoped `bulkWrite` in `rebuildFutureSessions` (`lib/db.ts`) whose per-doc filter also refuses any done, Strength, or Race session as a second line of defence. `previewPlanRebuild` and `applyPlanRebuild` (`app/actions/rebuild.ts`) are auth-checked like every other action and revalidate `/`, `/plan`, and `/dashboard`.

## Out of scope (for now)
- Offline support and background sync.
- Garmin or Strava import. The schema leaves room (`actual` could later be auto-filled from a pulled activity), but no integration is built.
- Generating a plan from nothing. The rebuild re-scales an existing plan's upcoming sessions; it does not author a plan where none exists, change the race, or move run days.
