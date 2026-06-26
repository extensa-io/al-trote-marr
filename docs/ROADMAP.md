# Roadmap

Build one phase per session. Each phase ends in a reviewable, working state. Tick the boxes as you go.

## Phase 0 — Foundation (done)

Auth with allowlist, native-driver Atlas layer, seed, API, and a Today home screen that reads the seeded plan.

- [x] Google sign-in restricted to `ALLOWED_EMAILS`
- [x] `sessions` and `profile` collections, owner-scoped
- [x] Seed loads 50 sessions and the profile
- [x] `GET/PATCH` session and `GET` profile endpoints
- [x] Home shows today's session, countdown, logged count, and an empty state with no plan
- [x] Installable PWA, online-only

## Phase 1 — Logging loop

Make the daily interaction real.

Scope: on Today, add Done and Skipped actions and a quick log form for km, average HR, duration, and notes. Wire optimistic updates against `PATCH /api/sessions/[date]`. Compute and show pace from the logged values. Reflect status with the `confirmed` and `signal` colours.

Acceptance:
- [x] Marking Done or Skipped persists and updates the UI without a full reload
- [x] The quick log saves `actual` and the card shows pace as `m:ss`
- [x] Re-opening a logged day shows the saved values and allows edits
- [x] A rest day and a pre-start day both render sensible states

## Phase 2 — Plan / calendar

Replace the spreadsheet grid with a phone-friendly plan.

Scope: a `/plan` route listing all sessions grouped by week and phase, each row showing status. Tap a row to view and log or edit. Add a jump-to-current-week control and a phase filter. Add a bottom tab bar for Today, Plan, and Dashboard.

Acceptance:
- [x] All 17 weeks render grouped by week with phase bands
- [x] Each row reflects status colour and planned km
- [x] Tapping a row opens the same log used on Today
- [x] Current week is easy to reach; phase filter works

## Phase 3 — Dashboard

The richer stats view.

Scope: implement every stat in `docs/ARCHITECTURE.md`. Add Recharts visuals for weekly planned-versus-actual volume, cumulative km versus plan, and long-run progression. Surface countdown, current phase with progress, overall and 4-week adherence, streak, zone-adherence, and the aerobic-efficiency trend. Add the optional estimated finish last, clearly labelled.

Acceptance:
- [x] Each stat matches its formula and handles the no-data case
- [x] Charts render and stay readable at 360px wide
- [x] zone-adherence and aerobic-efficiency populate from logged easy runs
- [x] Nothing throws before any runs are logged

## Phase 7 — Post-run recap

Turn a freshly logged run into an AI recap that replaces the daily progress note.

Scope: when a run is marked done, generate a recap of it (short narrative plus `insights` and `suggestions`) and show it in the home slot where the daily note lives, keyed by date in `dailySummaries` with `kind: "recap"`. The log saves instantly; the card shows a "Writing recap…" placeholder, then fills in. Editing the run regenerates it; the next morning's cron note takes the slot back. Every logged run qualifies (not just races); strength and skipped sessions don't.

Acceptance:
- [x] Logging a run shows a placeholder, then an AI recap with Insights and Suggestions in the daily-note slot
- [x] The recap is owner-scoped and grounds its claims in the run's logged numbers and note
- [x] Editing the logged run regenerates the recap (`runUpdatedAt` staleness); re-renders don't re-bill (idempotent)
- [x] The next morning's daily note replaces the recap; `replaceOne` leaves no stale recap fields
- [x] Placeholder respects reduced motion; card holds at 360px and the retry control shows visible focus

## Phase 6 — Rescheduling

Move runs when life gets in the way (travel weeks, etc.).

Scope: reschedule a single run to any date from its card, with a swap offer when the target holds another movable run and a block when it holds a strength or done session. Add a "shift this week by ±1 day" control on the plan that moves all of a week's movable runs at once. Runs only; `week` preserved, `day` recomputed.

Acceptance:
- [x] A planned/skipped run can be moved to an empty date; `day` updates, `week` and km unchanged
- [x] Moving onto another planned/skipped session (run or strength) offers a swap; runs take priority, only a done session can't be displaced
- [x] Week-shift slides every planned/skipped session in the week (runs and strength) together; blocks only on a stationary session outside the shift
- [x] Multi-doc moves are atomic (temp-date transaction), no duplicate-key errors

## Phase 5 — Logging detail & weight

Richer prescriptions on the card and bodyweight tracking.

Scope: derive and show target HR (bpm) from each run's zone via `profile.zones`. Explain prescribed strides inline. Capture optional bodyweight (kg) inside the run and strength log forms. Make LOG the single primary action on the day's card, with Skip / Mark done / Mark planned in a three-dot menu shared by runs and strength. Give strength its own log form (time spent, weight, notes). Add a weight-trend chart to the dashboard.

Acceptance:
- [x] Run header shows `TYPE · ZONE · min–max bpm`, derived from the runner's zones
- [x] A `+ N strides` title renders an inline explainer
- [x] Weight (kg) saves from both run and strength logs and shows on the card
- [x] LOG is the primary button; Skip / Mark done / Mark planned live in a three-dot menu
- [x] Strength logs time spent and notes through the same flow, no extra card button
- [x] Dashboard weight trend renders and handles the no-data case

## Phase 4 — Polish

Scope: loading and error states across screens, a `/settings` page with profile and sign out, an install hint, and an accessibility and responsive pass against the quality floor in `docs/DESIGN.md`.

Acceptance:
- [x] Loading and error states on every data fetch
- [x] Keyboard focus visible, reduced motion respected
- [x] Lighthouse PWA installability passes
- [x] No layout breaks from 360px upward

## Phase 8 — Strava import

Fill run logs from synced Strava activities instead of retyping distance, duration, and average HR.

Scope: OAuth 2.0 connect/disconnect in Settings (`activity:read_all` scope). Owner-scoped `stravaConnections` and `stravaActivities` collections in `lib/db.ts`. On connect, backfill the last 14 days of running activities (Run, TrailRun, VirtualRun). Pull-on-demand when the log form opens; optional daily cron to refresh tokens and sync recent activities. Map Strava summaries to `actual` (`distance` → km, `moving_time` → durationMin, `average_heartrate` → avgHr); store provenance on `actual.stravaActivityId`. On the run log form, **Import from Strava** lists unmatched activities for that session's date; tapping one pre-fills the form — the user still taps Save. Logged cards show a dim **From Strava** line when imported. Strength sessions have no Strava UI. Encrypt refresh tokens at rest; all routes auth-checked except none needed for v1 (no webhook). Document collections and mapping in `docs/ARCHITECTURE.md`. Optional `STRAVA_MOCK=1` for local dev without real OAuth.

Sub-phases (one session each is fine):

**S1 — Connect:** `lib/strava/oauth.ts`, `/api/strava/connect`, `/api/strava/callback`, `/api/strava/disconnect`, `/api/strava/status`, Settings toggle, token refresh, mock mode.

**S2 — Ingest:** activity pull + cache, backfill on connect, `GET /api/strava/activities?date=`, optional `/api/cron/strava-sync`.

**S3 — Import UI:** picker on `SessionDetail` log form, server action to link activity on save, provenance on the card.

**S4 — Polish:** Today banner when a planned run has an unmatched activity for today; empty and error states; 360px and focus pass.

Acceptance:
- [ ] A runner can connect and disconnect Strava from Settings; connection is owner-scoped and survives refresh
- [ ] Access tokens refresh automatically; expired or revoked tokens prompt reconnect, not a silent failure
- [ ] Running activities from the last 14 days appear in Mongo after connect (or mock seed when `STRAVA_MOCK=1`)
- [ ] Import from Strava on a run log form lists only unmatched activities for that session's date, most recent first
- [ ] Selecting an activity pre-fills km, duration, and avg HR; Save marks the session done and sets `actual.stravaActivityId`
- [ ] An activity cannot be linked to two sessions; manual edits to imported fields clear provenance
- [ ] The logged card shows **From Strava** when provenance is set; dashboard stats reflect imported values
- [ ] Strength sessions and disconnected users see no Strava UI; layout holds at 360px
