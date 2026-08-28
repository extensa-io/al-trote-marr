# CONTEXT.md — Al Trote Marr!

**This file is the single authoritative reference for how this app works and how it must be built going forward.** It is a rulebook, not a description. Code that contradicts it is drift and must be flagged, not copied. `CLAUDE.md` is the short operating brief for agents and must agree with this file; where they diverge, this file wins.

Everything below was derived by reading the implementation. It supersedes the former `docs/` folder (`ARCHITECTURE.md`, `DESIGN.md`, `ROADMAP.md`, `PROMPTS.md`) entirely — the durable content from those files now lives here: the data model and stat formulas in sections 3-4, the design system in 7.5, setup and runner-onboarding procedures in 7.6. Forward-looking scope that has no code yet lives in `BACKLOG.md`. Do not resurrect `docs/` or cite it as a source.

---

## 1. App Goals & Non-Goals

### What it is

A personal, multi-tenant half-marathon training tracker for a tiny fixed set of runners (currently two: `nestor.daza@gmail.com` and `lilo.ayala@gmail.com`, per `lib/allowlist.ts` and `.env.example`). Each runner has one authored 17-week plan seeded into MongoDB, sees the day's prescribed session, logs what they actually did, and gets stats, charts, AI coaching prose, and a daily push reminder.

The problem it solves: replacing a spreadsheet training plan with a phone-first app that (a) shows only what matters today, (b) captures a run in a handful of taps, (c) computes adherence and aerobic-fitness trends from the logged data, and (d) uses an LLM to explain prescriptions, recap runs, and re-scale the plan when authored volume outruns real fitness.

### Users

Allowlisted Google accounts only. There is no signup, no invite flow, no role model, no admin. Adding a runner means editing `ALLOWED_EMAILS` and writing a new seed module (see `lib/plan-seed-lilo.ts` and `scripts/seed-lilo.ts` for the established pattern).

### Non-goals (all evidenced in code)

- **No offline support, no caching service worker.** `public/sw.js` handles only `push` and `notificationclick`; it has no `fetch` handler and never touches `caches`. This is stated as a hard rule in `CLAUDE.md` and enforced by the file itself.
- **No ODM.** MongoDB native driver only (`lib/mongodb.ts`, `lib/db.ts`). No Mongoose anywhere; no Atlas Data API.
- **No self-service onboarding or plan authoring from scratch.** Plans arrive as TypeScript seed modules run by a script. The AI rebuild only re-scales existing future sessions; it cannot create sessions, move run days, or change the race.
- **No server-side schema validation in MongoDB.** No JSON Schema validators, no migrations directory. Shape is enforced only by TypeScript and `lib/validation.ts`.
- **No test suite.** There is no test runner, no test files, no test script in `package.json`. Correctness is enforced by `tsc` (strict), ESLint, and manual review per roadmap phase.
- **No Strava / Garmin import.** Specced in `BACKLOG.md`, zero code exists. `actual` has no provenance field yet.
- **No user-editable profile.** `GET /api/profile` is read-only; profiles are written by seed scripts only.
- **No pagination, search, or sharing between runners.** Every read loads the owner's whole plan (~50-140 docs) and filters in memory.
- **No i18n.** All UI copy is English, despite the Spanish app name.

---

## 2. Architecture & Module Map

### Shape

A single Next.js 16 App Router monolith deployed on Vercel. There is no separate API service, no queue, no cache layer, no worker process. Data access is a thin owner-scoped repository module over the native MongoDB driver.

Three ways code runs:

1. **Server Components** — the default. Pages call `auth()`, then read through `lib/db.ts` directly. This is the preferred path; route handlers exist only where a client needs to POST.
2. **Server Actions** (`app/actions/*.ts`) — all mutations initiated from the UI.
3. **Route handlers** (`app/api/**`) — the JSON API, the push subscribe/unsubscribe endpoints (called by `fetch` from a client component), the Vercel cron entry point, and two dev-only endpoints.

The client/server split is deliberate: everything that reads is a server component; everything interactive is a `"use client"` leaf that calls a server action and relies on `revalidatePath` to re-render the server tree.

### Directory map

| Path | Responsibility |
|---|---|
| `auth.ts` | Auth.js v5 config: Google provider, JWT sessions, allowlist gate in the `signIn` callback. Exports `handlers`, `auth`, `signIn`, `signOut`. |
| `lib/mongodb.ts` | Cached `MongoClient` promise on `globalThis`. Lazy connect, never at module scope. Poisoned-promise eviction on failure. |
| `lib/db.ts` | **The only place Mongo queries live.** Every function takes `owner` as its first argument and scopes the filter by `ownerEmail`. |
| `lib/owner.ts` | **The only definition of the tenant key.** `currentOwner()` for route handlers and actions, `requireOwner()` (redirects) for server components, `unauthorized()` for the standard 401. |
| `lib/indexes.ts` | Every index the app relies on, declared once. Applied by `npm run ensure-indexes`, never from a request path. |
| `lib/types.ts` | All persisted document interfaces plus `Phase`/`Status` unions. |
| `lib/date.ts` | `YYYY-MM-DD` string calendar math, all `America/Toronto` / UTC-pinned. |
| `lib/validation.ts` | Input coercion and range checks for `status` and `actual`. Returns a `ValidationResult<T>` discriminated union, never throws. |
| `lib/pace.ts` | Duration entry (digit-stream conversion) and pace formatting. Pace is always derived, never stored. |
| `lib/prescription.ts` | Parses prescription strings/labels: zone label → bpm range, strides count from a title. |
| `lib/stats.ts` | Every dashboard formula as a pure function over `Session[]` + `Profile`. No I/O, no React. |
| `lib/notify.ts` | Builds the push notification `{title, body}` from stats. Pure. |
| `lib/push.ts` | `server-only`. VAPID configuration and `web-push` send, with expired-endpoint detection. |
| `lib/constraints.ts` | Composes `profile.trainingContext` + `profile.zonesSource` into the one `Runner's standing constraints:` block every AI prompt injects. |
| `lib/model.ts` | Shared Anthropic response handling: `responseText(response, feature)` concatenates the text blocks and throws `TruncatedResponseError` when `stop_reason === "max_tokens"`. Used by all four AI features. |
| `lib/summary.ts` / `lib/recap.ts` / `lib/explain.ts` / `lib/rebuild.ts` | The four AI features. Each follows the same three-layer shape: `buildXPrompt` (pure), `generateX` (Anthropic call), `generateAndStoreX` / `getOrCreateX` (owner-scoped orchestration + persistence). |
| `lib/plan-seed.ts` | Néstor's plan: profile, run sessions, and a generated strength schedule. Exports `generateStrengthSessions` for reuse. |
| `lib/plan-seed-lilo.ts` | Lilo's plan, reusing `generateStrengthSessions` from the primary seed. |
| `lib/useReducedMotion.ts` | `useSyncExternalStore` hook over `prefers-reduced-motion`. |
| `app/page.tsx`, `app/plan/**`, `app/dashboard`, `app/settings`, `app/signin` | The five screens. Each is an async server component that redirects to `/signin` without a session. |
| `app/_components/**` | Shared UI. `dashboard/` holds the Recharts cards and `chart-theme.ts`. |
| `app/actions/**` | Server actions: `sessions.ts` (log/status/reschedule/shift), `recap.ts`, `explain.ts`, `rebuild.ts`. |
| `app/api/**` | Route handlers. |
| `scripts/*.ts` | One-shot Node scripts run via `tsx` with `--env-file=.env.local`. |
| `CONTEXT.md` / `BACKLOG.md` | The rulebook and the unbuilt-scope list. There is no `docs/` folder; it was superseded by these two. |

### Entry points

- **Web**: `app/layout.tsx` → the five routes above.
- **Cron**: `GET /api/cron/daily-notify`, scheduled by `vercel.json` at `0 11 * * *` and `0 12 * * *` (both UTC hours that can be 7:00 AM Toronto). An hour gate in the handler lets exactly one through. This is the only scheduled job.
- **CLI**: `npm run ensure-indexes`, `npm run seed`, `npm run seed-lilo`, `npm run add-strength`.
- **Service worker**: `public/sw.js`, registered on demand by `DailyReminderToggle`, never by the app shell.

### Architectural decisions worth preserving

- **Lazy Mongo connect** (`lib/mongodb.ts`): connecting at module scope on serverless caused requests that never query to freeze mid-handshake and leak unawaited rejections. Connect inside the accessor, 5s server-selection and connect timeouts, and evict the cached promise on rejection so a poisoned slot doesn't outlive one failure.
- **`ownerEmail` as the tenancy key** rather than a user table: no auth DB adapter, sessions are JWTs, and the owner is always `session.user.email.toLowerCase()`. There is no user collection to join against.
- **Dates as `YYYY-MM-DD` strings** with lexicographic comparison. Every calendar operation pins to UTC midnight or formats through `Intl` with an explicit `timeZone`. This avoids Date-object timezone drift entirely and makes `$gt`/`$lte` on `date` correct in Mongo.
- **AI outputs are cached documents, not live calls on render.** Summaries and recaps are keyed by `(ownerEmail, date)`; explanations are keyed by a content hash so identical workouts across 17 weeks generate once. Idempotency is the billing control.
- **Preview-then-apply for the rebuild**, with server-side re-derivation of the expected dates. The client's proposal is never trusted; `coerceProposal` plus a restrictive `bulkWrite` filter are two independent lines of defence.
- **Push before AI in the cron**: the function has a `maxDuration` budget and per-runner model calls have no timeout, so the time-critical notification ships first and summary generation is best-effort.

---

## 3. Data Models & Schemas

Database: `process.env.MONGODB_DB` (default `altrotemarr`). Five collections, **all** scoped by `ownerEmail`. All reads project `_id` out (`NO_ID` in `lib/db.ts`).

### `sessions`

One document per training session (run or strength). Type: `Session` in `lib/types.ts`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `ownerEmail` | string | yes | Lowercased email. Never client-supplied. |
| `week` | number | yes | 1..17. Preserved across reschedules. |
| `date` | string | yes | `YYYY-MM-DD`. Unique per owner. |
| `day` | string | yes | `Mon`..`Sun`. Recomputed by `weekdayShort()` on move. |
| `phase` | `"Base"\|"Build"\|"Peak"\|"Taper"` | yes | |
| `type` | string | yes | Open string. In practice: `Easy`, `Quality`, `Long`, `Kickoff`, `Shakeout`, `Race`, `Strength`. |
| `title` | string | yes | The human prescription, e.g. `"WU, 2x8 min Z3 (3 min jog), CD"`. |
| `zone` | string | yes | HR zone label: `"Z2"`, `"Z2-Z3"`, `""` for Strength. |
| `plannedKm` | number | yes | `0` for Strength. |
| `exercises` | `StrengthExercise[]` | no | Strength only. `{ name, detail }`. |
| `status` | `"planned"\|"done"\|"skipped"` | yes | Seeded as `planned`. |
| `actual` | `Actual` | no | `{ km?, avgHr?, durationMin?, weightKg?, notes?, testEffort? }`. |
| `updatedAt` | string | no | ISO timestamp. Absent until first write. Doubles as the recap staleness key. |

**Index:** `{ ownerEmail: 1, date: 1 }` unique. Created idempotently by `scripts/seed.ts`, `scripts/seed-lilo.ts`, and `scripts/add-strength.ts`.

**`actual.testEffort`** marks the run as a deliberate fitness test rather than the prescribed session. It is stored only when `true` (an absent flag and an explicit `false` mean the same thing). It lives on `actual`, not on `Session.type`, because it describes what was *run*, not what was *planned*: the runner decides at log time, no session type or title has to be editable, and the rebuild's protected-type list stays untouched. What it changes is entirely in `lib/stats.ts` — see `isTestEffort` in the stat rules.

**Modelling choice:** `actual` is embedded, not referenced. There is exactly one log per session, always read with the session, never queried independently — embedding is correct and the document stays tiny. `exercises` is likewise a bounded (5-8 item) embedded array on strength days only. `zones` is embedded in `profile` for the same reason.

**Denormalization:** `day`, `week`, and `phase` are all derivable from `date` plus plan constants, but are stored because every read path groups and filters on them without wanting to recompute. The cost is that `moveSessions` must recompute `day` (it does) and deliberately does *not* recompute `week` (plan-week stats must stay stable).

### `profile`

One document per runner. Type: `Profile`.

`{ ownerEmail, raceName, raceDate (YYYY-MM-DD), goal, baseline, maxHr, vo2, goalPaceSecPerKm, zones: Zone[], trainingContext?, zonesSource? }`, where `Zone` is `{ z, name, min, max }` covering Z1..Z5.

**`trainingContext` and `zonesSource`** are the two optional free-text fields that tell the AI surfaces how to read this runner's numbers. Both are per-runner, never global, and both are composed into one `Runner's standing constraints:` prompt block by `describeConstraints` in `lib/constraints.ts`, so no prompt has to know about either field individually.

- `trainingContext`: standing facts about **how this runner trains**, in their own words, where the fact changes what a metric means. Any such fact qualifies. The first two in use: easy Z2 runs done as run/walk intervals, which makes average pace on those runs a function of the walk ratio rather than of fitness, and the Z2 ceiling being a real physiological constraint rather than a discipline target.
- `zonesSource`: **where the zone table came from**, in a line (a device, a lab test, a formula). Separate from `trainingContext` because provenance describes the `zones` array rather than the training, and it renders beside that table on `/settings`. A boundary observed on a device is a different kind of fact from one a formula produced, and nothing else in the schema records which it is.

The prompts are told that a metric one of these explains is not a fitness signal. Both are edited in the **How your numbers are read** section of `/settings` (`ContextEditor` → `saveProfileContext` → `setProfileContext`), which is the only supported write path: a script existed first and was removed once the UI landed, because two write paths for one field is the drift this document warns about elsewhere. Saving affects future generations only; recaps already stored are not rewritten.

No unique index is created on `profile`. Writes are `updateOne({ownerEmail}, {$set}, {upsert:true})` from seed scripts, plus `setProfileContext` for the two free-text context fields. Everything else on the profile — race, goal, goal pace, max HR, the zone table — is seed-only and has no editor.

### `pushSubscriptions`

`{ ownerEmail, endpoint, keys: { p256dh, auth }, createdAt }`. **Index:** `{ endpoint: 1 }` unique, declared in `lib/indexes.ts`.

The endpoint is the natural key (one device = one endpoint), so upsert is keyed on `endpoint` alone with `ownerEmail` in the `$set` — re-subscribing on a device that changed owners reassigns it rather than duplicating.

### `dailySummaries`

Keyed `(ownerEmail, date)`. **Two shapes share one key**, distinguished by `kind`:

| Field | `kind: "daily"` | `kind: "recap"` |
|---|---|---|
| `text` | the morning progress note | the recap paragraph |
| `insights[]` | absent | 2-4 short phrases |
| `suggestions[]` | absent | 1-3 pointers |
| `runUpdatedAt` | absent | the session's `updatedAt` at generation time (staleness key) |
| `model`, `createdAt` | both | both |

**Index:** `{ ownerEmail: 1, date: 1 }` unique, declared in `lib/indexes.ts`.

`kind` absent means a `daily` note written before recaps existed. Writes go through `upsertDailySummary`, which uses **`replaceOne`, not `$set`**, precisely so switching shapes clears the other shape's fields.

### `sessionExplanations`

`{ ownerEmail, key, text, model, createdAt }`. `key` is `sha1(type|zone|title|plannedKm).slice(0,16)` from `explanationKey()`. Content-addressed on purpose: the ~15 distinct workouts across a 17-week plan generate once and are reused on every recurrence. Editing any of those four fields yields a new key and a fresh explanation; the old row is orphaned (harmless, never collected).

**Index:** `{ ownerEmail: 1, key: 1 }` unique, declared in `lib/indexes.ts`.

### Validation rules actually enforced

Only in `lib/validation.ts`, applied by `PATCH /api/sessions/[date]` and by the `markStatus`/`logActual` server actions:

- `status` ∈ `["planned","done","skipped"]`.
- `km` > 0; `durationMin` > 0; `avgHr` ∈ [30, 230]; `weightKg` ∈ [30, 300]; `notes` ≤ 500 chars, trimmed.
- `validateProfileContext`: `trainingContext` ≤ 1000 chars, `zonesSource` ≤ 500, both trimmed. Here an empty string means **clear the field**, not "omitted" — the opposite of `validateActual` — so `setProfileContext` `$unset`s it and the document never stores an empty value.
- `testEffort` accepts `true` / `"true"` (stored) and `false` / `"false"` / empty (omitted); anything else is rejected. Never stored as `false`.
- Empty string / `null` / `undefined` means "field omitted", not "invalid".
- Numeric strings are accepted and coerced (`asFiniteNumber`), because form inputs send strings.

Everything else — `type`, `zone`, `title`, `plannedKm`, `phase`, `week`, `day` — is unvalidated on write except through the rebuild path, where `coerceProposal` enforces `type ∈ {Easy, Quality, Long, Shakeout}`, `phase ∈ {Base, Build, Peak, Taper}`, non-empty title, string zone, and finite `plannedKm ≥ 0`.

### Schema inconsistencies and dead fields

- `profile.vo2` and `profile.baseline` are stored and displayed on `/settings`, but feed no calculation.
- `Actual.durationMin` is overloaded: minutes-run for runs, minutes-spent for strength. Both go into the same field under different UI labels, but they now share one parser and one input control.
- `Session.type` is an unconstrained `string` while `phase` and `status` are unions. Type-based behaviour is scattered across `Set` literals: `EASY_TYPES` in `stats.ts`, `REWRITE_TYPES` in `rebuild.ts`, `STRENGTH_TYPE` in `plan-seed.ts`, plus inline `!== "Strength"` checks in at least six files.

---

## 4. Business Rules & Workflows

### Sign-in

`app/signin/page.tsx` → `signIn("google", { redirectTo: "/" })` → Auth.js `signIn` callback in `auth.ts` → `isAllowed(profile.email)` against `ALLOWED_EMAILS` (lowercased, comma-split). Rejection returns `false`, which Auth.js renders as an access-denied error. Sessions are JWTs; there is no adapter and no session collection.

Every protected page repeats the same three lines: `await auth()`, `redirect("/signin")` when there's no `session.user.email`, then `const owner = session.user.email.toLowerCase()`.

### Logging a run

1. `SessionDetail` (client) collects km, avg HR, duration, weight, notes, and a **Test effort** checkbox. Duration comes from the shared `DurationField`: a digit stream read right to left, so `2845` is 28:45 and `12832` is 1:28:32. A mobile numeric keypad exposes no colon, and a minutes-only field would force the runner to convert an hour-plus run by hand; digits-only avoids both.
2. `useOptimistic` applies the patch immediately; `logActual(date, input)` runs in a transition.
3. The action re-derives `owner` from the session, validates via `validateActual`, and calls `updateSession(owner, date, { status: "done", actual })`.
4. `updateSession` always sets `updatedAt` to now, `$set`s only the provided keys, and re-reads the doc to return it.
5. `revalidateAll(date)` revalidates `/`, `/plan`, `/plan/[date]`.
6. On the home page's next render, today's run is `done` and no recap matches its `updatedAt`, so `RecapGenerator` mounts and fires the recap flow (below).

**Test effort.** Ticking the box sets `actual.testEffort`, which makes the run anchor the speed-based race projection and drop out of every easy-run metric. It exists because a plan of Z2-capped run/walk sessions gives no read on race fitness: the speed basis had never once fired, so every projection came off a single long run. The card shows a "Test effort" label on a logged run so the flag is visible after the fact, and the recap prompt is told to judge the run as a benchmark rather than against the prescription.

**Rule:** re-logging or changing the status of an already-`done` session prompts a `window.confirm` first (both `SessionDetail` and `StrengthDetail`). Client-side guard only; the server permits it.

### Rescheduling one run — `rescheduleRun`

Rules, in the order they are checked:
- Target date must match `/^\d{4}-\d{2}-\d{2}$/` and differ from the source.
- Strength sessions cannot be moved individually.
- Only `planned` or `skipped` sessions can move (`MOVABLE`). A `done` session is immovable.
- Empty target → plain move.
- Occupied target → return a `conflict` with `swappable = MOVABLE.has(target.status)`. The client confirms, then re-calls with `{ swap: true }`, and the two sessions exchange dates. **Runs take priority**: a planned/skipped strength session on the target day yields.
- A `done` occupant can never be displaced.

`week` is preserved; `day` is recomputed.

### Shifting a whole week — `shiftWeek`

Every `planned`/`skipped` session in that `week` (runs *and* strength) moves by ±1 day together. A landing date that belongs to another mover is fine. A landing date occupied by a stationary session — a logged day, or any session in an adjacent week — aborts the whole shift with an explanatory message naming the date and the blocker.

### Atomic multi-document moves — `moveSessions`

The unique `{ownerEmail, date}` index forbids two docs sharing a date even transiently, so moves are two-phase inside a transaction: park every mover on `__tmp__<from>__<uuid>`, then write each to its final date with a recomputed `day` and a fresh `updatedAt`. `session.endSession()` in a `finally`.

### Daily cron — `GET /api/cron/daily-notify`

Invoked twice a day, at 11:00 and 12:00 UTC. Gated by `Authorization: Bearer ${CRON_SECRET}`; a missing `CRON_SECRET` env var fails closed (401). This is the **only** handler that does not call `auth()`.

0. **Hour gate.** Cron schedules are UTC, so no single daily entry holds a fixed local time across DST. Both UTC hours that can be 7:00 AM Toronto are scheduled, and the run whose `torontoHour()` does not equal `NOTIFY_HOUR` (default 7) returns `{ ok: true, skipped: true, localHour, notifyHour }` having done nothing. Two invocations, one send, correct year-round.
1. Load all push subscriptions (across all owners), group by `ownerEmail`.
2. Per owner: load sessions + profile once, build the message with `buildDailyMessage`, send to each of that owner's endpoints. 404/410 → delete that endpoint and count it as pruned.
3. VAPID misconfiguration throws from `configure()` before anything sends; that is caught and surfaced in the response body as `push.error` rather than a 500.
4. Then, per allowlisted email, `generateAndStoreSummary(owner, today)` — idempotent per date, so a retry within the day reuses the stored note. Per-owner failures are caught and recorded as `"error"`.

Response: `{ ok, date, push: { recipients, sent, pruned, error? }, summaries: Record<email, outcome> }`.

**Rule:** the push must stay first. The comment in the file is load-bearing — summary generation is unbounded and can exhaust `maxDuration`.

### Daily note (`kind: "daily"`)

`buildSummaryPrompt` builds a plain-text data context, deliberately using `cutoff = today - 1` for every backward-looking metric: it's a morning retrospective, so counting today's un-run session as "due but not done" would drag adherence, zero the streak, and make the current week look short. Today's session is stated on its own line and drives the countdown. Returns `null` when nothing is due yet.

Strength sessions are excluded from the running note entirely.

### Run recap (`kind: "recap"`)

Triggered by render, not by the write. `app/page.tsx` computes `recapFresh = summary.kind === "recap" && summary.runUpdatedAt === todayRun.updatedAt`. When today's run is `done` and the recap isn't fresh, it renders `RecapGenerator`, which fires `generateRecap(date)` on mount (guarded by a `useRef` against React's dev double-invoke) and shows a placeholder until `revalidatePath("/")` swaps in `RunRecap`.

`generateAndStoreRecap` refuses non-runs, missing sessions, and anything not `done`. It short-circuits to `"exists"` when a stored recap's `runUpdatedAt` matches. The response shape is enforced by the API, not requested in prose: `output_config.format` carries `RECAP_SCHEMA` as a `json_schema`, so a reply that isn't the recap object cannot come back. Array item counts ("2 to 4 insights") stay in the prompt because the schema subset doesn't support them, and `additionalProperties: false` plus a complete `required` list are mandatory. The parse below is kept as defence for the cases a schema can't cover: a refusal, a `max_tokens` truncation, or an empty `recap` string.

`parseRecap` strips a possible code fence, pulls the first *balanced* JSON object out of the response with `extractJsonObject` (brace-counting that skips braces inside strings and honours escapes), and returns `null` for anything that isn't an object with a non-empty `recap` string, which makes `generateRecap` throw. Tolerant about what surrounds the object, strict about the object itself: a "Here is the recap:" preamble cost a whole generation before the extractor existed. A parse failure carries the first 300 characters of the response into the error message, because a log saying only that parsing failed gives nothing to fix. **There is no plain-text fallback, deliberately:** the original one stored the whole raw response as the recap text, so a single truncated reply put a raw JSON object on the home screen, and the `runUpdatedAt` idempotency key kept serving it. A failed parse is now a failed call — nothing is written and the UI offers a retry.

**The prompt's `DERIVED CONTEXT` block is the point of the feature.** The card above the recap already shows distance, duration, pace, heart rate, and the zone target, so a recap built from the logged row alone can only restate them — which is what it did, producing notes like "you covered 5.54 km at 9:35/km and kept your heart rate inside the Z2 target." `buildRecapPrompt` therefore appends computed figures the model cannot derive reliably on its own: pace delta versus recent same-type runs, the same-type efficiency trend, 7/28-day load and its ratio, the longest run to date, and both race projections against goal pace. `SYSTEM_PROMPT` forbids stating this run's distance, duration, pace, or heart rate as a bare fact and requires every insight to carry a comparison, a trend, or a projection. When adding a figure to the prompt, add the derived form, not the raw one.

The prompt also carries a `Projection movement since the last logged run` line, because each recap is generated in isolation and without it the loudest standing figure (an unchanged race projection) gets presented as news every day. A projection that moved less than 30 seconds is labelled "not news" and the prompt tells the model to lead with what did move.

For the same reason the prompt carries an `ALREADY TOLD THE RUNNER` section: `generateAndStoreRecap` reads the recap stored for the previous logged run and passes it to `buildRecapPrompt` (which stays pure, taking it as an argument). Standing facts may be referred to once as context but must not lead or fill more than one insight. Without it, five consecutive recaps all opened with the same unchanged projection and the same long-run gap.

`RunRecap` carries a `RecapRewriteButton` (client) that calls `generateRecap(date, { force: true })`, bypassing the `runUpdatedAt` check. It is the only way to replace a stored recap without editing the logged run, and it re-bills one model call per press.

Recaps are visible on any past day's `/plan/[date]`, not just today.

### Session explanation

`SessionExplainer` (server) computes `explanationKey(session)` and looks it up. Hit → render the prose. Miss → render `ExplanationGenerator` (client), which fires `explainSession(date)` on mount, same placeholder-then-revalidate pattern. Strength sessions render nothing — the exercise list is already explicit.

### Plan rebuild

Two steps, both auth-checked server actions.

`previewPlanRebuild` → `previewRebuild(owner)`: derives `futureRunSessions` = `date > today && type !== "Strength" && type !== "Race" && status !== "done"`, builds a context grounded in the fixed race, the runner's **actual longest completed run**, recent logged weekly volume, adherence, and recent long runs, then asks the model for one workout per expected date. Nothing is written. The client shows the proposed long-run ramp.

`applyPlanRebuild(proposal)` → `applyRebuild(owner, proposal)`: **re-derives the expected dates server-side**, runs `coerceProposal` against them (every expected date must be present and well-formed; unknown dates are dropped; any bad field rejects the whole proposal), then `rebuildFutureSessions` issues one `bulkWrite` whose per-doc filter is `{ ownerEmail, date, type: { $nin: ["Strength","Race"] }, status: { $ne: "done" } }`.

**Rule — the anchors that never move:** race date, race distance, goal, the run days themselves, `week` numbering, and every session that is past, `done`, Strength, or the Race. Only `type`, `title`, `zone`, `plannedKm`, `phase`, and `updatedAt` change.

### Stat rules (`lib/stats.ts`)

- Strength sessions are excluded from every running metric (`isRunSession`).
- "Due" = `date <= today`, string comparison in `America/Toronto`.
- `adherence*`: `done / due`; a past `skipped` counts against you.
- `streak`: due sessions descending, count leading `done`, stop at the first non-`done`.
- `adherence4wk`: inclusive 28-day window, `shiftDays(today, -27)`.
- `zoneAdherence`: among `done` runs of type Easy/Long/Kickoff/Shakeout with `avgHr`, the share with `avgHr <= Z2.max`. `null` when there's no Z2 or no data.
- `aerobicEfficiency`: `(km*1000 / (durationMin*60)) / avgHr`, m/s per bpm, same easy-type filter, needs all three fields.
- `raceProjections`: Riegel scaling, `T2 = T1 × (D2/D1)^1.06`, to `RACE_DISTANCE_KM` (21.0975). Returns up to two projections from the 42 days ending `asOf` — `"speed"` from a `Quality` or `/goal pace/i` run of ≥3 km, `"endurance"` from a `Long` run of ≥8 km — picking the fastest projected finish per basis. **Flat pace extrapolation is not used anywhere:** it ignores that pace decays with distance, so it flattered a 6 km tempo into a race time the runner has no evidence for. The two bases normally disagree and the gap is the point: fast speed projection with a slow endurance one means distance, not turnover, is the limiter. Both surfaces (dashboard card, recap prompt) read this one function.
- `paceVsRecentSameType`: this run's pace against the mean and best of the last 5 `done` runs of the same type. Negative delta is faster.
- `efficiencyTrend`: this run's `aerobicEfficiency` against the mean of the previous 6 runs **of the same type**. Same-type only because pooling a 5 km easy run with a 14 km long run makes the comparison swing on window composition rather than fitness — `aerobicEfficiency` itself still pools easy types for the dashboard trend line.
- `rollingVolume`: `done` km in the inclusive 7- and 28-day windows ending `date`, plus the acute-to-chronic ratio (7-day vs the 28-day weekly average). Above ~1.5 is a fast ramp.
- `longestCompletedRun`: furthest single `done` run on or before `date`.
- `isTestEffort` (`actual.testEffort === true`): a deliberate hard run logged to measure fitness. **Included** in the `"speed"` projection basis whatever the session's type, and **excluded** from `zoneAdherence`, `aerobicEfficiency`, `efficiencyTrend`, `paceVsRecentSameType` (both the run itself and the prior pool), and the `"endurance"` basis. Still counted by `adherence*`, `streak`, `weeklyVolume`, `rollingVolume`, `cumulativeKm`, and `longestCompletedRun`. The exclusions exist because a maximal effort otherwise reads as broken zone discipline or a collapse in aerobic efficiency; the endurance exclusion exists because that basis extrapolates from an aerobic pace, and a hard effort would inflate it into a projection with no aerobic evidence behind it.
- `MIN_COMPARABLE_KM` (1 km): below this a logged session is a marker, not a run (a travel day ticked off, a walk, an abandoned start). Excluded from `aerobicEfficiency`, `paceVsRecentSameType`, and `efficiencyTrend`, because comparing a one-minute log to real runs produces confident nonsense. It still counts as `done` for adherence and volume, and the recap prompt says explicitly that such a log is a marker.
- `cumulativeKm` emits `actual: null` until the first logged run, so the chart line starts where data starts rather than at zero.
- Every function returns `0`, `null`, or `[]` rather than dividing by zero.

### Error-handling patterns

- **Server actions never throw to the client.** They return `{ ok: false, error }` (or a `conflict` variant), logging the real cause with `console.error`. The rationale, repeated in comments: the client can offer a retry instead of spinning.
- **Route handlers** return `Response.json({ error }, { status })` with lowercase messages: `401 unauthorized`, `400` validation messages, `404 not found` / `no plan`, `409` for "no subscription on this device".
- **AI library functions throw**; their orchestrators or callers catch. A response whose `stop_reason` is `max_tokens` counts as a failure, not an answer: `responseText` in `lib/model.ts` throws on it, so a half-written note, paragraph, or JSON object is never stored.
- **Dev-only routes** (`/api/dev/*`) return 404 when `NODE_ENV === "production"` — checked before `auth()`.
- **Pages** use `notFound()` for a bad date or missing session, and `redirect("/signin")` for no session. `app/error.tsx` shows `error.digest` when present, the raw message otherwise.

---

## 5. Coding Conventions & Tech Stack

### Stack

| | |
|---|---|
| Runtime | Node.js `24.x`, pinned in `engines` and `.nvmrc`; scripts need Node 22+ for `--env-file`. Pinned to the major, not an open floor, so Vercel's runtime matches `.nvmrc` instead of drifting on its own; 24 is Vercel's current default LTS and what production already ran |
| Framework | Next.js `^16.0.0`, App Router, React `^19` |
| Language | TypeScript `^5.7`, `strict: true`, `noEmit`, `@/*` → repo root |
| Database | MongoDB Atlas via `mongodb` `^7.6` (native driver only) |
| Auth | `next-auth` `5.0.0-beta.31`, Google provider, JWT sessions |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`; tokens in `@theme` in `app/globals.css` |
| Charts | `recharts` `^2.15` |
| AI | `@anthropic-ai/sdk` `^0.105`, model `claude-opus-4-8` everywhere |
| Push | `web-push` `^3.6` |
| Lint | ESLint 9 flat config: `eslint-config-next` + core-web-vitals + typescript |
| Scripts | `tsx` |

The table gives declared ranges. As resolved in `package-lock.json` on 2026-08-28: `next` 16.2.9, `react`/`react-dom` 19.2.7, `mongodb` 7.6.0, `typescript` 5.9.3, `eslint` 9.39.4, `eslint-config-next` 16.2.9. ESLint stays on 9.x deliberately: `eslint-config-next@16` bundles `eslint-plugin-import` and `eslint-plugin-jsx-a11y`, both capped at `eslint ^9`, so moving to 10 installs with unmet peers. There is no adapter in the tree — auth uses JWT sessions and never touches Mongo — so the `@auth/mongodb-adapter` `mongodb ^6` peer constraint does not apply here and no `overrides` block is needed.

Fonts: `Space_Grotesk` (display), `Inter` (body), `JetBrains_Mono` (mono), wired as CSS variables in `app/layout.tsx`.

### Conventions this repo actually follows

**Files and naming**
- Components: `PascalCase.tsx`, default export, co-located under `app/_components/` (shared) or `app/<route>/_components/` (route-scoped).
- Library modules: `kebab-or-single-word.ts` in `lib/`, named exports only.
- Dashboard cards live in `app/_components/dashboard/` and take a single `data` prop of a type imported from `lib/stats.ts`.
- Route-level `loading.tsx` exists for `/`, `/plan`, `/plan/[date]`, `/dashboard`, `/settings`, built from the shared `Skeleton`.

**Data access**
- Every `lib/db.ts` function signature is `(owner: string, ...)`, and every filter includes `ownerEmail: owner`. No exceptions. `listAllPushSubscriptions()` is the single unscoped read, used only by the cron.
- Projection `{ _id: 0 }` on every read.
- Reads in server components; mutations in server actions; route handlers only where a client must POST.

**Auth**
- One helper module, `lib/owner.ts`, defines the tenant key. Route handlers and server actions call `currentOwner()`; handlers return `unauthorized()` and actions return `{ ok: false, error: "unauthorized" }`. Server components that need nothing but the owner call `requireOwner()`, which redirects to `/signin`.
- `app/page.tsx` and `app/settings/page.tsx` still call `auth()` directly because they render the user's name; they lowercase the email themselves.
- `/api/cron/daily-notify` is the sole handler with no session; it checks a bearer secret instead.

**Types**
- Discriminated unions for outcomes everywhere: `ValidationResult<T>`, `ActionResult`, `RescheduleResult`, `ExplainOutcome`, `PreviewOutcome`, `ApplyOutcome`, `SummaryOutcome`, `RecapOutcome`.
- Interfaces for object shapes, `type` for unions.
- `ReadonlyArray<T>` for module-level constant lists; `Set` for membership tests.
- Zero `any` in the codebase. Unknown input is typed `unknown` and narrowed.

**React**
- `"use client"` only on leaves that need interaction. Client components import server actions directly.
- `useOptimistic` + `useTransition` for mutations; local `error` state rendered in `signal` colour.
- `useSyncExternalStore` for browser-media/storage subscriptions (`useReducedMotion`, `InstallHint`).
- Duration is entered only through `app/_components/DurationField.tsx`, shared by the run and strength forms. It holds raw digits; conversion lives in `lib/pace.ts`. Never hand-roll a duration input.
- Charts take `isAnimationActive={!useReducedMotion()}`.
- Every interactive element carries `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass`.

**Styling**
- Only the nine palette tokens from `app/globals.css`. The one duplication is `chart-theme.ts`, which mirrors the hexes because Recharts SVG can't read CSS variables — it says so in a comment.
- `.eyebrow` for all uppercase micro-labels.
- Mobile-first, `max-w-md mx-auto px-5 py-8` on every page main.
- Mono font for every number.

**Comments**
- Non-obvious decisions carry a "why" comment above the function. This is a strong, consistent habit (`lib/mongodb.ts`, `moveSessions`, `rebuildFutureSessions`, `upsertDailySummary`, the cron ordering, the duration digit stream, the summary cutoff). Preserve it.

**AI feature shape** — every one of the four follows it:
1. `export const X_MODEL = "claude-opus-4-8"`.
2. A `SYSTEM_PROMPT` const that always ends with the same voice clause: plain, warm, coach-like, no hype, no emoji, **never military/drill/boot-camp vocabulary**, no markdown.
3. A pure `buildXPrompt(...)` that assembles a plain-text data context and returns `string | null`.
4. `generateX(...)`: `new Anthropic()`, `thinking: { type: "adaptive" }`, `output_config: { effort: ... }`, filter `content` to text blocks, join, trim.
5. JSON responses go through an `unfence()` helper and a tolerant parser.
6. `generateAndStoreX` / `getOrCreateX`: owner-scoped, idempotent, returns a string-union outcome.

**Testing**: none. Formulas are deliberately isolated into small pure functions in `lib/` so they *could* be unit-tested, but no tests were ever written. Keep new formulas pure and out of components regardless.

### Inconsistencies to resolve (not to imitate)

2. **Two mutation paths for the same write.** `PATCH /api/sessions/[date]` and the `logActual`/`markStatus` actions both validate and call `updateSession`. The UI uses only the actions; the route handler is unused by any client in this repo.
3. **`inputClass`, `Field`, and `Row` are defined twice**, identically, in `SessionDetail.tsx` and `StrengthDetail.tsx`.
4. **Two "is this a run?" idioms**: `isRunSession()` in `stats.ts` vs inline `s.type !== "Strength"` in `summary.ts`, `recap.ts`, `explain.ts`, `rebuild.ts`, `page.tsx`.
5. **Native `window.confirm`** for destructive confirmations, inside otherwise fully designed components.
6. **Two date-formatting locales**: `formatNiceDate` uses `en-US`, `formatDayShort` uses `en-GB`, both for short weekday+date. Different output for the same intent.
7. **Reduced motion handled four ways**: the `useReducedMotion` hook, the `motion-reduce:` Tailwind variant (`Skeleton`), a raw `matchMedia` call (`ScrollToCurrentWeek`), and a global `@media` block in `globals.css`.

---

## 6. API / Endpoint Inventory

All handlers except the cron begin with `currentOwner()` from `lib/owner.ts` and return `unauthorized()` — `401 {"error":"unauthorized"}` — without a session email. All responses are JSON with `_id` stripped. There is no response envelope: success returns the bare resource or `{ ok: true, ... }`; failure returns `{ error: string }`.

### Internal (browser → same origin)

| Method | Path | Purpose | Request | Response | Auth |
|---|---|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js handlers | — | — | public |
| GET | `/api/sessions` | All the owner's sessions, date ascending | — | `Session[]` | session |
| GET | `/api/sessions/[date]` | One session | — | `Session` / 404 `not found` | session |
| PATCH | `/api/sessions/[date]` | Update status and/or actual | `{ status?, actual? }` | updated `Session`; 400 with a validation message | session |
| GET | `/api/profile` | The owner's profile | — | `Profile`; 404 `no plan` | session |
| POST | `/api/push/subscribe` | Store a push subscription | `{ endpoint, keys: { p256dh, auth } }` | `{ ok: true }`; 400 `invalid subscription` | session |
| POST | `/api/push/unsubscribe` | Remove one endpoint | `{ endpoint }` | `{ ok: true }`; 400 `missing endpoint` | session |

Currently only the two push endpoints are called from app code (`DailyReminderToggle`). `/api/sessions*` and `/api/profile` are a stable read API with no in-repo consumer.

### External / machine

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/cron/daily-notify` | Vercel Cron, 09:00 UTC daily: send push reminders, then generate each runner's daily note | `Authorization: Bearer $CRON_SECRET`. `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 60`. |

### Dev-only (404 in production, checked before auth)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/dev/notify` | Send today's reminder to the signed-in user's devices now. 409 if no subscription on this device. |
| POST | `/api/dev/summary` | Force-regenerate today's summary for the signed-in runner. |
| POST | `/api/dev/recap` | Force-regenerate recaps for past logged runs: `?dates=YYYY-MM-DD,…` or `?last=N` (default 1, max 10 dates). Sequential, one model call per date, replaces whatever is stored. |

### Server actions (the real mutation surface)

| Action | File | Returns |
|---|---|---|
| `markStatus(date, status)` | `actions/sessions.ts` | `ActionResult` |
| `logActual(date, input)` | `actions/sessions.ts` | `ActionResult` (sets status `done`) |
| `rescheduleRun(from, to, { swap? })` | `actions/sessions.ts` | `RescheduleResult` (may carry a `conflict`) |
| `shiftWeek(week, deltaDays)` | `actions/sessions.ts` | `ShiftResult` |
| `saveProfileContext({ trainingContext?, zonesSource? })` | `actions/profile.ts` | `ProfileContextResult` |
| `generateRecap(date, { force? })` | `actions/recap.ts` | `RecapActionResult` (`force` re-bills, bypassing the `runUpdatedAt` check) |
| `explainSession(date)` | `actions/explain.ts` | `ExplainActionResult` |
| `previewPlanRebuild()` | `actions/rebuild.ts` | `PreviewResult` (no writes) |
| `applyPlanRebuild(proposal)` | `actions/rebuild.ts` | `ApplyResult` |

Inline sign-out and sign-in actions live in `app/settings/page.tsx` and `app/signin/page.tsx`.

---

## 7. App-Specific Additions

Six structural elements aren't covered by sections 1-6 and are load-bearing here.

### 7.1 Multi-tenancy model

- **Tenant key:** `ownerEmail`, always `session.user.email.toLowerCase()`. Never a parameter, a header, a body field, or a query string.
- **Gate:** `ALLOWED_EMAILS` (comma-separated, lowercased, trimmed) checked in the Auth.js `signIn` callback. `lib/allowlist.ts` has a hardcoded default fallback listing both current runners — if the env var is missing in production, those two still get in.
- **Isolation:** enforced only by every `lib/db.ts` filter carrying `ownerEmail`. There is no per-tenant database, no row-level security, no middleware. A missing `ownerEmail` in one new query silently breaks isolation for every runner.
- **The one unscoped read:** `listAllPushSubscriptions()`, used solely by the cron, which then regroups by owner and loads each plan separately.
- **The cron's owner list** comes from `ALLOWED_EMAILS`, not from the database — a runner removed from the allowlist stops getting notes even if their data remains.
- **An allowlisted user with no `profile` is valid** and must render an empty state, not an error. `/`, `/plan`, `/dashboard`, and `/settings` all have one.
- **Seeds are per-owner and additive.** `scripts/seed.ts` is destructive for Néstor only (`deleteMany` scoped to `OWNER`). `seed-lilo.ts` and `add-strength.ts` use `$setOnInsert` upserts on the unique key and only touch dates `>= today`, so they never clobber logged history.

### 7.2 Scheduled job inventory

| Job | Schedule | Entry | Auth | Retry |
|---|---|---|---|---|
| Daily notify + summaries | `0 11 * * *` and `0 12 * * *` (UTC) — `vercel.json` | `GET /api/cron/daily-notify` | `CRON_SECRET` bearer | None. Idempotent per date, so a manual re-hit is safe: the summary short-circuits to `"exists"` and the push simply re-sends. |

There are no queues, no workers, no background jobs, no retry policies.

**Why two entries for one daily job.** Cron schedules are UTC and Toronto observes DST, so a single daily entry drifts an hour twice a year. Scheduling both candidate UTC hours and gating on `torontoHour() === NOTIFY_HOUR` pins the send to 7:00 AM local year-round at the cost of one extra no-op invocation per day. This is cheaper than the hourly-cron-plus-gate alternative the Pro plan would also allow (2 invocations/day rather than 24) and works on any plan tier.

**Known tolerance.** Vercel may fire a cron a few minutes late. A run that slips across an hour boundary can make the gate skip both invocations (no reminder that day) or pass both (two sends). A double send is harmless — the notification carries `tag: "daily-reminder"`, so the second replaces the first in the tray rather than stacking. There is no delivery ledger; nothing depends on exactly-once.

### 7.3 Third-party integrations and failure behaviour

| Service | Used by | Failure mode |
|---|---|---|
| **MongoDB Atlas** | everything | 5s server-selection/connect timeouts; a failed connect evicts the cached promise so the next request retries rather than re-awaiting a poisoned slot. Errors bubble to `app/error.tsx`. |
| **Google OAuth** (Auth.js) | sign-in | Non-allowlisted email → `signIn` returns `false` → Auth.js error page. |
| **Anthropic API** | summary, recap, explanation, rebuild | Library functions throw. Cron catches per owner and records `"error"`. Server actions catch and return `{ ok: false }`; the UI shows a "Try again" affordance. **No retries, no timeout, no fallback model.** A truncated response (`stop_reason: "max_tokens"`) throws. Malformed JSON throws (recap) or yields `null` (rebuild → `"no-data"`); nothing degraded is ever stored. |
| **Web Push (VAPID)** | daily reminder | `configure()` throws once if any VAPID var is missing; the cron catches it and reports `push.error` in the body. Per-send 404/410 prunes the endpoint. Any other send error is counted as not-sent and silently dropped. `normalizeSubject` coerces a bare email to `mailto:`. |
| **Vercel Cron** | the daily job | No delivery guarantee is assumed; nothing depends on exactly-once. |

### 7.4 Session state machine

States: `planned` (seeded) → `done` | `skipped`, with free movement back to `planned`.

| From | To | Allowed by | Notes |
|---|---|---|---|
| `planned` | `done` | Log form, or "Mark done" in the kebab menu | Logging always sets `done`. |
| `planned` | `skipped` | "Skip" (rendered destructive) | |
| `done` | anything | Kebab menu / re-log | Client `window.confirm` required. |
| `skipped` | `done` \| `planned` | Kebab menu | `skipped` sessions can still be rescheduled. |

State drives behaviour well beyond colour:

- **Movable** = `planned` or `skipped` (`MOVABLE`). `done` is pinned in time.
- **Rebuildable** = `status !== "done"` and `date > today` and `type ∉ {Strength, Race}`.
- **Recap-eligible** = `done`, a run, with a matching `runUpdatedAt`.
- **Counts as due** = `date <= today`, regardless of status; `skipped` counts against adherence and breaks the streak.
- **Feeds charts** = `done` plus the relevant `actual` fields present.

Colour mapping is fixed: `brass` = planned/today, `confirmed` = done, `signal` = skipped/destructive.

### 7.5 Design system

The visual direction is deliberate and narrow: a clean, minimal, mobile-first running app carried by one warm olive palette and good typography. There is no theme, no motif, and no themed vocabulary. Spend restraint everywhere.

**Palette.** The nine tokens in the `@theme` block of `app/globals.css` are the complete palette. Nothing outside this table may be introduced.

| Token | Hex | Role |
|---|---|---|
| `field` | `#23261a` | App background. Warm deep olive, deliberately not black. |
| `panel` | `#2e3221` | Secondary surfaces, most cards. |
| `raised` | `#3a3f29` | The focused element; the day's session card. |
| `line` | `#4a4f35` | Hairlines and borders. |
| `canvas` | `#d8cdb0` | Primary text. |
| `canvas-dim` | `#a39c82` | Secondary text, labels, eyebrows. |
| `brass` | `#c49a4a` | The single accent: primary actions, today, key numbers. |
| `confirmed` | `#6e8a4e` | `done` status. |
| `signal` | `#a8432e` | `skipped` status, destructive actions, errors. |

Brass is precious: at most one brass element per view, plus status colours where the data demands them. Everything else stays in the olive and canvas range. `#23261a` is also the manifest `background_color`, the `theme_color`, and the iOS status bar colour.

**Type.** Three families, each with one job:
- **Space Grotesk** (`--font-display`) — the wordmark, section headings, button labels, eyebrows. Used with restraint.
- **Inter** (`--font-body`) — all reading text.
- **JetBrains Mono** (`--font-mono`) — every number, so stats and paces read as data.

Root font size is `112.5%` (16px → 18px) so the whole rem-based scale moves together. Uppercase micro-labels go through the `.eyebrow` class (display family, uppercase, `0.16em` tracking, `0.72rem`, `canvas-dim`) — never hand-rolled. Sentence case everywhere else.

**Layout and components.**
- Single column, thumb-reachable, `max-w-md` (~28rem) centred, `px-5 py-8`.
- Cards: `panel` or `raised` background, `line` border, `rounded-md`, generous padding. The day's focused card gets a 2px status-coloured border.
- Status reads through colour plus a short text label, never icons-as-decoration.
- A fixed bottom tab bar (Today / Plan / Dashboard) with safe-area padding; hidden on `/signin`.

**Copy.** British spelling throughout ("prioritise", "metres"), in UI text and in AI-generated copy; every system prompt states it. No em dashes or en dashes in prose, in either: commas, semicolons, or a shorter sentence. Plain verbs, sentence case, no filler. A button says what it does and keeps that word through the flow. Empty states say what to do next. Errors say what happened and how to fix it — never apologise, never go vague. No themed, military, or "drill" vocabulary anywhere in UI text, identifiers, or comments; the app name is the sole exception, and everything around it must read as an ordinary running app.

**Quality floor — every screen, no exceptions.** Layout holds from 360px wide. Keyboard focus is always visible (the standard `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass`). `prefers-reduced-motion` is respected. Contrast holds against the dark field. Animation is optional and quiet; a subtle state transition beats scattered effects.

### 7.6 Operational runbook

**Environment variables.** All secrets live in env vars; `.env.example` is the template and must be updated whenever a variable is added.

| Variable | Used by | Notes |
|---|---|---|
| `AUTH_SECRET` | Auth.js | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Auth.js Google provider | Web OAuth client |
| `MONGODB_URI` | `lib/mongodb.ts` | Throws at import if unset |
| `MONGODB_DB` | `lib/mongodb.ts` | Defaults to `altrotemarr` |
| `ALLOWED_EMAILS` | `lib/allowlist.ts` | Comma-separated, lowercase. Has a hardcoded fallback — see drift item 10. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `DailyReminderToggle` (browser) | Same value as `VAPID_PUBLIC_KEY` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `lib/push.ts` | All three required or `configure()` throws. Subject is coerced to `mailto:`. |
| `ANTHROPIC_API_KEY` | all four AI modules | Read implicitly by `new Anthropic()` |
| `CRON_SECRET` | `/api/cron/daily-notify` | Bearer token; fails closed when unset |
| `NOTIFY_HOUR` | `/api/cron/daily-notify` | Target local Toronto hour, 0-23. Defaults to 7 when unset or unparseable. Must match the UTC hours in `vercel.json`. |

**Indexes.** Declared in `lib/indexes.ts`, applied by `npm run ensure-indexes`. Run it against every environment after a deploy that adds a collection or an index. It reports per-index outcomes and exits non-zero if any failed, so a unique index blocked by pre-existing duplicates is visible rather than silently absent. All five indexes were verified in place against production on 2026-08-24.

**Local setup.** `npm install`; copy `.env.example` to `.env.local` and fill it; Google OAuth redirect URI `http://localhost:3000/api/auth/callback/google`; `npm run ensure-indexes`; `npm run seed`; `npm run dev`.

**Deploy.** Push to GitHub, import in Vercel, add every `.env.local` variable to the project, add the Vercel callback URL to the Google OAuth client, deploy, then run the seed once against the same Atlas database. On a phone: open the URL and Add to Home Screen / Install app.

**Adding a runner.** The established procedure, as performed for Lilo:
1. Write `lib/plan-seed-<name>.ts` exporting `<NAME>_OWNER`, a `Profile`, and a `Seed[]` of run sessions. Reuse `generateStrengthSessions(runDates)` from `lib/plan-seed.ts` rather than authoring strength days by hand.
2. Add a `scripts/seed-<name>.ts` that upserts the profile, ensures the `{ownerEmail, date}` unique index, and inserts sessions with `$setOnInsert` filtered to `date >= todayStr()` — additive and idempotent, so it never clobbers logged history and never touches another runner's data.
3. Add an `npm` script alongside `seed` and `seed-lilo`. Call `ensureIndexes(db)` rather than creating indexes inline.
4. Add the email to `ALLOWED_EMAILS` in every environment.

Never make a new runner's seed destructive. `scripts/seed.ts` uses `deleteMany` and is the legacy exception, scoped to a single hardcoded `OWNER`.

**Verifying a change.** `npx tsc --noEmit` and `npm run lint`. There is no test suite (see section 1). Diagnose production data problems through the app's own endpoints or pasted output, not a direct Atlas connection.

---

## 8. Rules for Future Changes

**Data access**
- All MongoDB queries live in `lib/db.ts`. Never write a query inline in a route, action, component, or script.
- Every `lib/db.ts` function takes `owner: string` first and includes `ownerEmail: owner` in its filter. The only permitted exception is a cron-scoped `listAll*` that regroups by owner immediately.
- Never accept an owner, email, or tenant identifier from a client payload, header, or query string. Derive it from `await auth()`.
- Project `{ _id: 0 }` on every read.
- Use the native `mongodb` driver. Never add Mongoose or any ODM. Never add the Atlas Data API.
- New collections must have their document interface added to `lib/types.ts` before first use, and every index they need must be declared in `lib/indexes.ts`. Never call `createIndex` from a request path or inline in a script.
- Any write that can touch more than one document under the unique `{ownerEmail, date}` index must use the temp-date two-phase transaction pattern of `moveSessions`.

**Auth**
- Every route handler and server action derives the owner through `currentOwner()` from `lib/owner.ts` and returns/reports unauthorized without one. Server components that need only the owner use `requireOwner()`. Never re-implement the idiom locally. The only exception is a machine-triggered cron route, which must be gated by a bearer secret that fails closed when the env var is absent.
- Dev-only endpoints check `NODE_ENV === "production"` and return 404 **before** touching auth or the database.

**Dates**
- Dates are `YYYY-MM-DD` strings compared lexicographically. All calendar math goes through `lib/date.ts`. Do not introduce Date-object timezone arithmetic for calendar logic.
- "Today" is `todayStr()` in `America/Toronto`.

**Mutations and errors**
- New mutations are server actions returning a discriminated union (`{ ok: true, ... } | { ok: false, error }`), not thrown exceptions. Log the real cause with `console.error` and return a message the UI can show.
- New route handlers keep the existing shape: bare resource or `{ ok: true, ... }` on success, `{ error: string }` with an appropriate status on failure. Do not introduce a response envelope for one endpoint only — if you want one, migrate all of them.
- All external input is validated in `lib/validation.ts` (or an equivalent pure validator) before it reaches `lib/db.ts`.
- Server-side re-derivation is mandatory for anything the client proposes: re-derive the expected set, validate against it, and add a restrictive filter on the write itself. Follow `applyRebuild` + `rebuildFutureSessions`.

**AI features**
- A new AI feature goes in its own `lib/<feature>.ts` and follows the established four-part shape: exported `*_MODEL` const, `SYSTEM_PROMPT`, pure `buildXPrompt`, `generateX`, and an owner-scoped idempotent `generateAndStoreX`.
- Every AI output must be cached in a collection with an idempotency key (a date, or a content hash). State the key in a comment. The point is that generation is triggered by render: without a key, every visit to the page fires another call, so the content changes under the reader and the page blocks on work it didn't need. Cost is not the reason — a user-initiated regenerate button is fine and needs no guard.
- A prompt that reads a runner's numbers must also read their standing constraints via `describeConstraints`, and be told that a metric a constraint explains is not a fitness signal. Constraints are per-runner data, never hardcoded in a prompt. A new constraint field joins the same composed block rather than getting its own prompt line.
- An AI surface must say something the screen doesn't already say. If a prompt's data is the same row the UI renders beside it, the output will restate it: compute the comparison, trend, or projection and put that in the prompt instead. Derived figures belong in `lib/stats.ts` as pure functions, never inline in the prompt builder.
- Every system prompt ends with the standard voice clause: plain, warm, coach-like; no hype, no clichés, no emoji; ordinary running language only; never military, drill, or boot-camp vocabulary; no markdown.
- A JSON response is constrained with `output_config.format` (a `json_schema`), not just asked for in the prompt. Schema subset rules: `additionalProperties: false`, a complete `required` list, no item counts or numeric ranges. Keep a defensive parse anyway — a schema doesn't cover refusals or truncation.
- JSON responses are unfenced and parsed defensively. Never assume well-formed output — and never fall back to storing the raw response. A parse that fails, or a `max_tokens` truncation, is a failed call: throw, write nothing, let the caller's error path show a retry. Route every response through `responseText` from `lib/model.ts`.
- `max_tokens` is shared with adaptive thinking. Budget for both, not just the visible answer.
- Model calls have no timeout today. If you add a feature to the cron path, it goes **after** the push send, or you add a timeout.

**UI** — the design system in section 7.5 is binding; these are the enforcement rules.
- Use only the nine palette tokens and three type families defined in 7.5. Never introduce a colour, a font, or a hand-rolled eyebrow style outside them.
- Reads happen in server components; `"use client"` only on interactive leaves.
- Every screen meets the quality floor in 7.5: 360px, visible keyboard focus, reduced motion, contrast. Prefer the `useReducedMotion` hook for new code.
- Every number renders in the mono font.
- Every route with a data fetch has a `loading.tsx` and an empty state.
- Product copy follows the copy rules in 7.5. No themed, military, or "drill" vocabulary anywhere in UI text, identifiers, or comments. The app name is the only exception.
- If a Recharts-facing change needs a colour, add it to `chart-theme.ts` mirroring an existing token — never a fresh hex.

**Non-negotiable scope limits**
- `public/sw.js` stays push-only: `push` and `notificationclick` handlers, no `fetch` handler, no `caches`. Do not add offline caching or background sync.
- Do not add a second cron entry without confirming the plan tier allows it; today's single job exists because Hobby permits one per day.
- Do not introduce a state machine transition for `Session.status` beyond `planned`/`done`/`skipped` without updating section 7.4.

**Process**
- Secrets in env vars only. Never hardcode credentials; never commit `.env.local`. New env vars go in `.env.example` with a comment.
- `npx tsc --noEmit` and `npm run lint` must pass. No `any` without a written reason.
- Never add Claude or AI attribution to commit messages. Never push without being asked.
- Update this file when you change the data model, add a collection, add an endpoint or action, add an integration, or change a business rule. Code that contradicts CONTEXT.md is drift: flag it, don't propagate it.

**Rules the maintainer should decide on (currently unsettled)**
- Whether `PATCH /api/sessions/[date]` and the read API stay as a supported surface or get removed as unused. Right now both paths must be kept in sync by hand.
- Whether to add tests. The pure functions in `lib/stats.ts`, `lib/pace.ts`, `lib/date.ts`, `lib/validation.ts`, and `coerceProposal` are designed for it and are the highest-value targets.
- Whether `Session.type` becomes a union. Six files currently do ad-hoc string comparison against it.

---

## 9. Known Drift / Open Questions

Ordered roughly by how much they'd bite.

1. **Two write paths for the same mutation.** `PATCH /api/sessions/[date]` and `logActual`/`markStatus` both validate and call `updateSession`, but only the actions are used by the UI. The REST route was the original Phase 1 mechanism; the implementation moved to server actions and the route was left in place. Decide whether it is a supported surface or dead weight.

2. **Dead or unused code:** `VALID_STATUS` exported but only used internally, `profile.vo2` and `profile.baseline` (displayed, never computed with), `getNextSession` used only by the home page, and orphaned `sessionExplanations` rows whenever a title or plannedKm is edited (including by every rebuild).

3. **`ALLOWED_EMAILS` has a hardcoded production fallback.** `lib/allowlist.ts` defaults to `"nestor.daza@gmail.com,lilo.ayala@gmail.com"` when the env var is unset. Convenient locally; means a misconfigured production deploy still admits two accounts rather than failing closed. Deliberate or not, it should be a decision.

4. **`RECAP_MODEL`, `SUMMARY_MODEL`, `EXPLAIN_MODEL`, `REBUILD_MODEL` are four separate constants all set to `"claude-opus-4-8"`.** Independent tuning is the plausible intent, but a model bump means four edits with no shared default.

5. **Two locales for the same formatting intent**: `formatNiceDate` (`en-US`) and `formatDayShort` (`en-GB`). Both render short weekday + day + month; they differ only in ordering.

6. **Reduced motion is implemented four ways** (hook, Tailwind `motion-reduce:`, raw `matchMedia`, global CSS `@media`). All correct, none canonical.

7. **No timeouts on Anthropic calls — accepted, not fixed.** The SDK defaults to a 10-minute timeout with 2 retries, so the platform's `maxDuration` is the real ceiling. The cron's budget was raised from 60s to 300s, which removes the squeeze at the current two runners. Deliberately left without per-call timeouts: the platform already bounds the function, a slow call costs one day's progress note (the push is sent first, and notes are idempotent per date so the next morning writes a fresh one), and a timeout tight enough to matter would start killing adaptive-thinking calls that would otherwise succeed. Revisit when a third runner is added or if a `maxDuration` kill shows up in the logs.

8. **`SessionDetail.tsx` and `StrengthDetail.tsx` duplicate `inputClass`, `Field`, and `Row`** character-for-character, and both use native `window.confirm` for destructive confirmation inside otherwise custom-designed UI.
