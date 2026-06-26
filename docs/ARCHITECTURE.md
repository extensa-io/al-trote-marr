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

Rescheduling a run changes only its `date` and recomputed `day`; `week` is preserved so plan-week stats stay stable. Only `planned`/`skipped` runs move (never `done`, never `Strength`). Moving onto an empty date is a plain update; onto another movable run it offers a date swap; onto a `done` run or `Strength` it is blocked. Multi-document moves (swap, week-shift) go through a temp-date two-phase transaction in `lib/db.ts` (`moveSessions`) to respect the unique index atomically.

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

## Out of scope (for now)
- Offline support and background sync.
- Garmin or Strava import. The schema leaves room (`actual` could later be auto-filled from a pulled activity), but no integration is built.
- In-app plan generation. Plans arrive as authored seeds.
