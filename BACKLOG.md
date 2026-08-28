# Backlog

Forward-looking scope that has **no code yet**. `CONTEXT.md` describes what exists and is binding; this file is a wish list and is not.

Anything built from here must conform to `CONTEXT.md` and must be written back into it (data model, endpoints, integrations, rules) as part of being done. Delete the item from this file when it ships.

Historical build phases 0-7 and 9 are complete; their record is the git history, not a checklist.

---

## Strava import

Fill run logs from synced Strava activities instead of retyping distance, duration, and average HR. This is the largest unbuilt feature and the reason `actual` was designed to be auto-fillable.

**Shape:** OAuth 2.0 connect/disconnect in Settings (`activity:read_all`). Two new owner-scoped collections, `stravaConnections` and `stravaActivities`, accessed only through `lib/db.ts`. Backfill the last 14 days of running activities (Run, TrailRun, VirtualRun) on connect. Pull on demand when a log form opens; optionally refresh tokens and recent activities from a cron.

**Mapping:** `distance` → `actual.km`, `moving_time` → `actual.durationMin`, `average_heartrate` → `actual.avgHr`. Provenance on a new `actual.stravaActivityId`.

**UX:** an **Import from Strava** control on the run log form listing unmatched activities for that session's date, most recent first. Tapping one pre-fills the form; the user still taps Save. A logged card shows a dim **From Strava** line when provenance is set. Strength sessions get no Strava UI.

**Constraints:** encrypt refresh tokens at rest. An activity cannot be linked to two sessions. Manual edits to imported fields clear provenance. Support `STRAVA_MOCK=1` for local development without real OAuth.

**Suggested sub-phases:**
1. *Connect* — `lib/strava/oauth.ts`, connect/callback/disconnect/status routes, Settings toggle, token refresh, mock mode.
2. *Ingest* — activity pull and cache, backfill on connect, `GET /api/strava/activities?date=`, optional `/api/cron/strava-sync`.
3. *Import UI* — picker on the log form, server action to link on save, provenance on the card.
4. *Polish* — Today banner when a planned run has an unmatched activity, empty and error states, 360px and focus pass.

**Done means:** connect/disconnect is owner-scoped and survives refresh; tokens refresh automatically and a revoked token prompts reconnect rather than failing silently; the picker shows only unmatched activities for that date; selecting one pre-fills km, duration, and avg HR and Save sets `actual.stravaActivityId`; dashboard stats reflect imported values; disconnected users see no Strava UI.

**Note:** this would be the first integration with a real retry/refresh story. Section 7.3 of `CONTEXT.md` will need a row, and the token-refresh failure mode needs a decision before code is written.

---

## Verification owed on the AI plan rebuild

The feature ships (`lib/rebuild.ts`, `app/actions/rebuild.ts`, `RebuildPlanControls`), but these behaviours were never formally checked against a real plan:

- The rebuilt long run ramps sensibly from the runner's actual longest completed run — no single jump far past recent fitness — and peaks before a taper. This is enforced only by the system prompt; the validator checks the envelope, not the physiology.
- A malformed or stale proposal is rejected server-side with nothing written.
- The control holds at 360px, respects reduced motion, and shows visible focus.

Worth one deliberate pass with a live plan before trusting it to reshape real training.

---

## Open decisions carried from CONTEXT.md section 9

These are judgement calls, not bugs. Listed here so they don't get lost in the drift list:

- Decide whether `PATCH /api/sessions/[date]` and the read API are a supported surface or dead weight (drift 1).
- Add tests for the pure modules: `lib/stats.ts`, `lib/pace.ts`, `lib/date.ts`, `lib/validation.ts`, and `coerceProposal`. They were factored to be testable and never were.

---

## Dependency hygiene, deferred out of the driver 7 bump

Deliberately left alone when `mongodb` went to `^7.6` on 2026-08-28, to keep that change reviewable. None is caused by the driver bump; all predate it.

- **`npm audit` reports 9 vulnerabilities** (1 moderate, 6 high, 2 critical). The critical one is `@auth/core <=0.41.2`, reached through `next-auth@5.0.0-beta.31`, and needs `--force`, so it is a next-auth version decision rather than a patch. The high ones (`brace-expansion`, `js-yaml`, `nanoid`, `postcss`, `sharp`, `next`) claim a non-breaking `npm audit fix`. Run that as its own change and re-verify the build.
- **`recharts@2.15.4` is deprecated**; the 2.x branch is no longer active and v3 is a migration, not a bump. Charts are the whole dashboard, so this needs a real look rather than a version change.
- **Driver 7 has no runtime proof yet.** There are no tests, so the only evidence so far is a clean install, a passing typecheck against the v7 types, and a successful build. The read and write paths in `lib/db.ts` still need one deliberate pass against a live database, in particular the `moveSessions` transaction and the `rebuildFutureSessions` `bulkWrite`.
