# Al Trote Marr! — Claude Code working notes

Personal multi-tenant running training tracker. You are continuing the build from the foundation already in this repo.

**Read `CONTEXT.md` at the project root before writing any code.** It is the single authoritative reference for this app: architecture, data model, business rules, conventions, the design system, and the rules every change must follow. This file is the short brief; `CONTEXT.md` is the full rulebook, and where the two diverge, `CONTEXT.md` wins. Unbuilt scope lives in `BACKLOG.md`.

Code that contradicts `CONTEXT.md` is drift: flag it, don't copy it.

## Stack
- Next.js 16 (App Router, TypeScript, strict)
- MongoDB Atlas via the native `mongodb` driver
- Auth.js v5, Google provider, allowlist gate, JWT sessions
- Tailwind CSS v4 (tokens in `app/globals.css`)
- Recharts for dashboard charts

## Hard rules, do not violate
- MongoDB: native driver ONLY. Never Mongoose, never any ODM. Never add the Atlas Data API.
- Multi-tenant: every read and write is scoped by `ownerEmail` taken from the authenticated session. Never accept an owner value from the client.
- Every route handler and server action checks `await auth()` and returns 401 when there is no session email.
- Secrets live in env vars only. Never hardcode credentials. Never commit `.env.local`.
- Online-only. Do not add offline caching or background sync. The only service worker permitted is `public/sw.js`, which is push-only (handles `push` and `notificationclick`, no `fetch` handler, no `caches`). Do not extend it to cache or serve content.
- Dates are `YYYY-MM-DD` strings, compared in `America/Toronto` via `lib/date.ts`. Do not introduce Date-object timezone math for calendar logic.
- All new data access goes through `lib/db.ts`. Do not write Mongo queries inline in routes or components.

## Design rules
Full design system in `CONTEXT.md` section 7.5.
- Use only the palette and type tokens in `app/globals.css`. Brass `#c49a4a` is the single accent.
- Clean, minimal, mobile-first. Plain product copy. No themed, military, or "drill" vocabulary anywhere in UI text, identifiers, or comments. The app name stays; everything around it reads as an ordinary running app.
- Quality floor on every screen: visible keyboard focus, `prefers-reduced-motion` respected, layout holds down to 360px wide.

## Commands
- `npm run dev` — local dev
- `npm run seed` — load the seed plan into Atlas (Node 22+)
- `npm run build` — production build
- `npm run lint`

## File map
- `auth.ts` — Auth.js config and allowlist gate
- `lib/allowlist.ts` — allowed emails from `ALLOWED_EMAILS`
- `lib/mongodb.ts` — cached native client
- `lib/db.ts` — owner-scoped data access (extend here)
- `lib/types.ts` — `Session`, `Profile`, `Zone`
- `lib/plan-seed.ts` — seed data (Néstor's half plan)
- `lib/date.ts` — `todayStr()`
- `app/api/**` — route handlers, all auth-checked
- `app/page.tsx` — home (Today)
- `app/signin/page.tsx` — sign in
- `CONTEXT.md` — the authoritative rulebook (read this first)
- `BACKLOG.md` — unbuilt scope

## Definition of done for any change
- TypeScript checks and lint pass. No `any` without a written reason.
- New data access is in `lib/db.ts` and owner-scoped.
- New UI uses palette tokens and meets the quality floor in `CONTEXT.md` 7.5.
- The change satisfies the rules in `CONTEXT.md` section 8.
- `CONTEXT.md` is updated when the data model, an endpoint or action, an integration, or a business rule changes.
