# Al Trote Marr!

A personal, multi-tenant running training tracker. Next.js 16 on Vercel, MongoDB Atlas via the native driver, Google sign-in restricted to an allowlist, installable as a PWA.

Today's session and one-tap logging, a week-by-week plan, a stats dashboard, AI workout explanations and run recaps, an AI plan rebuild, and an opt-in daily push reminder.

## Working on this repo

**`CONTEXT.md` is the authoritative reference** — architecture, data model, business rules, conventions, design system, and the rules every change must follow. Read it before writing code. `CLAUDE.md` is the short operating brief for agents; `BACKLOG.md` holds scope that isn't built yet.

## Stack

- Next.js 16 (App Router, TypeScript)
- MongoDB Atlas, native `mongodb` driver, cached client for serverless
- Auth.js v5 (Google, allowlist gate, JWT sessions)
- Tailwind CSS v4 (tokens in `app/globals.css`)
- Recharts (for the dashboard)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in. `npx auth secret` writes `AUTH_SECRET`. Create a Google OAuth client (Web); local redirect URI `http://localhost:3000/api/auth/callback/google`.
3. Seed your plan: `npm run seed` (Node 22+).
4. `npm run dev`, sign in with `nestor.daza@gmail.com`.

## Deploy to Vercel

1. Push to GitHub, import in Vercel.
2. Add every `.env.local` variable to the Vercel project.
3. Add the Vercel callback URL to the Google OAuth client.
4. Deploy, then run the seed once against the same Atlas database.
5. On your phone: open the URL, then Add to Home Screen (Safari) or Install app (Chrome).

Online-only by design. It still installs to the home screen and runs standalone.
